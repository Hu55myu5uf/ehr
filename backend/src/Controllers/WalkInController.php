<?php

namespace App\Controllers;

use App\Services\WalkInService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Config\Roles;

class WalkInController
{
    private WalkInService $service;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->service = new WalkInService();
        $this->audit = new AuditMiddleware();
    }

    private function success($data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $msg, int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $msg]);
    }

    /**
     * Walk-in Consultation
     * POST /api/walk-in/consultation
     * Body: { first_name, last_name, gender, date_of_birth, chief_complaint? }
     */
    public function consultation(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [
                Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::DOCTOR
            ]);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['first_name']) || empty($data['last_name']) || empty($data['gender']) || empty($data['date_of_birth'])) {
                $this->error('first_name, last_name, gender, and date_of_birth are required', 400);
                return;
            }

            // Get provider ID (for encounter)
            $providerService = new ProviderService();
            $providerId = $data['provider_id'] ?? null;

            if (!$providerId) {
                // Try to get from current user (if doctor)
                $providerId = $providerService->getProviderIdByUserId($user->sub);
            }

            if (!$providerId) {
                // If user is receptionist and no provider selected, use default
                $providerId = $providerService->getDefaultProviderId();
                if (!$providerId) {
                    $this->error('No provider available for walk-in encounter', 400);
                    return;
                }
            }

            $result = $this->service->walkInConsultation($data, $providerId, $user->sub);
            $this->audit->logRequest($user, $result['patient']['id'] ?? null);
            $this->success($result, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Walk-in Lab Tests (NEW patient)
     * POST /api/walk-in/lab-tests
     * Body: { first_name, last_name, gender, date_of_birth, tests: [{test_name, test_category?, priority?}] }
     */
    public function labTests(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [
                Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::LAB_ATTENDANT, Roles::DOCTOR
            ]);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['first_name']) || empty($data['last_name']) || empty($data['gender']) || empty($data['date_of_birth'])) {
                $this->error('first_name, last_name, gender, and date_of_birth are required', 400);
                return;
            }

            if (empty($data['tests']) || !is_array($data['tests'])) {
                $this->error('tests array is required with at least one test', 400);
                return;
            }

            $result = $this->service->walkInLabTests($data, $data['tests'], $user->sub);
            $this->audit->logRequest($user, $result['patient']['id'] ?? null);
            $this->success($result, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Lab Tests for EXISTING patient (registered or walk-in)
     * POST /api/walk-in/lab-tests/existing
     * Body: { patient_id, tests: [{test_name, test_category?, priority?}] }
     */
    public function labTestsExisting(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [
                Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::LAB_ATTENDANT, Roles::DOCTOR
            ]);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['patient_id'])) {
                $this->error('patient_id is required', 400);
                return;
            }

            if (empty($data['tests']) || !is_array($data['tests'])) {
                $this->error('tests array is required with at least one test', 400);
                return;
            }

            $result = $this->service->existingPatientLabTests($data['patient_id'], $data['tests'], $user->sub);
            $this->audit->logRequest($user);
            $this->success($result, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Walk-in Pharmacy (NEW patient)
     * POST /api/walk-in/pharmacy
     * Body: { first_name, last_name, gender, date_of_birth, medications: [{medication_name, dosage?, frequency?, route?, instructions?, inventory_item_id?}] }
     */
    public function pharmacy(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [
                Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::PHARMACIST, Roles::DOCTOR
            ]);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['first_name']) || empty($data['last_name']) || empty($data['gender']) || empty($data['date_of_birth'])) {
                $this->error('first_name, last_name, gender, and date_of_birth are required', 400);
                return;
            }

            if (empty($data['medications']) || !is_array($data['medications'])) {
                $this->error('medications array is required with at least one medication', 400);
                return;
            }

            $result = $this->service->walkInPharmacy($data, $data['medications'], $user->sub);
            $this->audit->logRequest($user, $result['patient']['id'] ?? null);
            $this->success($result, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Walk-in Pharmacy for EXISTING patient
     * POST /api/walk-in/pharmacy/existing
     */
    public function pharmacyExisting(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [
                Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::PHARMACIST, Roles::DOCTOR
            ]);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['patient_id'])) {
                $this->error('patient_id is required', 400);
                return;
            }

            if (empty($data['medications']) || !is_array($data['medications'])) {
                $this->error('medications array is required with at least one medication', 400);
                return;
            }

            $result = $this->service->existingPatientPharmacy($data['patient_id'], $data['medications'], $user->sub);
            $this->audit->logRequest($user);
            $this->success($result, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get lab test catalog (with prices)
     * GET /api/walk-in/lab-catalog
     */
    public function labCatalog(object $user): void
    {
        try {
            $catalog = $this->service->getLabTestCatalog();
            $consultationFee = $this->service->getConsultationFee();

            $this->success([
                'catalog' => $catalog,
                'consultation_fee' => $consultationFee,
                'count' => count($catalog),
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get medication catalog (with prices)
     * GET /api/walk-in/med-catalog
     */
    public function medicationCatalog(object $user): void
    {
        try {
            $catalog = $this->service->getMedicationCatalog();
            $this->success([
                'catalog' => $catalog,
                'count' => count($catalog),
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
