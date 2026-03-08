<?php

namespace App\Controllers;

use App\Services\PriceListService;
use App\Config\Roles;

class PriceListController
{
    private PriceListService $priceService;

    public function __construct()
    {
        $this->priceService = new PriceListService();
    }

    public function index(object $user): void
    {
        if ($user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode(['prices' => $this->priceService->getPrices()]);
    }

    public function update(object $user): void
    {
        if ($user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['item_type']) || !isset($data['price'])) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid data']);
            return;
        }

        $this->priceService->updatePrice($data['item_type'], (float)$data['price']);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Price updated successfully']);
    }

    public function init(): void
    {
        $this->priceService->initializePrices();
        echo "Prices initialized.";
    }
}
