<?php

namespace App\Controllers;

use App\Services\ConsultationService;
use App\Services\EncounterService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Config\Roles;

class ConsultationController
{
    private ConsultationService $service;
    private EncounterService $encounterService;
    private ProviderService $providerService;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->service = new ConsultationService();
        $this->encounterService = new EncounterService();
        $this->providerService = new ProviderService();
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
     * Get full consultation view
     * GET /api/consultations/{encounterId}
     */
    public function show(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, array_merge(Roles::CLINICAL_STAFF, Roles::ADMIN_STAFF));
            $data = $this->service->getFullConsultation($encounterId);
            $this->audit->logRequest($user, $data['encounter']['patient_id'] ?? null);
            $this->success($data);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Save consultation details
     * PUT /api/consultations/{encounterId}
     */
    public function save(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::DOCTOR]);
            $data = json_decode(file_get_contents('php://input'), true);
            $result = $this->service->save($encounterId, $data);
            $this->audit->logRequest($user);
            $this->success($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Complete a consultation — finalize encounter
     * POST /api/consultations/{encounterId}/complete
     */
    public function complete(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::DOCTOR]);

            // Save any final details
            $data = json_decode(file_get_contents('php://input'), true);
            if ($data) {
                $this->service->save($encounterId, $data);
            }

            // Close the encounter
            $this->encounterService->closeEncounter($encounterId);

            $this->audit->logRequest($user);
            $this->success(['message' => 'Consultation completed', 'encounter_id' => $encounterId]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * List consultations for a doctor
     * GET /api/consultations?status=in_progress
     */
    public function index(object $user): void
    {
        try {
            $status = $_GET['status'] ?? null;
            $limit = (int)($_GET['limit'] ?? 50);
            $offset = (int)($_GET['offset'] ?? 0);

            $providerId = null;
            $viewAll = isset($_GET['all']) && $_GET['all'] === 'true';

            if ($user->role === Roles::DOCTOR && !$viewAll) {
                $providerId = $this->providerService->getProviderIdByUserId($user->sub);
            }

            $encounters = $this->encounterService->listEncounters($providerId, $status, $limit, $offset);
            $this->success(['consultations' => $encounters, 'count' => count($encounters)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
