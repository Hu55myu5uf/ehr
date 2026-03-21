<?php

namespace App\Controllers;

use App\Services\AuditService;

class AuditController
{
    private AuditService $auditService;

    public function __construct()
    {
        $this->auditService = new AuditService();
    }

    /**
     * Get system logs
     */
    public function index(object $user): void
    {
        // Only super_admin can view audit logs
        if (($user->role ?? '') !== 'super_admin') {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden: Insufficient permissions']);
            return;
        }

        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        
        $filters = [
            'user_id' => $_GET['user_id'] ?? null,
            'patient_id' => $_GET['patient_id'] ?? null,
            'action' => $_GET['action'] ?? null,
            'entity_type' => $_GET['entity_type'] ?? null,
        ];

        try {
            $data = $this->auditService->getLogs($page, $limit, $filters);
            
            header('Content-Type: application/json');
            echo json_encode($data);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch audit logs', 'message' => $e->getMessage()]);
        }
    }
}
