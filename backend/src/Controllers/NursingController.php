<?php

namespace App\Controllers;

use App\Services\NursingService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Config\Roles;

class NursingController
{
    private NursingService $service;
    private ProviderService $providerService;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->service = new NursingService();
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
     * Get active patients with nursing instructions
     * GET /api/nursing/patients
     */
    public function activePatients(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE, Roles::DOCTOR]);
            $patients = $this->service->getActivePatientsWithInstructions();
            $this->success(['patients' => $patients, 'count' => count($patients)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get nursing notes for a patient
     * GET /api/nursing/patient/{patientId}/notes
     */
    public function patientNotes(object $user, string $patientId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE, Roles::DOCTOR]);
            $notes = $this->service->getByPatient($patientId);
            $this->audit->logRequest($user, $patientId);
            $this->success(['notes' => $notes, 'count' => count($notes)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Add a nursing note
     * POST /api/nursing/notes
     */
    public function addNote(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::NURSE]);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['patient_id'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'patient_id is required']);
                return;
            }

            $providerId = $this->providerService->getProviderIdByUserId($user->sub);
            if (!$providerId) {
                $this->error('Provider not found for user', 403);
                return;
            }

            $note = $this->service->addNote($data, $providerId);
            $this->audit->logRequest($user, $data['patient_id']);
            $this->success($note, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
