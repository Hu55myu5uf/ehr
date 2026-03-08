<?php

namespace App\Controllers;

use App\Services\ClinicalNoteService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class ClinicalNoteController
{
    private ClinicalNoteService $noteService;
    private AuditMiddleware $audit;
    private \App\Services\ProviderService $providerService;

    public function __construct()
    {
        $this->noteService = new ClinicalNoteService();
        $this->audit = new AuditMiddleware();
        $this->providerService = new \App\Services\ProviderService();
    }

    /**
     * Create clinical note
     * POST /api/notes
     */
    public function create(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_CREATE_ENCOUNTERS);

            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['encounter_id']) || empty($data['encounter_id'])) {
                $this->badRequest('encounter_id is required');
                return;
            }

            $providerId = $this->providerService->getProviderIdByUserId($user->sub);

            if (!$providerId) {
                $this->error('Provider not found for user', 403);
                return;
            }

            $note = $this->noteService->createNote($data, $providerId);

            $this->audit->logRequest($user);

            $this->success($note, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get note by ID
     * GET /api/notes/{id}
     */
    public function getById(object $user, string $id): void
    {
        try {
            $note = $this->noteService->getNoteById($id);

            $this->audit->logRequest($user);

            $this->success($note);

        } catch (\Exception $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * Get all notes for an encounter
     * GET /api/notes/encounter/{encounterId}
     */
    public function getEncounterNotes(object $user, string $encounterId): void
    {
        try {
            $notes = $this->noteService->getEncounterNotes($encounterId);

            $this->success(['notes' => $notes, 'count' => count($notes)]);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Update clinical note (only unsigned notes)
     * PUT /api/notes/{id}
     */
    public function update(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_CREATE_ENCOUNTERS);

            $data = json_decode(file_get_contents('php://input'), true);

            $note = $this->noteService->updateNote($id, $data);

            $this->audit->logRequest($user);

            $this->success($note);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Sign clinical note
     * POST /api/notes/{id}/sign
     */
    public function sign(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_SIGN_NOTES);

            $providerId = $this->providerService->getProviderIdByUserId($user->sub);

            if (!$providerId) {
                $this->error('Provider not found for user', 403);
                return;
            }

            $note = $this->noteService->signNote($id, $providerId);

            $this->audit->logRequest($user);

            $this->success($note);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Create amendment to signed note
     * POST /api/notes/{id}/amend
     */
    public function amend(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_SIGN_NOTES);

            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['amendment_reason']) || empty($data['amendment_reason'])) {
                $this->badRequest('amendment_reason is required');
                return;
            }

            $providerId = $this->providerService->getProviderIdByUserId($user->sub);

            if (!$providerId) {
                $this->error('Provider not found for user', 403);
                return;
            }

            $amendment = $this->noteService->createAmendment($id, $data, $providerId);

            $this->audit->logRequest($user);

            $this->success($amendment, 201);

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
