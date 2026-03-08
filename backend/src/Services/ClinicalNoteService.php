<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class ClinicalNoteService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Create SOAP clinical note
     */
    public function createNote(array $data, string $providerId): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            $id = Uuid::uuid4()->toString();

            $stmt = $conn->prepare("
                INSERT INTO clinical_notes (
                    id, encounter_id, provider_id, note_type,
                    subjective, objective, assessment, plan
                ) VALUES (
                    :id, :encounter_id, :provider_id, :note_type,
                    :subjective, :objective, :assessment, :plan
                )
            ");

            $stmt->execute([
                'id' => $id,
                'encounter_id' => $data['encounter_id'],
                'provider_id' => $providerId,
                'note_type' => $data['note_type'] ?? 'soap',
                'subjective' => $data['subjective'] ?? null,
                'objective' => $data['objective'] ?? null,
                'assessment' => $data['assessment'] ?? null,
                'plan' => $data['plan'] ?? null
            ]);

            $conn->commit();

            return $this->getNoteById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to create clinical note: " . $e->getMessage());
        }
    }

    /**
     * Get clinical note by ID
     */
    public function getNoteById(string $id): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                cn.*,
                pr.first_name as provider_first, pr.last_name as provider_last,
                pr.credentials,
                sp.first_name as signed_by_first, sp.last_name as signed_by_last
            FROM clinical_notes cn
            JOIN providers pr ON cn.provider_id = pr.id
            LEFT JOIN providers sp ON cn.signed_by = sp.id
            WHERE cn.id = :id AND cn.deleted_at IS NULL
        ");
        
        $stmt->execute(['id' => $id]);
        $note = $stmt->fetch();

        if (!$note) {
            throw new \RuntimeException("Clinical note not found");
        }

        return $note;
    }

    /**
     * Get all notes for an encounter
     */
    public function getEncounterNotes(string $encounterId): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                cn.*,
                pr.first_name as provider_first, pr.last_name as provider_last,
                pr.credentials
            FROM clinical_notes cn
            JOIN providers pr ON cn.provider_id = pr.id
            WHERE cn.encounter_id = :encounter_id AND cn.deleted_at IS NULL
            ORDER BY cn.created_at DESC
        ");
        
        $stmt->execute(['encounter_id' => $encounterId]);
        
        return $stmt->fetchAll();
    }

    /**
     * Update clinical note (only if not signed)
     */
    public function updateNote(string $id, array $data): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            // Check if note is already signed
            $checkStmt = $conn->prepare("SELECT is_signed FROM clinical_notes WHERE id = :id");
            $checkStmt->execute(['id' => $id]);
            $note = $checkStmt->fetch();

            if (!$note) {
                throw new \RuntimeException("Clinical note not found");
            }

            if ($note['is_signed']) {
                throw new \RuntimeException("Cannot update signed note. Create an amendment instead.");
            }

            $updates = [];
            $params = ['id' => $id];

            $allowedFields = ['subjective', 'objective', 'assessment', 'plan'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $data[$field];
                }
            }

            if (empty($updates)) {
                throw new \RuntimeException("No valid fields to update");
            }

            $sql = "UPDATE clinical_notes SET " . implode(', ', $updates) . " WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);

            $conn->commit();

            return $this->getNoteById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to update note: " . $e->getMessage());
        }
    }

    /**
     * Sign clinical note
     */
    public function signNote(string $id, string $providerId): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            $stmt = $conn->prepare("
                UPDATE clinical_notes 
                SET is_signed = 1, signed_at = NOW(), signed_by = :provider_id
                WHERE id = :id AND deleted_at IS NULL
            ");
            
            $stmt->execute([
                'id' => $id,
                'provider_id' => $providerId
            ]);

            if ($stmt->rowCount() === 0) {
                throw new \RuntimeException("Note not found or already signed");
            }

            $conn->commit();

            return $this->getNoteById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to sign note: " . $e->getMessage());
        }
    }

    /**
     * Create amendment to signed note
     */
    public function createAmendment(string $originalNoteId, array $data, string $providerId): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            // Verify original note exists and is signed
            $originalStmt = $conn->prepare("
                SELECT * FROM clinical_notes 
                WHERE id = :id AND is_signed = 1 AND deleted_at IS NULL
            ");
            $originalStmt->execute(['id' => $originalNoteId]);
            $original = $originalStmt->fetch();

            if (!$original) {
                throw new \RuntimeException("Original note not found or not signed");
            }

            // Create amendment note
            $id = Uuid::uuid4()->toString();

            $stmt = $conn->prepare("
                INSERT INTO clinical_notes (
                    id, encounter_id, provider_id, note_type,
                    subjective, objective, assessment, plan,
                    is_amended, amendment_reason, original_note_id
                ) VALUES (
                    :id, :encounter_id, :provider_id, :note_type,
                    :subjective, :objective, :assessment, :plan,
                    1, :reason, :original_id
                )
            ");

            $stmt->execute([
                'id' => $id,
                'encounter_id' => $original['encounter_id'],
                'provider_id' => $providerId,
                'note_type' => 'amendment',
                'subjective' => $data['subjective'] ?? null,
                'objective' => $data['objective'] ?? null,
                'assessment' => $data['assessment'] ?? null,
                'plan' => $data['plan'] ?? null,
                'reason' => $data['amendment_reason'],
                'original_id' => $originalNoteId
            ]);

            // Mark original as amended
            $updateStmt = $conn->prepare("
                UPDATE clinical_notes 
                SET is_amended = 1 
                WHERE id = :id
            ");
            $updateStmt->execute(['id' => $originalNoteId]);

            $conn->commit();

            return $this->getNoteById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to create amendment: " . $e->getMessage());
        }
    }
}
