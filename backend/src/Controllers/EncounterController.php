<?php

namespace App\Controllers;

use App\Services\EncounterService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class EncounterController
{
    private EncounterService $encounterService;
    private AuditMiddleware $audit;
    private \App\Services\ProviderService $providerService;

    public function __construct()
    {
        $this->encounterService = new EncounterService();
        $this->audit = new AuditMiddleware();
        $this->providerService = new \App\Services\ProviderService();
    }

    /**
     * List all encounters (paginated)
     * GET /api/encounters
     */
    public function index(object $user): void
    {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $status = $_GET['status'] ?? null;

            $filters = [];
            if ($status) {
                $filters['status'] = $status;
            }

            $encounters = $this->encounterService->getAllEncounters($filters, $limit, $offset);

            $this->success([
                'encounters' => $encounters,
                'count' => count($encounters),
                'limit' => $limit,
                'offset' => $offset
            ]);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Create new encounter
     * POST /api/encounters
     */
    public function create(object $user): void
    {
        try {
            // Only doctors and nurses can create encounters
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_CREATE_ENCOUNTERS);

            $data = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            if (!isset($data['patient_id']) || empty($data['patient_id'])) {
                $this->badRequest('patient_id is required');
                return;
            }

            // Get provider ID from user
            $providerId = $this->providerService->getProviderIdByUserId($user->sub);

            if (!$providerId) {
                $this->error('Provider not found for user', 403);
                return;
            }

            $encounter = $this->encounterService->createEncounter($data, $providerId);

            // Log audit trail
            $this->audit->logRequest($user, $data['patient_id']);

            $this->success($encounter, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get encounter by ID
     * GET /api/encounters/{id}
     */
    public function getById(object $user, string $id): void
    {
        try {
            $encounter = $this->encounterService->getEncounterById($id);

            // Log data access
            $this->audit->logRequest($user, $encounter['patient_id'] ?? null);

            $this->success($encounter);

        } catch (\Exception $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * Get patient encounter history
     * GET /api/encounters/patient/{patientId}
     */
    public function getPatientEncounters(object $user, string $patientId): void
    {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            
            $encounters = $this->encounterService->getPatientEncounters($patientId, $limit);

            // Log data access
            $this->audit->logRequest($user, $patientId);

            $this->success(['encounters' => $encounters, 'count' => count($encounters)]);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get patient context (meds, allergies, diagnoses)
     * GET /api/encounters/patient/{patientId}/context
     */
    public function getPatientContext(object $user, string $patientId): void
    {
        try {
            $context = $this->encounterService->getPatientContext($patientId);

            $this->success($context);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Update encounter
     * PATCH /api/encounters/{id}
     */
    public function update(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_CREATE_ENCOUNTERS);

            $data = json_decode(file_get_contents('php://input'), true);

            $encounter = $this->encounterService->updateEncounter($id, $data);

            // Log audit trail
            $this->audit->logRequest($user, $encounter['patient_id'] ?? null);

            $this->success($encounter);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Close encounter
     * POST /api/encounters/{id}/close
     */
    public function close(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_CREATE_ENCOUNTERS);

            $encounter = $this->encounterService->closeEncounter($id);

            // Log audit trail
            $this->audit->logRequest($user, $encounter['patient_id'] ?? null);

            $this->success($encounter);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }


    // Response helpers
    private function success(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $message, int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
    }

    private function badRequest(string $message): void
    {
        $this->error($message, 400);
    }
}
