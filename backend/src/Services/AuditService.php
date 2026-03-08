<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class AuditService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Log an action to the audit trail
     *
     * @param string|null $userId User performing the action
     * @param string|null $patientId Patient ID related to the action
     * @param string $action CREATE, READ, UPDATE, DELETE, etc.
     * @param string $entityType patient, encounter, lab_order, etc.
     * @param string|null $entityId ID of the entity being acted upon
     * @param array|null $data Additional context/data (will be JSON encoded)
     * @param int|null $status HTTP response status or custom status code
     * @return bool
     */
    public function log(?string $userId, ?string $patientId, string $action, string $entityType, ?string $entityId, ?array $data = null, ?int $status = null): bool
    {
        if (!($_ENV['AUDIT_ENABLED'] ?? true)) {
            return true;
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs 
                (user_id, patient_id, action, entity_type, entity_id, ip_address, 
                 user_agent, request_method, request_url, request_data, response_status)
                VALUES (:user_id, :patient_id, :action, :entity_type, :entity_id, :ip, 
                        :user_agent, :method, :url, :data, :status)
            ");

            return $stmt->execute([
                'user_id' => $userId,
                'patient_id' => $patientId,
                'action' => strtoupper($action),
                'entity_type' => strtolower($entityType),
                'entity_id' => $entityId,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'System/Internal',
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'INTERNAL',
                'url' => $_SERVER['REQUEST_URI'] ?? 'INTERNAL',
                'data' => $data ? json_encode($data) : null,
                'status' => $status
            ]);
        } catch (\Exception $e) {
            error_log("Service Audit logging failed: " . $e->getMessage());
            return false;
        }
    }
}
