<?php

namespace App\Controllers;

use App\Services\AppointmentService;
use App\Services\ProviderService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Config\Roles;

class AppointmentController
{
    private AppointmentService $service;
    private ProviderService $providerService;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->service = new AppointmentService();
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

    private function badRequest(string $msg): void
    {
        $this->error($msg, 400);
    }

    /**
     * Book a new appointment
     * POST /api/appointments
     */
    public function create(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, Roles::ADMIN_STAFF);

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['patient_id'])) {
                $this->badRequest('patient_id is required');
                return;
            }
            if (empty($data['appointment_date'])) {
                $this->badRequest('appointment_date is required');
                return;
            }

            $appointment = $this->service->createAppointment($data, $user->sub);
            $this->audit->logRequest($user, $data['patient_id']);
            $this->success($appointment, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * List appointments (with optional filters)
     * GET /api/appointments?date=YYYY-MM-DD&status=scheduled&provider_id=xxx
     */
    public function index(object $user): void
    {
        try {
            $filters = [
                'date' => $_GET['date'] ?? null,
                'status' => $_GET['status'] ?? null,
                'provider_id' => $_GET['provider_id'] ?? null,
                'patient_id' => $_GET['patient_id'] ?? null,
                'limit' => $_GET['limit'] ?? 50,
                'offset' => $_GET['offset'] ?? 0,
            ];
            $filters = array_filter($filters, fn($v) => $v !== null);

            $appointments = $this->service->listAppointments($filters);
            $this->success(['appointments' => $appointments, 'count' => count($appointments)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get today's appointment queue
     * GET /api/appointments/today
     */
    public function today(object $user): void
    {
        try {
            // Doctors see only their own queue
            $providerId = null;
            if ($user->role === Roles::DOCTOR) {
                $providerId = $this->providerService->getProviderIdByUserId($user->sub);
            }
            $queue = $this->service->getTodaysQueue($providerId);
            $this->success(['appointments' => $queue, 'count' => count($queue)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Update appointment status
     * PATCH /api/appointments/{id}/status
     */
    public function updateStatus(object $user, string $id): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['status'])) {
                $this->badRequest('status is required');
                return;
            }

            if ($data['status'] === 'in_progress') {
                $appointment = $this->service->startAppointment($id, $user->sub);
            } else {
                $appointment = $this->service->updateStatus($id, $data['status'], $data['encounter_id'] ?? null);
            }
            
            $this->audit->logRequest($user);
            $this->success($appointment);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get single appointment
     * GET /api/appointments/{id}
     */
    public function show(object $user, string $id): void
    {
        try {
            $appointment = $this->service->getAppointmentById($id);
            if (!$appointment) {
                $this->error('Appointment not found', 404);
                return;
            }
            $this->success($appointment);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
