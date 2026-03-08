<?php

namespace App\Middleware;

use App\Config\Database;

class AuditMiddleware
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Log API request for audit trail
     */
    public function logRequest(?object $user, ?string $patientId = null): void
    {
        if (!($_ENV['AUDIT_ENABLED'] ?? true)) {
            return;
        }

        $conn = $this->db->getConnection();
        
        try {
            $stmt = $conn->prepare("
                INSERT INTO audit_logs 
                (user_id, patient_id, action, entity_type, entity_id, ip_address, 
                 user_agent, request_method, request_url, request_data, response_status)
                VALUES (:user_id, :patient_id, :action, :entity_type, :entity_id, :ip, 
                        :user_agent, :method, :url, :data, :status)
            ");

            $method = $_SERVER['REQUEST_METHOD'];
            $uri = $_SERVER['REQUEST_URI'];
            $action = $this->determineAction($method, $uri);
            $entityType = $this->determineEntityType($uri);

            // Get request data (sanitized)
            $requestData = $this->getRequestData();

            $stmt->execute([
                'user_id' => $user->sub ?? null,
                'patient_id' => $patientId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $this->extractEntityId($uri),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'method' => $method,
                'url' => $uri,
                'data' => json_encode($requestData),
                'status' => http_response_code()
            ]);
        } catch (\Exception $e) {
            error_log("Audit logging failed: " . $e->getMessage());
        }
    }

    /**
     * Determine action from HTTP method and URI
     */
    private function determineAction(string $method, string $uri): string
    {
        $actions = [
            'GET' => 'READ',
            'POST' => 'CREATE',
            'PUT' => 'UPDATE',
            'PATCH' => 'UPDATE',
            'DELETE' => 'DELETE'
        ];

        return $actions[$method] ?? 'UNKNOWN';
    }

    /**
     * Determine entity type from URI
     */
    private function determineEntityType(string $uri): string
    {
        if (preg_match('/\/patients/', $uri)) return 'patient';
        if (preg_match('/\/encounters/', $uri)) return 'encounter';
        if (preg_match('/\/notes/', $uri)) return 'clinical_note';
        if (preg_match('/\/medications/', $uri)) return 'medication';
        if (preg_match('/\/auth/', $uri)) return 'auth';
        
        return 'unknown';
    }

    /**
     * Extract entity ID from URI
     */
    private function extractEntityId(string $uri): ?string
    {
        // Match UUID pattern in URI
        if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i', $uri, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Get sanitized request data (remove sensitive fields)
     */
    private function getRequestData(): array
    {
        $data = [];
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $data = $_GET;
        } else {
            $input = file_get_contents('php://input');
            if ($input) {
                $data = json_decode($input, true) ?? [];
            }
        }

        // Remove sensitive fields from audit log
        $sensitiveFields = ['password', 'password_hash', 'nin', 'token', 'secret'];
        foreach ($sensitiveFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = '[REDACTED]';
            }
        }

        return $data;
    }
}
