<?php

namespace App\Services;

use App\Config\Database;
use App\Config\Roles;
use PDO;
use PDOException;

class MedicationService
{
    private PDO $db;
    private AuditService $auditService;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    /**
     * Prescribe medication (create prescription)
     */
    public function prescribeMedication(array $data, string $providerId, string $userId): array
    {
        // Redirect to batch if data is a list of medications
        if (isset($data['items']) && is_array($data['items'])) {
            return $this->batchPrescribeMedications($data['items'], $data['patient_id'] ?? null, $data['encounter_id'] ?? null, $providerId, $userId);
        }

        // Accept batch_id from caller (batch context) or null for single prescriptions
        $batchId = $data['batch_id'] ?? null;

        // Validate required fields
        $required = ['patient_id', 'medication_name', 'dosage', 'frequency', 'route'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required");
            }
        }

        try {
            $medicationId = \Ramsey\Uuid\Uuid::uuid4()->toString();
            $stmt = $this->db->prepare("
                INSERT INTO medications (
                    id, patient_id, encounter_id, provider_id, prescribed_by,
                    medication_name, inventory_item_id, batch_id, rxnorm_code, dosage, quantity, frequency, route,
                    instructions, start_date, end_date, refills_authorized, refills_remaining,
                    prescription_status, billing_status, reason, is_active
                )
                VALUES (
                    :id, :patient_id, :encounter_id, :provider_id, :prescribed_by,
                    :medication_name, :inventory_item_id, :batch_id, :rxnorm_code, :dosage, :quantity, :frequency, :route,
                    :instructions, :start_date, :end_date, :refills_authorized, :refills_remaining,
                    'pending', 'pending_invoice', :reason, TRUE
                )
            ");

            $refills = isset($data['refills_authorized']) ? (int)$data['refills_authorized'] : 0;

            $stmt->execute([
                'id' => $medicationId,
                'patient_id' => $data['patient_id'],
                'encounter_id' => $data['encounter_id'] ?? null,
                'provider_id' => $providerId,
                'prescribed_by' => $providerId,
                'medication_name' => $data['medication_name'],
                'inventory_item_id' => $data['inventory_item_id'] ?? null,
                'batch_id' => $batchId,
                'rxnorm_code' => $data['rxnorm_code'] ?? null,
                'dosage' => $data['dosage'],
                'quantity' => $data['quantity'] ?? 1,
                'frequency' => $data['frequency'],
                'route' => $data['route'],
                'instructions' => $data['instructions'] ?? null,
                'start_date' => $data['start_date'] ?? date('Y-m-d'),
                'end_date' => $data['end_date'] ?? null,
                'refills_authorized' => $refills,
                'refills_remaining' => $refills,
                'reason' => $data['reason'] ?? null
            ]);

            $medication = $this->getMedicationById($medicationId);

            // Audit log
            $this->auditService->log(
                $userId,
                $data['patient_id'],
                'CREATE',
                'medication',
                $medication['id'],
                ['medication_name' => $data['medication_name']],
                201
            );

            return $medication;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to prescribe medication: " . $e->getMessage());
        }
    }

