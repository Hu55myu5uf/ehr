<?php

namespace App\Controllers;

use App\Services\InventoryService;
use App\Middleware\AuthMiddleware;
use App\Config\Roles;

class InventoryController
{
    private InventoryService $service;

    public function __construct()
    {
        $this->service = new InventoryService();
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

    /**
     * GET /api/inventory
     */
    public function index(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::PHARMACIST, Roles::DOCTOR, Roles::NURSE]);
            
            $query = $_GET['q'] ?? null;
            if ($query) {
                $items = $this->service->searchItems($query);
            } else {
                $items = $this->service->getAllItems();
            }
            
            $this->success(['items' => $items, 'count' => count($items)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * POST /api/inventory
     */
    public function store(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::PHARMACIST]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['item_name'])) {
                $this->error('item_name is required', 400);
                return;
            }

            $item = $this->service->addItem($data, $user->sub);
            $this->success($item, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * POST /api/inventory/{id}/update
     */
    public function update(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::PHARMACIST]);
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['quantity'])) {
                $this->error('quantity is required', 400);
                return;
            }

            $item = $this->service->updateStock($id, (int)$data['quantity'], $user->sub);
            $this->success($item);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * DELETE /api/inventory/{id}
     */
    public function delete(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN]);
            
            $this->service->deleteItem($id, $user->sub);
            $this->success(['message' => 'Item deleted successfully']);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
