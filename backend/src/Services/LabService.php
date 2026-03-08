<?php

namespace App\Services;

use App\Config\Database;
use App\Config\Roles;
use PDO;
use PDOException;

class LabService
{
    private PDO $db;
    private AuditService $auditService;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    /**
     * Create a lab order
     */
    public function createLabOrder(array $data, ?string $providerId, string $userId): array
    {
        // Redirect to batch if data contains items array
        if (isset($data['items']) && is_array($data['items'])) {
            return $this->batchCreateLabOrders($data['items'], $data['patient_id'] ?? null, $data['encounter_id'] ?? null, $providerId, $userId);
        }

        // Accept batch_id from caller (batch context) or null for single orders
        $batchId = $data['batch_id'] ?? null;

        // Validate required fields
        $required = ['patient_id', 'test_name'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required");
            }
        }

        try {
            $orderId = \Ramsey\Uuid\Uuid::uuid4()->toString();
            $stmt = $this->db->prepare("
                INSERT INTO lab_orders (
                    id, patient_id, encounter_id, provider_id, test_name, test_code,
                    test_category, batch_id, priority, specimen_type, billing_status, notes, ordered_at
                )
                VALUES (
                    :id, :patient_id, :encounter_id, :provider_id, :test_name, :test_code,
                    :test_category, :batch_id, :priority, :specimen_type, 'pending_invoice', :notes, NOW()
                )
            ");

            $stmt->execute([
                'id' => $orderId,
                'patient_id' => $data['patient_id'],
                'encounter_id' => $data['encounter_id'] ?? null,
                'provider_id' => $providerId,
                'test_name' => $data['test_name'],
                'test_code' => $data['test_code'] ?? null,
                'test_category' => $data['test_category'] ?? null,
                'batch_id' => $batchId,
                'priority' => $data['priority'] ?? 'routine',
                'specimen_type' => $data['specimen_type'] ?? null,
                'notes' => $data['notes'] ?? null
            ]);

            $order = $this->getLabOrderById($orderId);

            // Audit log
            $this->auditService->log(
                $userId,
                $data['patient_id'],
                'CREATE',
                'lab_order',
                $order['id'],
                ['test_name' => $data['test_name']],
                201
            );

            return $order;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to create lab order: " . $e->getMessage());
        }
    }

    /**
     * Batch create lab orders
     */
    public function batchCreateLabOrders(array $items, ?string $patientId, ?string $encounterId, ?string $providerId, string $userId): array
    {
        try {
            $this->db->beginTransaction();
            $results = [];
            $batchId = \Ramsey\Uuid\Uuid::uuid4()->toString();

            foreach ($items as $item) {
                if (empty($item['patient_id'])) $item['patient_id'] = $patientId;
                if (empty($item['encounter_id'])) $item['encounter_id'] = $encounterId;
                $item['batch_id'] = $batchId;

                $results[] = $this->createLabOrder($item, $providerId, $userId);
            }

            $this->db->commit();
            return $results;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Get lab order by ID
     */
    public function getLabOrderById(string $orderId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE lo.id = :id AND lo.deleted_at IS NULL
            ");

            $stmt->execute(['id' => $orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($order) {
                // Get associated results
                $order['results'] = $this->getLabResultsByOrderId($orderId);
            }

            return $order ?: null;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch lab order: " . $e->getMessage());
        }
    }

    /**
     * Get lab orders for a patient
     */
    public function getPatientLabOrders(string $patientId): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       pr.first_name as provider_first, pr.last_name as provider_last,
                       COUNT(lr.id) as result_count
                FROM lab_orders lo
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                LEFT JOIN lab_results lr ON lo.id = lr.lab_order_id
                WHERE lo.patient_id = :patient_id AND lo.deleted_at IS NULL
                GROUP BY lo.id
                ORDER BY lo.ordered_at DESC
            ");

            $stmt->execute(['patient_id' => $patientId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch lab orders: " . $e->getMessage());
        }
    }

    /**
     * Get pending lab orders (for lab attendants)
     */
    public function getPendingLabOrders(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE lo.status IN ('ordered', 'collected', 'in_progress')
                  AND lo.billing_status IN ('pending_invoice', 'invoiced', 'approved', 'paid')
                  AND lo.deleted_at IS NULL
                ORDER BY 
                    FIELD(lo.priority, 'stat', 'urgent', 'routine'),
                    lo.ordered_at ASC
            ");

            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $results;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch pending orders: " . $e->getMessage());
        }
    }

    /**
     * Get completed lab orders (for history view)
     */
    public function getCompletedLabOrders(int $limit = 50): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE lo.status = 'completed'
                  AND lo.deleted_at IS NULL
                ORDER BY lo.completed_at DESC
                LIMIT :limit
            ");

            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch completed orders: " . $e->getMessage());
        }
    }

    /**
     * Update lab order status
     */
    public function updateLabOrderStatus(string $orderId, string $status, string $userId): bool
    {
        $validStatuses = ['ordered', 'collected', 'in_progress', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: {$status}");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE lab_orders 
                SET status = :status,
                    collected_at = CASE WHEN :status_collected = 'collected' THEN NOW() ELSE collected_at END,
                    completed_at = CASE WHEN :status_completed = 'completed' THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $orderId,
                'status' => $status,
                'status_collected' => $status,
                'status_completed' => $status
            ]);

