<?php

namespace App\Controllers;

use App\Services\WardService;
use App\Config\Roles;

class WardController
{
    private WardService $wardService;

    public function __construct()
    {
        $this->wardService = new WardService();
    }

    private function success($data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $msg, int $code = 400): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $msg]);
    }

    public function index(object $user)
    {
        if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE, Roles::RECEPTIONIST])) {
            $this->error('Unauthorized', 403);
            return;
        }
        $this->success($this->wardService->getWards());
    }

    public function beds(string $wardId, object $user)
    {
        if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE, Roles::RECEPTIONIST])) {
            $this->error('Unauthorized', 403);
            return;
        }
        $this->success($this->wardService->getWardBeds($wardId));
    }

    public function admit(object $user)
    {
        if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE])) {
            $this->error('Unauthorized', 403);
            return;
        }
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $this->wardService->admitToWard($input);
            $this->success(['id' => $id, 'message' => 'Patient admitted successfully'], 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function discharge(string $admissionId, object $user)
    {
        if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR])) {
            $this->error('Unauthorized', 403);
            return;
        }
        try {
            $this->wardService->dischargeFromWard($admissionId);
            $this->success(['message' => 'Patient discharged successfully']);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
