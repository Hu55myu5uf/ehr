<?php

namespace App\Controllers;

use App\Services\InsuranceService;
use App\Middleware\AuthMiddleware;
use App\Config\Roles;

class InsuranceController
{
    private InsuranceService $service;

    public function __construct()
    {
        $this->service = new InsuranceService();
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
     * GET /api/insurance/providers
     */
    public function getProviders(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::BILLING_OFFICER, Roles::RECEPTIONIST]);
            $providers = $this->service->getAllProviders();
            $this->success($providers);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * POST /api/insurance/providers
     */
    public function createProvider(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::BILLING_OFFICER]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['name'])) {
                $this->error("Provider name is required", 400);
                return;
            }

            $provider = $this->service->createProvider($data);
            $this->success($provider, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * PUT /api/insurance/providers/{id}
     */
    public function updateProvider(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::BILLING_OFFICER]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['name'])) {
                $this->error("Provider name is required", 400);
                return;
            }

            $this->service->updateProvider($id, $data);
            $this->success(['message' => 'Provider updated']);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * POST /api/insurance/link-patient
     */
    public function linkPatient(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::BILLING_OFFICER, Roles::RECEPTIONIST]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['patient_id'])) {
                $this->error("Patient ID is required", 400);
                return;
            }

            $this->service->linkPatientInsurance(
                $data['patient_id'], 
                $data['insurance_provider_id'] ?? null, 
                $data['insurance_policy_number'] ?? null
            );
            $this->success(['message' => 'Patient insurance updated']);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * GET /api/insurance/claims-report
     */
    public function getClaimsReport(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::BILLING_OFFICER]);
            
            $providerId = $_GET['provider_id'] ?? null;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;

            $report = $this->service->getClaimsReport($providerId, $startDate, $endDate);
            $this->success($report);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
