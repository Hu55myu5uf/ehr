<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class BillingService
{
    private Database $db;
    private PriceListService $priceService;

    public function __construct()
    {
        $this->db = new Database();
        $this->priceService = new PriceListService();
    }

    /**
     * Generate a bill for a completed encounter
     */
    public function generateBill(string $encounterId, string $createdBy): array
    {
        $conn = $this->db->getConnection();

        // Get encounter details and insurance info
        $enc = $conn->prepare("
            SELECT e.*, p.first_name, p.last_name, p.mrn, p.insurance_provider_id, p.insurance_policy_number
            FROM encounters e JOIN patients p ON e.patient_id = p.id
            WHERE e.id = :eid
        ");
        $enc->execute(['eid' => $encounterId]);
        $encounter = $enc->fetch(\PDO::FETCH_ASSOC);
        if (!$encounter) throw new \RuntimeException('Encounter not found');

        $conn->beginTransaction();
        try {
            // Check if consultation fee was already billed for this encounter (e.g. at Walk-in)
            $stmtCheck = $conn->prepare("
                SELECT COUNT(*) FROM bill_items bi
                JOIN bills b ON bi.bill_id = b.id
                WHERE b.encounter_id = :eid AND bi.item_type = 'consultation'
            ");
            $stmtCheck->execute(['eid' => $encounterId]);
            $consultationAlreadyBilled = $stmtCheck->fetchColumn() > 0;

            $billId = Uuid::uuid4()->toString();
            $billNumber = 'BILL' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);

            // Create bill
            $stmt = $conn->prepare("
                INSERT INTO bills (id, patient_id, encounter_id, bill_number, status, created_by)
                VALUES (:id, :pid, :eid, :bn, 'pending', :cb)
            ");
            $stmt->execute([
                'id' => $billId,
                'pid' => $encounter['patient_id'],
                'eid' => $encounterId,
                'bn' => $billNumber,
                'cb' => $createdBy,
            ]);

            $total = 0.00;

            // Add consultation fee ONLY if not already billed
            if (!$consultationAlreadyBilled) {
                $consultFee = $this->getConsultationFeeByEncounterType($encounter['encounter_type'] ?? 'office_visit');
                $consultLabel = $this->getConsultationFeeLabel($encounter['encounter_type'] ?? 'office_visit');
                $total += $this->addBillItem($conn, $billId, 'consultation', $consultLabel, $encounterId, 1, $consultFee);
            }

            // Add lab test charges - ONLY those pending invoice (not already paid or invoiced)
            $labs = $conn->prepare("
                SELECT id, test_name 
                FROM lab_orders 
                WHERE encounter_id = :eid 
                  AND billing_status = 'pending_invoice'
                  AND deleted_at IS NULL
            ");
            $labs->execute(['eid' => $encounterId]);
            $defaultLabFee = $this->priceService->getPriceByType('lab_test');
            $labIds = [];
            foreach ($labs->fetchAll(\PDO::FETCH_ASSOC) as $lab) {
                $specificPrice = $this->priceService->getPriceByItemName($lab['test_name'], $defaultLabFee);
                $total += $this->addBillItem($conn, $billId, 'lab_test', $lab['test_name'], $lab['id'], 1, $specificPrice);
                $labIds[] = $lab['id'];
            }

            // Mark lab orders as invoiced
            if (!empty($labIds)) {
                $placeholders = implode(',', array_fill(0, count($labIds), '?'));
                $conn->prepare("UPDATE lab_orders SET billing_status = 'invoiced' WHERE id IN ($placeholders)")
                     ->execute($labIds);
            }

            // Add medication charges - ONLY those pending invoice
            $meds = $conn->prepare("
                SELECT m.id, m.medication_name, m.dosage, m.quantity, i.unit_price 
                FROM medications m 
                LEFT JOIN inventory i ON m.inventory_item_id = i.id
                WHERE m.encounter_id = :eid 
                  AND m.billing_status = 'pending_invoice'
                  AND m.deleted_at IS NULL
            ");
            $meds->execute(['eid' => $encounterId]);
            $medFeeDefault = $this->priceService->getPriceByType('medication');
            $medIds = [];
            foreach ($meds->fetchAll(\PDO::FETCH_ASSOC) as $med) {
                $price = $med['unit_price'] ?? $medFeeDefault;
                $qty = (int)($med['quantity'] ?? 1);
                $total += $this->addBillItem($conn, $billId, 'medication', "{$med['medication_name']} ({$med['dosage']})", $med['id'], $qty, (float)$price);
                $medIds[] = $med['id'];
            }

            // Mark medications as invoiced
            if (!empty($medIds)) {
                $placeholders = implode(',', array_fill(0, count($medIds), '?'));
                $conn->prepare("UPDATE medications SET billing_status = 'invoiced' WHERE id IN ($placeholders)")
                     ->execute($medIds);
            }

            // Update total and calculate portions
            $insurancePortion = 0.00;
            $patientPortion = $total;

            if ($encounter['insurance_provider_id']) {
                $insurancePortion = $total;
                $patientPortion = 0.00;
            }

            $conn->prepare("UPDATE bills SET total_amount = :total, insurance_portion = :ip, patient_portion = :pp WHERE id = :id")
                 ->execute([
                     'total' => $total,
                     'ip' => $insurancePortion,
                     'pp' => $patientPortion,
                     'id' => $billId
                 ]);

            // Create claim if insured
            if ($insurancePortion > 0) {
                $insService = new \App\Services\InsuranceService();
                $insService->createClaim($billId, $encounter['insurance_provider_id'], $insurancePortion);
            }

            $conn->commit();
            return $this->getBillById($billId);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    /**
     * Generate bill for unbilled lab orders (Direct Lab Booking)
     */
    public function generateDirectLabBill(string $patientId, string $createdBy): array
    {
        $conn = $this->db->getConnection();
        
        $conn->beginTransaction();
        try {
            // Find unbilled lab orders for this patient
            $stmt = $conn->prepare("
                SELECT lo.id, lo.test_name 
                FROM lab_orders lo
                LEFT JOIN bill_items bi ON lo.id = bi.reference_id AND bi.item_type = 'lab_test'
                WHERE lo.patient_id = :pid 
                  AND lo.encounter_id IS NULL 
                  AND bi.id IS NULL
                  AND lo.deleted_at IS NULL
            ");
            $stmt->execute(['pid' => $patientId]);
            $unbilledLabs = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
            if (empty($unbilledLabs)) {
                $conn->rollBack();
                throw new \RuntimeException('No unbilled standalone lab orders found for this patient');
            }

            // Get patient info for insurance
            $psell = $conn->prepare("SELECT insurance_provider_id FROM patients WHERE id = :pid");
            $psell->execute(['pid' => $patientId]);
            $patient = $psell->fetch(\PDO::FETCH_ASSOC);

            // Create bill
            $billId = Uuid::uuid4()->toString();
            $billNumber = 'BILL-DIR-' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);

            $stmt = $conn->prepare("
                INSERT INTO bills (id, patient_id, bill_number, status, created_by)
                VALUES (:id, :pid, :bn, 'pending', :cb)
            ");
            $stmt->execute([
                'id' => $billId,
                'pid' => $patientId,
                'bn' => $billNumber,
                'cb' => $createdBy,
            ]);

            $total = 0.00;
            $defaultLabFee = $this->priceService->getPriceByType('lab_test');
            foreach ($unbilledLabs as $lab) {
                $specificPrice = $this->priceService->getPriceByItemName($lab['test_name'], $defaultLabFee);
                $total += $this->addBillItem($conn, $billId, 'lab_test', $lab['test_name'], $lab['id'], 1, $specificPrice);
            }

            // Update total and calculate portions
            $insurancePortion = 0.00;
            $patientPortion = $total;

            if ($patient['insurance_provider_id']) {
                $insurancePortion = $total;
                $patientPortion = 0.00;
            }

            $conn->prepare("UPDATE bills SET total_amount = :total, insurance_portion = :ip, patient_portion = :pp WHERE id = :id")
                 ->execute([
                     'total' => $total, 
                     'ip' => $insurancePortion, 
                     'pp' => $patientPortion, 
                     'id' => $billId
                 ]);

            // Create claim if insured
            if ($insurancePortion > 0) {
                $insService = new InsuranceService();
                $insService->createClaim($billId, $patient['insurance_provider_id'], $insurancePortion);
            }

            $conn->commit();
            return $this->getBillById($billId);
        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    private function addBillItem(\PDO $conn, string $billId, string $type, string $desc, ?string $refId, int $qty, float $price): float
    {
        $id = Uuid::uuid4()->toString();
        $total = $qty * $price;
        $conn->prepare("
            INSERT INTO bill_items (id, bill_id, item_type, description, reference_id, quantity, unit_price, total_price)
            VALUES (:id, :bid, :type, :desc, :ref, :qty, :up, :tp)
        ")->execute([
            'id' => $id, 'bid' => $billId, 'type' => $type, 'desc' => $desc,
            'ref' => $refId, 'qty' => $qty, 'up' => $price, 'tp' => $total
        ]);
        return $total;
    }

    /**
     * Get bill by ID
     */
    public function getBillById(string $id): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT b.*, p.first_name AS patient_first, p.last_name AS patient_last, p.mrn, p.is_walk_in
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            WHERE b.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $bill = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($bill) {
            $items = $conn->prepare("SELECT * FROM bill_items WHERE bill_id = :bid ORDER BY created_at");
            $items->execute(['bid' => $id]);
            $bill['items'] = $items->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $bill ?: null;
    }

    /**
     * List bills with filters
     */
    public function listBills(?string $status = null, int $limit = 50, int $offset = 0): array
    {
        $conn = $this->db->getConnection();
        $where = '1=1';
        $params = [];

        if ($status) {
            $where .= ' AND b.status = :status';
            $params['status'] = $status;
        }

        $stmt = $conn->prepare("
            SELECT b.*, p.first_name AS patient_first, p.last_name AS patient_last, p.mrn, p.is_walk_in
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            WHERE {$where}
            ORDER BY b.generated_at DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Process payment
     */
    public function processPayment(string $billId, array $data): array
    {
        $conn = $this->db->getConnection();

        $bill = $this->getBillById($billId);
        if (!$bill) throw new \RuntimeException('Bill not found');

        $paidAmount = (float)($data['amount'] ?? $bill['total_amount']);
        $paymentMethod = $data['payment_method'] ?? 'cash';

        // Handle Wallet payment
        if ($paymentMethod === 'wallet') {
            $walletService = new WalletService();
            // Deduct from wallet - this will throw exception if funds are insufficient
            $walletService->deduct($bill['patient_id'], $paidAmount, $billId, $data['created_by'] ?? null);
        }

        $newPaid = (float)$bill['paid_amount'] + $paidAmount;
        $status = $newPaid >= (float)$bill['total_amount'] ? 'paid' : 'partial';

        $stmt = $conn->prepare("
            UPDATE bills SET 
                paid_amount = :paid, status = :status, 
                payment_method = :method, payment_reference = :ref,
                paid_at = IF(:status2 = 'paid', NOW(), paid_at),
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'paid' => $newPaid,
            'status' => $status,
            'method' => $paymentMethod,
            'ref' => $data['payment_reference'] ?? null,
            'status2' => $status,
            'id' => $billId,
        ]);

        if ($status === 'paid') {
            $this->updateSourceEntitiesStatus($billId);
        }

        return $this->getBillById($billId);
    }

    /**
     * Update statuses of source entities (medications, labs) upon payment
     */
    private function updateSourceEntitiesStatus(string $billId): void
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT item_type, reference_id FROM bill_items WHERE bill_id = :bid");
        $stmt->execute(['bid' => $billId]);
        $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($items as $item) {
            if (!$item['reference_id']) continue;

            if ($item['item_type'] === 'medication') {
                $conn->prepare("UPDATE medications SET billing_status = 'paid', updated_at = NOW() WHERE id = :id")
                     ->execute(['id' => $item['reference_id']]);
            } elseif ($item['item_type'] === 'lab_test') {
                $conn->prepare("UPDATE lab_orders SET billing_status = 'paid', updated_at = NOW() WHERE id = :id")
                     ->execute(['id' => $item['reference_id']]);
            } elseif ($item['item_type'] === 'consultation') {
                // If this consultation belongs to an appointment, move it from 'pending_payment' to 'checked_in'
                $conn->prepare("UPDATE appointments SET status = 'checked_in', updated_at = NOW() 
                                WHERE encounter_id = :eid AND status = 'pending_payment'")
                     ->execute(['eid' => $item['reference_id']]);
            }
        }
    }

    /**
     * Count pending bills
     */
    public function countPending(): int
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT COUNT(*) FROM bills WHERE status IN ('pending', 'partial')");
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

    /**
     * Get bill by encounter ID
     */
    public function getBillByEncounterId(string $encounterId): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT id FROM bills WHERE encounter_id = :eid");
        $stmt->execute(['eid' => $encounterId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? $this->getBillById($row['id']) : null;
    }

    /**
     * Generate bill for selected prescriptions (Pharmacy Invoicing)
     */
    public function generatePharmacyInvoice(string $patientId, array $medicationIds, string $createdBy): array
    {
        if (empty($medicationIds)) throw new \InvalidArgumentException('No medications selected');

        $conn = $this->db->getConnection();
        $conn->beginTransaction();

        try {
            $billId = Uuid::uuid4()->toString();
            $billNumber = 'INV-PH-' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);

            // Create bill
            $stmt = $conn->prepare("
                INSERT INTO bills (id, patient_id, bill_number, status, created_by)
                VALUES (:id, :pid, :bn, 'pending', :cb)
            ");
            $stmt->execute([
                'id' => $billId,
                'pid' => $patientId,
                'bn' => $billNumber,
                'cb' => $createdBy,
            ]);

            $total = 0.00;
            $medFeeDefault = $this->priceService->getPriceByType('medication');

            // Get selected medications details
            $placeholders = implode(',', array_fill(0, count($medicationIds), '?'));
            $sql = "
                SELECT m.id, m.medication_name, m.dosage, i.unit_price 
                FROM medications m 
                LEFT JOIN inventory i ON m.inventory_item_id = i.id
                WHERE m.id IN ($placeholders)
            ";
            $stmt = $conn->prepare($sql);
            $stmt->execute($medicationIds);
            
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $med) {
                $price = $med['unit_price'] ?? $medFeeDefault;
                $total += $this->addBillItem($conn, $billId, 'medication', "{$med['medication_name']} ({$med['dosage']})", $med['id'], 1, (float)$price);
            }

            // Get patient info for insurance
            $psell = $conn->prepare("SELECT insurance_provider_id FROM patients WHERE id = :pid");
            $psell->execute(['pid' => $patientId]);
            $patientInfo = $psell->fetch(\PDO::FETCH_ASSOC);

            // Update total and calculate portions
            $insurancePortion = 0.00;
            $patientPortion = $total;

            if ($patientInfo['insurance_provider_id']) {
                $insurancePortion = $total;
                $patientPortion = 0.00;
            }

            $conn->prepare("UPDATE bills SET total_amount = :total, insurance_portion = :ip, patient_portion = :pp WHERE id = :id")
                 ->execute([
                     'total' => $total, 
                     'ip' => $insurancePortion, 
                     'pp' => $patientPortion, 
                     'id' => $billId
                 ]);

            // Create claim if insured
            if ($insurancePortion > 0) {
                $insService = new \App\Services\InsuranceService();
                $insService->createClaim($billId, $patientInfo['insurance_provider_id'], $insurancePortion);
            }

            $conn->commit();
            return $this->getBillById($billId);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    /**
     * Generate bill for selected lab orders (Laboratory Invoicing)
     */
    public function generateLabInvoice(string $patientId, array $orderIds, string $createdBy): array
    {
        if (empty($orderIds)) throw new \InvalidArgumentException('No lab orders selected');

        $conn = $this->db->getConnection();
        $conn->beginTransaction();

        try {
            $billId = Uuid::uuid4()->toString();
            $billNumber = 'INV-LAB-' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);

            // Create bill
            $stmt = $conn->prepare("
                INSERT INTO bills (id, patient_id, bill_number, status, created_by)
                VALUES (:id, :pid, :bn, 'pending', :cb)
            ");
            $stmt->execute([
                'id' => $billId,
                'pid' => $patientId,
                'bn' => $billNumber,
                'cb' => $createdBy,
            ]);

            $total = 0.00;
            $defaultLabFee = $this->priceService->getPriceByType('lab_test');

            // Get selected lab orders details
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $sql = "
                SELECT id, test_name 
                FROM lab_orders 
                WHERE id IN ($placeholders)
            ";
            $stmt = $conn->prepare($sql);
            $stmt->execute($orderIds);
            
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $lab) {
                $specificPrice = $this->priceService->getPriceByItemName($lab['test_name'], $defaultLabFee);
                $total += $this->addBillItem($conn, $billId, 'lab_test', $lab['test_name'], $lab['id'], 1, $specificPrice);
            }

            // Get patient info for insurance
            $psell = $conn->prepare("SELECT insurance_provider_id FROM patients WHERE id = :pid");
            $psell->execute(['pid' => $patientId]);
            $patientInfo = $psell->fetch(\PDO::FETCH_ASSOC);

            // Update total and calculate portions
            $insurancePortion = 0.00;
            $patientPortion = $total;

            if ($patientInfo && $patientInfo['insurance_provider_id']) {
                $insurancePortion = $total;
                $patientPortion = 0.00;
            }

            $conn->prepare("UPDATE bills SET total_amount = :total, insurance_portion = :ip, patient_portion = :pp WHERE id = :id")
                 ->execute([
                     'total' => $total, 
                     'ip' => $insurancePortion, 
                     'pp' => $patientPortion, 
                     'id' => $billId
                 ]);

            // Create claim if insured
            if ($insurancePortion > 0) {
                $insService = new \App\Services\InsuranceService();
                $insService->createClaim($billId, $patientInfo['insurance_provider_id'], $insurancePortion);
            }

            $conn->commit();
            return $this->getBillById($billId);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    /**
     * Generate a complete walk-in bill (consultation + optional labs + optional medications)
     */
    public function generateWalkInBill(string $patientId, string $createdBy, array $options = []): array
    {
        $conn = $this->db->getConnection();
        $conn->beginTransaction();

        try {
            $billId = Uuid::uuid4()->toString();
            $billNumber = 'WK-' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);
            $serviceType = $options['service_type'] ?? 'consultation';
            $encounterId = $options['encounter_id'] ?? null;

            // Create bill
            $stmt = $conn->prepare("
                INSERT INTO bills (id, patient_id, encounter_id, bill_number, status, created_by)
                VALUES (:id, :pid, :eid, :bn, 'pending', :cb)
            ");
            $stmt->execute([
                'id' => $billId,
                'pid' => $patientId,
                'eid' => $encounterId,
                'bn' => $billNumber,
                'cb' => $createdBy,
            ]);

            $total = 0.00;

            // Add consultation fee if service includes consultation
            $includesConsultation = in_array($serviceType, [
                'consultation', 'consultation_and_lab', 'consultation_and_pharmacy', 'full_service'
            ]);

            if ($includesConsultation) {
                $consultFee = $this->getConsultationFeeByEncounterType('walk_in');
                $total += $this->addBillItem($conn, $billId, 'consultation', 'Walk-in Consultation Fee', $encounterId, 1, $consultFee);
            }

            // Add lab test charges if lab orders specified
            if (!empty($options['lab_order_ids'])) {
                $defaultLabFee = $this->priceService->getPriceByType('lab_test');
                $placeholders = implode(',', array_fill(0, count($options['lab_order_ids']), '?'));
                $labStmt = $conn->prepare("SELECT id, test_name FROM lab_orders WHERE id IN ($placeholders)");
                $labStmt->execute($options['lab_order_ids']);
                foreach ($labStmt->fetchAll(\PDO::FETCH_ASSOC) as $lab) {
                    $specificPrice = $this->priceService->getPriceByItemName($lab['test_name'], $defaultLabFee);
                    $total += $this->addBillItem($conn, $billId, 'lab_test', $lab['test_name'], $lab['id'], 1, $specificPrice);
                }
            }

            // Add medication charges if medication IDs specified
            if (!empty($options['medication_ids'])) {
                $medFeeDefault = $this->priceService->getPriceByType('medication');
                $placeholders = implode(',', array_fill(0, count($options['medication_ids']), '?'));
                $medStmt = $conn->prepare("
                    SELECT m.id, m.medication_name, m.dosage, i.unit_price 
                    FROM medications m 
                    LEFT JOIN inventory i ON m.inventory_item_id = i.id
                    WHERE m.id IN ($placeholders)
                ");
                $medStmt->execute($options['medication_ids']);
                foreach ($medStmt->fetchAll(\PDO::FETCH_ASSOC) as $med) {
                    $price = $med['unit_price'] ?? $medFeeDefault;
                    $total += $this->addBillItem($conn, $billId, 'medication', "{$med['medication_name']} ({$med['dosage']})", $med['id'], 1, (float)$price);
                }
            }

            // Update total (walk-ins always pay full — no insurance by default)
            $conn->prepare("UPDATE bills SET total_amount = :total, insurance_portion = 0, patient_portion = :pp WHERE id = :id")
                 ->execute([
                     'total' => $total,
                     'pp' => $total,
                     'id' => $billId
                 ]);

            $conn->commit();
            return $this->getBillById($billId);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    /**
     * Get consultation fee based on encounter type
     */
    private function getConsultationFeeByEncounterType(string $encounterType): float
    {
        $feeTypeMap = [
            'office_visit'  => 'consultation',
            'emergency'     => 'consultation_emergency',
            'follow_up'     => 'consultation_followup',
            'walk_in'       => 'consultation_walkin',
            'telehealth'    => 'consultation',
            'inpatient'     => 'consultation',
        ];

        $feeType = $feeTypeMap[$encounterType] ?? 'consultation';
        $fee = $this->priceService->getPriceByType($feeType);

        // Fallback to generic consultation fee if specific type not found
        if ($fee <= 0) {
            $fee = $this->priceService->getPriceByType('consultation');
        }

        return $fee;
    }

    /**
     * Get consultation fee label based on encounter type
     */
    private function getConsultationFeeLabel(string $encounterType): string
    {
        $labels = [
            'office_visit'  => 'Consultation Fee',
            'emergency'     => 'Emergency Consultation Fee',
            'follow_up'     => 'Follow-up Consultation Fee',
            'walk_in'       => 'Walk-in Consultation Fee',
            'telehealth'    => 'Telehealth Consultation Fee',
            'inpatient'     => 'Inpatient Consultation Fee',
        ];

        return $labels[$encounterType] ?? 'Consultation Fee';
    }
}
