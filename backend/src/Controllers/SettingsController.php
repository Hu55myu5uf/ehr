<?php

namespace App\Controllers;

use App\Services\SettingsService;
use App\Config\Roles;
use App\Middleware\AuthMiddleware;

class SettingsController
{
    private SettingsService $service;

    public function __construct()
    {
        $this->service = new SettingsService();
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

    public function index(object $user): void
    {
        try {
            // Only Super Admin can view all settings
            if ($user->role !== Roles::SUPER_ADMIN) {
                $this->error('Unauthorized', 403);
                return;
            }

            $this->success($this->service->getAllSettings());
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    public function update(object $user): void
    {
        try {
            // Only Super Admin can update settings
            if ($user->role !== Roles::SUPER_ADMIN) {
                $this->error('Unauthorized', 403);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !is_array($input)) {
                $this->error('Invalid input data');
                return;
            }

            $this->service->updateSettings($input);
            $this->success(['message' => 'Settings updated successfully']);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }
}
