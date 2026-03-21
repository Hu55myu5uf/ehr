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

    /**
     * Get audit logs with pagination and filters
     */
    public function getLogs(int $page = 1, int $limit = 50, array $filters = []): array
    {
        $offset = ($page - 1) * $limit;
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['user_id'])) {
            $where[] = "l.user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "l.patient_id = :patient_id";
            $params['patient_id'] = $filters['patient_id'];
        }

        if (!empty($filters['action'])) {
            $where[] = "l.action = :action";
            $params['action'] = strtoupper($filters['action']);
        }

        if (!empty($filters['entity_type'])) {
            $where[] = "l.entity_type = :entity_type";
            $params['entity_type'] = strtolower($filters['entity_type']);
        }

        $whereClause = implode(" AND ", $where);

        // Get count
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM audit_logs l WHERE $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Get records
        $stmt = $this->db->prepare("
            SELECT l.*, 
                   u.username as operator_username, u.full_name as operator_name, u.role as operator_role,
                   p.first_name as patient_first, p.last_name as patient_last
            FROM audit_logs l
            LEFT JOIN users u ON l.user_id = u.id
            LEFT JOIN patients p ON l.patient_id = p.id
            WHERE $whereClause
            ORDER BY l.created_at DESC
            LIMIT :limit OFFSET :offset
        ");

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val);
        }
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'logs' => $logs,
            'total' => $total,
            'page' => $page,
            'last_page' => ceil($total / $limit)
        ];
    }
}
