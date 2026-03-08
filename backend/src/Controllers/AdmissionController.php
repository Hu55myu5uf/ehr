<?php

namespace App\Controllers;

use App\Services\AdmissionService;
use App\Middleware\AuthMiddleware;

class AdmissionController
{
    private AdmissionService $admissionService;

    public function __construct()
    {
        $this->admissionService = new AdmissionService();
    }

    /**
     * GET /api/admissions
     */
    public function index(object $user): void
    {
        if (!in_array($user->role, ['super_admin', 'doctor', 'nurse'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized access to admissions']);
            return;
        }

        try {
            $patients = $this->admissionService->getAdmittedPatients();
            echo json_encode(['admissions' => $patients]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/admissions/{id}/activity
     */
    public function activity(string $encounterId, object $user): void
    {
        if (!in_array($user->role, ['super_admin', 'doctor', 'nurse'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized access to admission activity']);
            return;
        }

        try {
            $activity = $this->admissionService->getAdmissionActivity($encounterId);
            echo json_encode(['activity' => $activity]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/admissions/history
     */
    public function history(object $user): void
    {
        if (!in_array($user->role, ['super_admin', 'doctor', 'nurse'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized access to admission history']);
            return;
        }

        try {
            $limit = (int)($_GET['limit'] ?? 50);
            $patients = $this->admissionService->getDischargedPatients($limit);
            echo json_encode(['history' => $patients]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