            // Audit log
            $order = $this->getLabOrderById($orderId);
            if ($order) {
                $this->auditService->log(
                    $userId,
                    $order['patient_id'] ?? null,
                    'UPDATE',
                    'lab_order',
                    $orderId,
                    ['status' => $status],
                    200
                );
            }

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to update order status: " . $e->getMessage());
        }
    }

    /**
     * Add lab results
     */
    public function addLabResult(array $data, string $userId): array
    {
        // Validate required fields
        $required = ['lab_order_id', 'result_name', 'result_value'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required");
            }
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO lab_results (
                    id, lab_order_id, result_name, result_value, result_unit,
                    reference_range, abnormal_flag, notes, performed_by, performed_at
                )
                VALUES (
                    UUID(), :lab_order_id, :result_name, :result_value, :result_unit,
                    :reference_range, :abnormal_flag, :notes, :performed_by, NOW()
                )
            ");

            $stmt->execute([
                'lab_order_id' => $data['lab_order_id'],
                'result_name' => $data['result_name'],
                'result_value' => $data['result_value'],
                'result_unit' => $data['result_unit'] ?? null,
                'reference_range' => $data['reference_range'] ?? null,
                'abnormal_flag' => $data['abnormal_flag'] ?? 'normal',
                'notes' => $data['notes'] ?? null,
                'performed_by' => $userId
            ]);

            // Update order status to in_progress or completed
            $status = ($data['complete'] ?? false) ? 'completed' : 'in_progress';
            $this->updateLabOrderStatus($data['lab_order_id'], $status, $userId);

            $resultId = $this->db->lastInsertId();
            $result = $this->getLabResultById($resultId);

            // Audit log
            $order = $this->getLabOrderById($data['lab_order_id']);
            if ($order) {
                $this->auditService->log(
                    $userId,
                    $order['patient_id'] ?? null,
                    'CREATE',
                    'lab_result',
                    $result['id'],
                    ['result_name' => $data['result_name']],
                    201
                );
            }

            return $result;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to add lab result: " . $e->getMessage());
        }
    }

    /**
     * Get lab result by ID
     */
    public function getLabResultById(string $resultId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lr.*, u.username as performed_by_username
                FROM lab_results lr
                LEFT JOIN users u ON lr.performed_by = u.id
                WHERE lr.id = :id AND lr.deleted_at IS NULL
            ");

            $stmt->execute(['id' => $resultId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch lab result: " . $e->getMessage());
        }
    }

    /**
     * Get lab results by order ID
     */
    public function getLabResultsByOrderId(string $orderId): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lr.*, u.username as performed_by_username
                FROM lab_results lr
                LEFT JOIN users u ON lr.performed_by = u.id
                WHERE lr.lab_order_id = :order_id AND lr.deleted_at IS NULL
                ORDER BY lr.performed_at DESC
            ");

            $stmt->execute(['order_id' => $orderId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch lab results: " . $e->getMessage());
        }
    }

    /**
     * Verify lab results (mark as verified)
     */
    public function verifyLabResults(string $resultId, string $userId): bool
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE lab_results 
                SET verified_by = :user_id,
                    verified_at = NOW(),
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $resultId,
                'user_id' => $userId
            ]);

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to verify results: " . $e->getMessage());
        }
    }

    /**
     * Get lab orders pending billing verification (used by Billing Officer)
     */
    public function getPendingBillingLabOrders(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE lo.billing_status IN ('pending_invoice', 'invoiced')
                  AND lo.deleted_at IS NULL
                ORDER BY lo.ordered_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch pending billing lab orders: " . $e->getMessage());
        }
    }

    /**
     * Verify lab order billing (approved or rejected)
     */
    public function verifyLabOrderBilling(string $orderId, string $status, string $userId, ?string $notes = null): bool
    {
        $validStatuses = ['approved', 'rejected'];
        if (!in_array($status, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid billing status: {$status}");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE lab_orders 
                SET billing_status = :status,
                    billing_verified_by = :user_id,
                    billing_verified_at = NOW(),
                    billing_notes = :notes,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                'id' => $orderId,
                'status' => $status,
                'user_id' => $userId,
                'notes' => $notes
            ]);

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to verify lab order billing: " . $e->getMessage());
        }
    }

    /**
     * Get lab orders pending invoicing
     */
    public function getInvoicingQueue(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE lo.billing_status = 'pending_invoice'
                  AND lo.deleted_at IS NULL
                ORDER BY lo.ordered_at ASC
            ");

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch invoicing queue: " . $e->getMessage());
        }
    }

    /**
     * Get lab orders for a patient filtered by invoicing state
     */
    public function getLabOrdersByPatientId(string $patientId, bool $invoicingOnly = true): array
    {
        try {
            $sql = "
                SELECT lo.*, 
                       p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                       pr.first_name as provider_first, pr.last_name as provider_last
                FROM lab_orders lo
                JOIN patients p ON lo.patient_id = p.id
                LEFT JOIN providers pr ON lo.provider_id = pr.id
                WHERE (lo.patient_id = :pid
                   OR p.mrn = :pmrn
                   OR p.first_name LIKE :sfname
                   OR p.last_name LIKE :slname
                   OR CONCAT(p.first_name, ' ', p.last_name) LIKE :sfull)
                  AND lo.deleted_at IS NULL
            ";

            if ($invoicingOnly) {
                $sql .= " AND lo.billing_status = 'pending_invoice'";
            }

            $sql .= " ORDER BY lo.ordered_at DESC";

            $stmt = $this->db->prepare($sql);
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
            throw new \RuntimeException("Failed to fetch patient lab orders: " . $e->getMessage());
        }
    }

    /**
     * Mark lab orders as invoiced
     */
    public function markAsInvoiced(array $orderIds, string $userId): bool
    {
        if (empty($orderIds)) return true;

        try {
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $stmt = $this->db->prepare("
                UPDATE lab_orders 
                SET billing_status = 'invoiced',
                    updated_at = NOW()
                WHERE id IN ($placeholders)
            ");
            return $stmt->execute($orderIds);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to mark lab orders as invoiced: " . $e->getMessage());
        }
    }
}
