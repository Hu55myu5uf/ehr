<?php

namespace App\Controllers;

use App\Services\ProviderService;
use App\Config\Roles;

class ProviderController
{
    private ProviderService $service;

    public function __construct()
    {
        $this->service = new ProviderService();
    }

    /**
     * List all providers
     * GET /api/providers
     */
    public function index(object $user): void
    {
        // Any staff can view providers list
        if (!in_array($user->role, Roles::CAN_VIEW_PATIENTS)) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $providers = $this->service->getAllProviders();
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode(['providers' => $providers]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Update provider details
     * PUT /api/providers/{id}
     */
    public function update(object $user, string $providerId): void
    {
        // Only Super Admin or the provider themselves can update
        // (Assuming we can fetch the provider to check user_id)
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $provider = $this->service->getProviderByUserId($user->id);
            $isOwnProfile = $provider && $provider['id'] === $providerId;

            if ($user->role !== Roles::SUPER_ADMIN && !$isOwnProfile) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }

            $updatedProvider = $this->service->updateProvider($providerId, $input);
            http_response_code(200);
            echo json_encode(['message' => 'Provider updated successfully', 'provider' => $updatedProvider]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
