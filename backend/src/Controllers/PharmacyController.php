<?php

namespace App\Controllers;

use App\Services\MedicationService;
use App\Config\Roles;

class PharmacyController
{
    private MedicationService $medicationService;
    private \App\Services\ProviderService $providerService;
    private \App\Services\BillingService $billingService;

    public function __construct()
    {
        $this->medicationService = new MedicationService();
        $this->providerService = new \App\Services\ProviderService();
        $this->billingService = new \App\Services\BillingService();
    }

    /**
     * Prescribe medication
     * POST /api/medications
     */
    public function prescribe(object $user): void
    {
        // Only doctors and nurses can prescribe
        if (!Roles::hasPermission($user->role, 'manage_medications')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Cannot prescribe medications']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            // Get provider ID from user
            $providerId = $this->providerService->getProviderIdByUserId($user->sub);
            if (!$providerId) {
                http_response_code(400);
                echo json_encode(['error' => 'No provider profile found for user']);
                return;
            }

            $medication = $this->medicationService->prescribeMedication($input, $providerId, $user->sub);

            http_response_code(201);
            echo json_encode([
                'message' => 'Medication prescribed successfully',
                'medication' => $medication
            ]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to prescribe medication: ' . $e->getMessage()]);
        }
    }

    /**
     * Get pending prescriptions
     * GET /api/medications/pending
     */
    public function getPending(object $user): void
    {
        // Only pharmacists and super admins can view pending prescriptions
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only pharmacists can view pending prescriptions']);
            return;
        }

        try {
            $prescriptions = $this->medicationService->getPendingPrescriptions();

            http_response_code(200);
            echo json_encode([
                'count' => count($prescriptions),
                'prescriptions' => $prescriptions
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch pending prescriptions']);
        }
    }

    /**
     * Get dispensed medication history
     * GET /api/medications/history
     */
    public function getHistory(object $user): void
    {
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $limit = (int)($_GET['limit'] ?? 50);
            $medications = $this->medicationService->getDispensedMedications($limit);

            http_response_code(200);
            echo json_encode([
                'count' => count($medications),
                'medications' => $medications
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch medication history']);
        }
    }

    /**
     * Get patient medications
     * GET /api/medications/patient/{id}
     */
    public function getPatientMedications(object $user, string $patientId): void
    {
        // Check if user can view patient data
        if (!Roles::hasPermission($user->role, 'view_patients')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Cannot view patient data']);
            return;
        }

        try {
            $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] === 'true';
            $medications = $this->medicationService->getPatientMedications($patientId, $activeOnly);

            http_response_code(200);
            echo json_encode([
                'count' => count($medications),
                'medications' => $medications
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch medications']);
        }
    }

    /**
     * Get medication by ID
     * GET /api/medications/{id}
     */
    public function getMedication(object $user, string $medicationId): void
    {
        if (!Roles::hasPermission($user->role, 'view_patients')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $medication = $this->medicationService->getMedicationById($medicationId);

            if (!$medication) {
                http_response_code(404);
                echo json_encode(['error' => 'Medication not found']);
                return;
            }

            http_response_code(200);
            echo json_encode($medication);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch medication']);
        }
    }

    /**
     * Dispense medication
     * POST /api/medications/{id}/dispense
     */
    public function dispense(object $user, string $medicationId): void
    {
        // Only pharmacists and super admins can dispense
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only pharmacists can dispense medications']);
            return;
        }

        try {
            $medication = $this->medicationService->dispenseMedication($medicationId, $user->sub);

            http_response_code(200);
            echo json_encode([
                'message' => 'Medication dispensed successfully',
                'medication' => $medication
            ]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to dispense medication']);
        }
    }

    /**
     * Process refill
     * POST /api/medications/{id}/refill
     */
    public function refill(object $user, string $medicationId): void
    {
        // Only pharmacists and super admins can process refills
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only pharmacists can process refills']);
            return;
        }

        try {
            $medication = $this->medicationService->processRefill($medicationId, $user->sub);

            http_response_code(200);
            echo json_encode([
                'message' => 'Refill processed successfully',
                'medication' => $medication
            ]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to process refill']);
        }
    }

    /**
     * Discontinue medication
     * POST /api/medications/{id}/discontinue
     */
    public function discontinue(object $user, string $medicationId): void
    {
        // Doctors, pharmacists and super admins can discontinue
        if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::PHARMACIST])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only doctors and pharmacists can discontinue medications']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $reason = $input['reason'] ?? 'Not specified';

            $this->medicationService->discontinueMedication($medicationId, $reason, $user->sub);

            http_response_code(200);
            echo json_encode(['message' => 'Medication discontinued successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to discontinue medication']);
        }
    }

    /**
     * Get pending prescriptions for a specific patient
     * GET /api/medications/patient/{id}/pending
     */
    public function getPatientPrescriptions(object $user, string $patientId): void
    {
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $prescriptions = $this->medicationService->getPrescriptionsByPatientId($patientId);
            http_response_code(200);
            echo json_encode(['prescriptions' => $prescriptions]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Generate invoice for selected prescriptions
     * POST /api/pharmacy/invoice
     */
    public function generateInvoice(object $user): void
    {
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $patientId = $input['patient_id'] ?? null;
            $medicationIds = $input['medication_ids'] ?? [];

            if (!$patientId || empty($medicationIds)) {
                http_response_code(400);
                echo json_encode(['error' => 'Patient ID and medication IDs are required']);
                return;
            }

            // Generate the bill
            $bill = $this->billingService->generatePharmacyInvoice($patientId, $medicationIds, $user->sub);
            
            // Mark medications as invoiced
            $this->medicationService->markAsInvoiced($medicationIds, $user->sub);

            http_response_code(201);
            echo json_encode([
                'message' => 'Invoice generated successfully',
                'bill' => $bill
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Get all prescriptions pending invoicing
     * GET /api/pharmacy/invoicing/pending
     */
    public function getInvoicingQueue(object $user): void
    {
        if ($user->role !== Roles::PHARMACIST && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $prescriptions = $this->medicationService->getInvoicingQueue();
            http_response_code(200);
            echo json_encode(['prescriptions' => $prescriptions]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

