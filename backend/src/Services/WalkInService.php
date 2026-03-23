<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class WalkInService
{
    private Database $db;
    private PatientService $patientService;
    private BillingService $billingService;
    private LabService $labService;
    private MedicationService $medService;
    private PriceListService $priceService;
    private InventoryService $inventoryService;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->patientService = new PatientService();
        $this->billingService = new BillingService();
        $this->labService = new LabService();
        $this->medService = new MedicationService();
        $this->priceService = new PriceListService();
        $this->inventoryService = new InventoryService();
    }

    /**
     * Walk-in Consultation Flow:
     * 1. Register walk-in patient (minimal)
     * 2. Create walk-in encounter
     * 3. Generate consultation bill
     */
    public function walkInConsultation(array $patientData, string $providerId, string $userId): array
    {
        $conn = $this->db->getConnection();

        // Step 1: Register walk-in patient
        $patient = $this->patientService->registerWalkIn($patientData);

        // Step 2: Create encounter
        $encounterService = new EncounterService();
        $encounter = $encounterService->createEncounter([
            'patient_id' => $patient['id'],
            'encounter_type' => 'walk_in',
            'chief_complaint' => $patientData['chief_complaint'] ?? 'Walk-in consultation',
            'encounter_date' => date('Y-m-d H:i:s'),
            'status' => 'scheduled',
        ], $providerId);

        // Step 3: Update service_type
        $conn->prepare("UPDATE encounters SET service_type = 'consultation' WHERE id = :id")
             ->execute(['id' => $encounter['id']]);

        // Step 4: Generate walk-in consultation bill
        $bill = $this->billingService->generateWalkInBill($patient['id'], $userId, [
            'service_type' => 'consultation',
            'encounter_id' => $encounter['id'],
        ]);

        // Step 5: Create a linked appointment visible in the queue (pending payment)
        $aptService = new AppointmentService();
        $aptService->createAppointment([
            'patient_id' => $patient['id'],
            'provider_id' => $providerId,
            'appointment_date' => date('Y-m-d'),
            'appointment_time' => date('H:i:s'),
            'appointment_type' => 'emergency', // Use emergency as it's a walk-in
            'reason' => $patientData['chief_complaint'] ?? 'Walk-in consultation',
            'status' => 'pending_payment',
            'encounter_id' => $encounter['id'],
        ], $userId);

        return [
            'patient' => $patient,
            'encounter' => $encounter,
            'bill' => $bill,
        ];
    }

    /**
     * Walk-in Lab-Only Flow:
     * 1. Register walk-in patient (minimal)
     * 2. Create lab orders
     * 3. Generate lab-only bill (NO consultation fee)
     */
    public function walkInLabTests(array $patientData, array $tests, string $userId): array
    {
        // Step 1: Register walk-in patient
        $patient = $this->patientService->registerWalkIn($patientData);

        // Step 2: Create lab orders
        $labOrders = [];
        $batchId = \Ramsey\Uuid\Uuid::uuid4()->toString();
        foreach ($tests as $test) {
            $order = $this->labService->createLabOrder([
                'patient_id' => $patient['id'],
                'test_name' => $test['test_name'],
                'test_code' => $test['test_code'] ?? null,
                'test_category' => $test['test_category'] ?? null,
                'priority' => $test['priority'] ?? 'routine',
                'batch_id' => $batchId,
                'specimen_type' => $test['specimen_type'] ?? null,
                'notes' => $test['notes'] ?? null,
            ], null, $userId);
            $labOrders[] = $order;
        }

        $labOrderIds = array_map(fn($o) => $o['id'], $labOrders);

        // Step 3: Generate lab-only bill (no consultation fee)
        $bill = $this->billingService->generateWalkInBill($patient['id'], $userId, [
            'service_type' => 'lab_only',
            'lab_order_ids' => $labOrderIds,
        ]);

        // Mark lab orders as invoiced
        $this->labService->markAsInvoiced($labOrderIds, $userId);

        return [
            'patient' => $patient,
            'lab_orders' => $labOrders,
            'bill' => $bill,
        ];
    }

    /**
     * Walk-in Lab Tests for EXISTING patient (registered or previously created walk-in)
     */
    public function existingPatientLabTests(string $patientId, array $tests, string $userId): array
    {
        // Step 1: Create lab orders
        $labOrders = [];
        $batchId = \Ramsey\Uuid\Uuid::uuid4()->toString();
        foreach ($tests as $test) {
            $order = $this->labService->createLabOrder([
                'patient_id' => $patientId,
                'test_name' => $test['test_name'],
                'test_code' => $test['test_code'] ?? null,
                'test_category' => $test['test_category'] ?? null,
                'priority' => $test['priority'] ?? 'routine',
                'batch_id' => $batchId,
                'specimen_type' => $test['specimen_type'] ?? null,
                'notes' => $test['notes'] ?? null,
            ], null, $userId);
            $labOrders[] = $order;
        }

        $labOrderIds = array_map(fn($o) => $o['id'], $labOrders);

        // Step 2: Generate lab-only bill
        $bill = $this->billingService->generateWalkInBill($patientId, $userId, [
            'service_type' => 'lab_only',
            'lab_order_ids' => $labOrderIds,
        ]);

        // Mark lab orders as invoiced
        $this->labService->markAsInvoiced($labOrderIds, $userId);

        return [
            'lab_orders' => $labOrders,
            'bill' => $bill,
        ];
    }

    /**
     * Get available lab tests with prices (for walk-in test catalog)
     */
    public function getLabTestCatalog(): array
    {
        $prices = $this->priceService->getPrices();
        $catalog = [];

        foreach ($prices as $item) {
            if ($item['item_type'] === 'lab_test') {
                $catalog[] = [
                    'name' => $item['item_name'],
                    'price' => (float)$item['price'],
                    'category' => $item['category'],
                ];
            }
        }

        // Sort by category then name
        usort($catalog, function ($a, $b) {
            $catCmp = strcmp($a['category'], $b['category']);
            return $catCmp !== 0 ? $catCmp : strcmp($a['name'], $b['name']);
        });

        return $catalog;
    }

    /**
     * Get consultation fee for display
     */
    public function getConsultationFee(): float
    {
        return $this->priceService->getPriceByType('consultation_walkin') ?: $this->priceService->getPriceByType('consultation');
    }

    /**
     * Walk-in Pharmacy Flow:
     * 1. Register walk-in patient
     * 2. Create medication prescriptions/orders
     * 3. Generate pharmacy-only bill
     */
    public function walkInPharmacy(array $patientData, array $medications, string $userId): array
    {
        // Step 1: Register walk-in patient
        $patient = $this->patientService->registerWalkIn($patientData);

        // Step 2: Create medications
        $medicationOrders = [];
        $providerService = new ProviderService();
        $defaultProviderId = $providerService->getDefaultProviderId();

        foreach ($medications as $med) {
            $order = $this->medService->prescribeMedication([
                'patient_id' => $patient['id'],
                'medication_name' => $med['medication_name'],
                'dosage' => $med['dosage'] ?? '1 unit',
                'frequency' => $med['frequency'] ?? 'once',
                'route' => $med['route'] ?? 'oral',
                'instructions' => $med['instructions'] ?? null,
                'inventory_item_id' => $med['inventory_item_id'] ?? null,
            ], $defaultProviderId, $userId);
            $medicationOrders[] = $order;
        }

        $medicationIds = array_map(fn($m) => $m['id'], $medicationOrders);

        // Step 3: Generate pharmacy bill
        $bill = $this->billingService->generateWalkInBill($patient['id'], $userId, [
            'service_type' => 'pharmacy_only',
            'medication_ids' => $medicationIds,
        ]);

        // Mark medications as invoiced
        $this->medService->markAsInvoiced($medicationIds, $userId);

        return [
            'patient' => $patient,
            'medications' => $medicationOrders,
            'bill' => $bill,
        ];
    }

    /**
     * Walk-in Pharmacy for EXISTING patient
     */
    public function existingPatientPharmacy(string $patientId, array $medications, string $userId): array
    {
        // Step 1: Create medications
        $medicationOrders = [];
        $providerService = new ProviderService();
        $defaultProviderId = $providerService->getDefaultProviderId();

        foreach ($medications as $med) {
            $order = $this->medService->prescribeMedication([
                'patient_id' => $patientId,
                'medication_name' => $med['medication_name'],
                'dosage' => $med['dosage'] ?? '1 unit',
                'frequency' => $med['frequency'] ?? 'once',
                'route' => $med['route'] ?? 'oral',
                'instructions' => $med['instructions'] ?? null,
                'inventory_item_id' => $med['inventory_item_id'] ?? null,
            ], $defaultProviderId, $userId);
            $medicationOrders[] = $order;
        }

        $medicationIds = array_map(fn($m) => $m['id'], $medicationOrders);

        // Step 2: Generate pharmacy bill
        $bill = $this->billingService->generateWalkInBill($patientId, $userId, [
            'service_type' => 'pharmacy_only',
            'medication_ids' => $medicationIds,
        ]);

        // Mark medications as invoiced
        $this->medService->markAsInvoiced($medicationIds, $userId);

        return [
            'medications' => $medicationOrders,
            'bill' => $bill,
        ];
    }

    /**
     * Get available medications with prices
     */
    public function getMedicationCatalog(): array
    {
        $items = $this->inventoryService->getAllItems();
        $catalog = [];

        foreach ($items as $item) {
            // Check if it's a medication or has quantity (optional: filter by category if needed)
            // But usually all items in inventory are medications for the pharmacy
            $catalog[] = [
                'name' => $item['item_name'],
                'brand' => $item['brand_name'],
                'price' => (float)$item['unit_price'],
                'category' => $item['category'] ?? 'Pharmacy',
                'inventory_item_id' => $item['id'],
                'available_qty' => $item['quantity'],
            ];
        }

        // Sort by name
        usort($catalog, fn($a, $b) => strcmp($a['name'], $b['name']));

        return $catalog;
    }
}
