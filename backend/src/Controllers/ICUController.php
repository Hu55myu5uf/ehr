<?php

namespace App\Controllers;

use App\Services\ICUService;
use App\Config\Roles;

class ICUController {
    private ICUService $icuService;

    public function __construct() {
        $this->icuService = new ICUService();
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

    public function index(object $user) {
        try {
            if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE])) {
                $this->error('Forbidden', 403);
                return;
            }
            $beds = $this->icuService->getBeds();
            $this->success($beds);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    public function admit(object $user) {
        try {
            if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR])) {
                $this->error('Forbidden', 403);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $this->icuService->admitPatient($input);
            $this->success(['id' => $id, 'message' => 'Patient admitted to ICU'], 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    public function update(object $user, string $id) {
        try {
            if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR, Roles::NURSE])) {
                $this->error('Forbidden', 403);
                return;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $this->icuService->updateMonitoring($id, $input);
            $this->success(['message' => 'ICU monitoring updated']);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    public function discharge(object $user, string $id) {
        try {
            if (!in_array($user->role, [Roles::SUPER_ADMIN, Roles::DOCTOR])) {
                $this->error('Forbidden', 403);
                return;
            }
            $this->icuService->dischargePatient($id);
            $this->success(['message' => 'Patient discharged from ICU']);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 400);
        }
    }
}
