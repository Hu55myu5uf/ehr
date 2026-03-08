<?php

namespace App\Controllers;

use App\Services\AttachmentService;

class AttachmentController
{
    private AttachmentService $attachmentService;

    public function __construct()
    {
        $this->attachmentService = new AttachmentService();
    }

    /**
     * Upload an attachment
     * POST /api/attachments
     */
    public function upload(array $user): void
    {
        try {
            $encounterId = $_POST['encounter_id'] ?? null;
            if (!$encounterId) {
                http_response_code(400);
                echo json_encode(['error' => 'Encounter ID is required']);
                return;
            }

            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => 'No file uploaded']);
                return;
            }

            $attachment = $this->attachmentService->upload($encounterId, $_FILES['file'], $user['id']);
            http_response_code(201);
            echo json_encode($attachment);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            error_log("Attachment Upload Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error during upload']);
        }
    }

    /**
     * Get attachments for an encounter
     * GET /api/attachments/encounter/{encounterId}
     */
    public function getByEncounter(array $user, string $encounterId): void
    {
        try {
            $attachments = $this->attachmentService->getByEncounterId($encounterId);
            http_response_code(200);
            echo json_encode($attachments);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch attachments']);
        }
    }

    /**
     * Delete an attachment
     * DELETE /api/attachments/{id}
     */
    public function delete(array $user, string $id): void
    {
        try {
            if ($this->attachmentService->delete($id, $user['id'])) {
                http_response_code(200);
                echo json_encode(['message' => 'Attachment deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Attachment not found']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete attachment']);
        }
    }
}