    /**
     * Batch prescribe medications
     */
    public function batchPrescribeMedications(array $items, ?string $patientId, ?string $encounterId, string $providerId, string $userId): array
    {
        try {
            $this->db->beginTransaction();
            $results = [];
            // Generate a shared batch_id for all items in this batch
            $batchId = \Ramsey\Uuid\Uuid::uuid4()->toString();

            foreach ($items as $item) {
                // Ensure patient_id and encounter_id are present from batch context if missing in item
                if (empty($item['patient_id'])) $item['patient_id'] = $patientId;
                if (empty($item['encounter_id'])) $item['encounter_id'] = $encounterId;
                $item['batch_id'] = $batchId;

                $results[] = $this->prescribeMedication($item, $providerId, $userId);
            }

            $this->db->commit();
            return $results;
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get medication by ID
     */
    public function getMedicationById(string $medicationId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last,
                       u.username as dispensed_by_username
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                LEFT JOIN users u ON m.dispensed_by = u.id
                WHERE m.id = :id AND m.deleted_at IS NULL
            ");

            $stmt->execute(['id' => $medicationId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch medication: " . $e->getMessage());
        }
    }

    /**
     * Get patient medications
     */
    public function getPatientMedications(string $patientId, bool $activeOnly = false): array
    {
        try {
            $query = "
                SELECT m.*, 
                       pr.first_name as provider_first, pr.last_name as provider_last,
                       u.username as dispensed_by_username
                FROM medications m
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                LEFT JOIN users u ON m.dispensed_by = u.id
                WHERE m.patient_id = :patient_id AND m.deleted_at IS NULL
            ";

            if ($activeOnly) {
                $query .= " AND m.is_active = TRUE AND m.prescription_status IN ('active', 'dispensed')";
            }

            $query .= " ORDER BY m.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute(['patient_id' => $patientId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch medications: " . $e->getMessage());
        }
    }

    /**
     * Get pending prescriptions (ready for dispensing)
     */
    public function getPendingPrescriptions(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                WHERE m.prescription_status = 'pending'
                  AND m.billing_status IN ('paid', 'approved')
                  AND m.is_active = TRUE
                  AND m.deleted_at IS NULL
                ORDER BY m.created_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch pending prescriptions: " . $e->getMessage());
        }
    }

    /**
     * Get prescriptions awaiting payment (invoiced but not paid)
     */
    public function getAwaitingPaymentPrescriptions(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                WHERE m.prescription_status = 'pending'
                  AND m.billing_status = 'invoiced'
                  AND m.is_active = TRUE
                  AND m.deleted_at IS NULL
                ORDER BY m.created_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch awaiting payment prescriptions: " . $e->getMessage());
        }
    }

