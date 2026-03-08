<?php
namespace App\Controllers;

use App\Services\TreatmentSheetService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Config\Roles;

class TreatmentSheetController
{
    private TreatmentSheetService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new TreatmentSheetService();
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
     * Get or create treatment sheet for an encounter
     * GET /api/treatment-sheets/encounter/{encounterId}
     */
    public function getByEncounter(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE]);
            
            // Check if patient_id is provided in query for creation
            $patientId = $_GET['patient_id'] ?? null;
            
            if ($patientId === null || $patientId === '') {
                $sheet = $this->service->getSheetByEncounter($encounterId);
                if (empty($sheet)) {
                    $this->error('Treatment sheet not found and patient_id missing for creation', 400);
                    return;
                }
            } else {
                $sheet = $this->service->getOrCreateSheet($encounterId, $patientId);
            }
            
            $this->success($sheet);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Add medication to treatment sheet
     * POST /api/treatment-sheets/{sheetId}/medications
     */
    public function addMedication(object $user, string $sheetId): void
    {
        try {
            // Allow nurses to add medications as well (verbal orders / transcriptions)
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            $doctorId = $this->providerService->getProviderIdByUserId($user->sub);
            if (!$doctorId) {
                $this->error('Provider not found', 403);
                return;
            }

            $result = $this->service->addMedication($sheetId, $data, $doctorId);
            $this->success($result, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Record medication administration
     * POST /api/treatment-sheets/medications/{medId}/administer
     */
    public function administer(object $user, string $medId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            $nurseId = $this->providerService->getProviderIdByUserId($user->sub);
            if (!$nurseId) {
                $this->error('Provider not found', 403);
                return;
            }

            $result = $this->service->recordAdministration($medId, $data, $nurseId);
            $this->success($result, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
