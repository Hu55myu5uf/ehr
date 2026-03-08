<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class PriceListService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    public function getPrices(): array
    {
        $conn = $this->db->getConnection();
        return $conn->query("SELECT * FROM price_list")->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getPriceByType(string $type): float
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT price FROM price_list WHERE item_type = :type");
        $stmt->execute(['type' => $type]);
        $price = $stmt->fetchColumn();
        return $price !== false ? (float)$price : 0.00;
    }

    public function updatePrice(string $type, float $price): bool
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("UPDATE price_list SET price = :price, updated_at = NOW() WHERE item_type = :type");
        return $stmt->execute(['price' => $price, 'type' => $type]);
    }

    public function initializePrices(): void
    {
        $conn = $this->db->getConnection();
        $conn->exec("
            CREATE TABLE IF NOT EXISTS price_list (
                id VARCHAR(36) PRIMARY KEY,
                item_type VARCHAR(50) UNIQUE NOT NULL,
                item_name VARCHAR(100) NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        $prices = [
            ['id' => Uuid::uuid4()->toString(), 'type' => 'consultation', 'name' => 'Consultation Fee', 'price' => 5000.00],
            ['id' => Uuid::uuid4()->toString(), 'type' => 'lab_test', 'name' => 'Laboratory Test', 'price' => 2500.00],
            ['id' => Uuid::uuid4()->toString(), 'type' => 'medication', 'name' => 'Medication Unit', 'price' => 1500.00],
        ];

        $stmt = $conn->prepare("INSERT IGNORE INTO price_list (id, item_type, item_name, price) VALUES (:id, :type, :name, :price)");
        foreach ($prices as $p) {
            $stmt->execute($p);
        }
    }
}