    /**
     * Get dispensed medications (history)
     */
    public function getDispensedMedications(int $limit = 50): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last,
                       u.username as dispensed_by_username
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                LEFT JOIN users u ON m.dispensed_by = u.id
                WHERE m.prescription_status = 'dispensed'
                  AND m.deleted_at IS NULL
                ORDER BY m.dispensed_at DESC
                LIMIT :limit
            ");

            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch dispensed medications: " . $e->getMessage());
        }
    }

    /**
     * Dispense medication (pharmacist action)
     */
    public function dispenseMedication(string $medicationId, string $userId): array
    {
        $medication = $this->getMedicationById($medicationId);
        
        if (!$medication) {
            throw new \InvalidArgumentException("Medication not found");
        }

        if ($medication['prescription_status'] !== 'pending' && $medication['prescription_status'] !== 'active') {
            throw new \InvalidArgumentException("Medication cannot be dispensed. Current status: {$medication['prescription_status']}");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE medications 
                SET prescription_status = 'dispensed',
                    dispensed_by = :user_id,
                    dispensed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $medicationId,
                'user_id' => $userId
            ]);

            // Deduct from inventory if linked
            if (!empty($medication['inventory_item_id'])) {
                $item_id = $medication['inventory_item_id'];
                $qty_to_deduct = (int)($medication['quantity'] ?? 1);

                // Update inventory quantity
                $invStmt = $this->db->prepare("
                    UPDATE inventory 
                    SET quantity = quantity - :deduct, 
                        updated_at = NOW() 
                    WHERE id = :item_id AND deleted_at IS NULL
                ");
                $invStmt->execute([
                    'deduct' => $qty_to_deduct,
                    'item_id' => $item_id
                ]);

                // Log inventory change
                $this->auditService->log(
                    $userId,
                    $medication['patient_id'],
                    'UPDATE',
                    'inventory',
                    $item_id,
                    ['action' => 'DISPENSE_DEDUCTION', 'deducted' => $qty_to_deduct],
                    200
                );
            }

            // Audit log for dispensing
            $this->auditService->log(
                $userId,
                $medication['patient_id'],
                'DISPENSE',
                'medication',
                $medicationId,
                ['medication_name' => $medication['medication_name']],
                200
            );

            return $this->getMedicationById($medicationId);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to dispense medication: " . $e->getMessage());
        }
    }

    /**
     * Process refill
     */
    public function processRefill(string $medicationId, string $userId): array
    {
        $medication = $this->getMedicationById($medicationId);
        
        if (!$medication) {
            throw new \InvalidArgumentException("Medication not found");
        }

        if ($medication['refills_remaining'] <= 0) {
            throw new \InvalidArgumentException("No refills remaining for this medication");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE medications 
                SET refills_remaining = refills_remaining - 1,
                    prescription_status = 'dispensed',
                    dispensed_by = :user_id,
                    dispensed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $medicationId,
                'user_id' => $userId
            ]);

            // Audit log
            $this->auditService->log(
                $userId,
                $medication['patient_id'],
                'REFILL',
                'medication',
                $medicationId,
                [
                    'medication_name' => $medication['medication_name'],
                    'refills_remaining' => $medication['refills_remaining'] - 1
                ],
                200
            );

            return $this->getMedicationById($medicationId);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to process refill: " . $e->getMessage());
        }
    }

    /**
     * Discontinue medication
     */
    public function discontinueMedication(string $medicationId, string $reason, string $userId): bool
    {
        $medication = $this->getMedicationById($medicationId);
        
        if (!$medication) {
            throw new \InvalidArgumentException("Medication not found");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE medications 
                SET prescription_status = 'discontinued',
                    is_active = FALSE,
                    discontinuation_reason = :reason,
                    end_date = CURDATE(),
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $medicationId,
                'reason' => $reason
            ]);

            // Audit log
            $this->auditService->log(
                $userId,
                $medication['patient_id'],
                'DISCONTINUE',
                'medication',
                $medicationId,
                [
                    'medication_name' => $medication['medication_name'],
                    'reason' => $reason
                ],
                200
            );

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to discontinue medication: " . $e->getMessage());
        }
    }

    /**
     * Get medications pending billing verification
     */
    public function getPendingBillingMedications(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                WHERE m.billing_status IN ('pending_invoice', 'invoiced')
                  AND m.deleted_at IS NULL
                ORDER BY m.created_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch pending billing medications: " . $e->getMessage());
        }
    }

    /**
     * Verify medication billing (approve or reject)
     */
    public function verifyMedicationBilling(string $medicationId, string $billingStatus, string $userId, ?string $notes = null): bool
    {
        $validStatuses = ['approved', 'rejected'];
        if (!in_array($billingStatus, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid billing status: {$billingStatus}");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE medications 
                SET billing_status = :billing_status,
                    billing_verified_by = :user_id,
                    billing_verified_at = NOW(),
                    billing_notes = :notes,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $medicationId,
                'billing_status' => $billingStatus,
                'user_id' => $userId,
                'notes' => $notes
            ]);

            // Audit log
            $medication = $this->getMedicationById($medicationId);
            if ($medication) {
                $this->auditService->log(
                    $userId,
                    $medication['patient_id'] ?? null,
                    'BILLING_VERIFY',
                    'medication',
                    $medicationId,
                    ['billing_status' => $billingStatus],
                    200
                );
            }

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to verify medication billing: " . $e->getMessage());
        }
    }

    /**
     * Get prescriptions by patient ID (for pharmacist search)
     */
    public function getPrescriptionsByPatientId(string $patientId): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                WHERE (m.patient_id = :pid
                   OR p.mrn = :pmrn
                   OR p.first_name LIKE :sfname
                   OR p.last_name LIKE :slname
                   OR CONCAT(p.first_name, ' ', p.last_name) LIKE :sfull)
                  AND m.prescription_status IN ('pending', 'dispensed')
                  AND m.billing_status = 'pending_invoice'
                  AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC
            ");
            $search = "%{$patientId}%";
            $stmt->execute([
                'pid' => $patientId,
                'pmrn' => $patientId,
                'sfname' => $search,
                'slname' => $search,
                'sfull' => $search
            ]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch patient prescriptions: " . $e->getMessage());
        }
    }

    /**
     * Mark medications as invoiced
     */
    public function markAsInvoiced(array $medicationIds, string $userId): bool
    {
        if (empty($medicationIds)) return true;

        try {
            $placeholders = implode(',', array_fill(0, count($medicationIds), '?'));
            $stmt = $this->db->prepare("
                UPDATE medications 
                SET billing_status = 'invoiced',
                    updated_at = NOW()
                WHERE id IN ($placeholders)
            ");
            return $stmt->execute($medicationIds);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to mark medications as invoiced: " . $e->getMessage());
        }
    }

    /**
     * Get medications pending invoicing across all patients
     */
    public function getInvoicingQueue(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT m.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM medications m
                JOIN patients p ON m.patient_id = p.id
                LEFT JOIN providers pr ON m.prescribed_by = pr.id
                WHERE m.billing_status = 'pending_invoice'
                  AND m.deleted_at IS NULL
                ORDER BY m.created_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch invoicing queue: " . $e->getMessage());
        }
    }
}
