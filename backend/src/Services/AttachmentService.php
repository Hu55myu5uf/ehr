<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class AttachmentService
{
    private Database $db;
    private AuditService $auditService;
    private string $uploadDir;

    public function __construct()
    {
        $this->db = new Database();
        $this->auditService = new AuditService();
        $this->uploadDir = __DIR__ . '/../../public/uploads/attachments/';
    }

    public function upload(string $encounterId, array $file, string $userId): array
    {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!in_array($file['type'], $allowedTypes)) {
            throw new \InvalidArgumentException('Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.');
        }

        if ($file['size'] > 10 * 1024 * 1024) {
            throw new \InvalidArgumentException('File size exceeds 10MB limit.');
        }

        $id = Uuid::uuid4()->toString();
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = $id . '.' . $extension;
        $filePath = 'uploads/attachments/' . $fileName;
        $targetPath = $this->uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new \RuntimeException('Failed to save uploaded file');
        }

        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            INSERT INTO encounter_attachments (id, encounter_id, file_path, file_name, file_type, size_bytes, uploaded_by)
            VALUES (:id, :eid, :path, :name, :type, :size, :by)
        ");

        $stmt->execute([
            'id' => $id,
            'eid' => $encounterId,
            'path' => $filePath,
            'name' => $file['name'],
            'type' => $file['type'],
            'size' => $file['size'],
            'by' => $userId
        ]);

        $this->auditService->log($userId, null, 'UPLOAD', 'encounter_attachment', $id, ['file_name' => $file['name']], 201);

        return $this->getById($id);
    }

    public function getById(string $id): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM encounter_attachments WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $res = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $res ?: null;
    }

    public function getByEncounterId(string $encounterId): array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT a.*, u.username as uploaded_by_name 
            FROM encounter_attachments a
            JOIN users u ON a.uploaded_by = u.id
            WHERE a.encounter_id = :eid 
            ORDER BY a.uploaded_at DESC
        ");
        $stmt->execute(['eid' => $encounterId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function delete(string $id, string $userId): bool
    {
        $attachment = $this->getById($id);
        if (!$attachment) return false;

        $targetPath = __DIR__ . '/../../public/' . $attachment['file_path'];
        if (file_exists($targetPath)) {
            unlink($targetPath);
        }

        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("DELETE FROM encounter_attachments WHERE id = :id");
        $result = $stmt->execute(['id' => $id]);

        if ($result) {
            $this->auditService->log($userId, null, 'DELETE', 'encounter_attachment', $id, ['file_name' => $attachment['file_name']], 200);
        }

        return $result;
    }
}
