<?php

namespace App\Controllers;

use App\Services\MonitoringService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Config\Roles;

class MonitoringController
{
    private MonitoringService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new MonitoringService();
        $this->providerService = new ProviderService();
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
     * POST /api/monitoring
     */
    public function store(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE, Roles::DOCTOR]);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['encounter_id']) || empty($data['patient_id'])) {
                $this->error('encounter_id and patient_id are required', 400);
                return;
            }

            $providerId = $this->providerService->getProviderIdByUserId($user->sub);
            if (!$providerId) {
                $this->error('Provider not found', 403);
                return;
            }

            $record = $this->service->addRecord($data, $providerId);
            $this->success($record, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * GET /api/monitoring/encounter/{encounterId}
     */
    public function getByEncounter(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE, Roles::DOCTOR]);
            $records = $this->service->getByEncounter($encounterId);
            $this->success($records);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
