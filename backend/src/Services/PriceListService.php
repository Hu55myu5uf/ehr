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

    public function getPriceByItemName(string $name, float $defaultPrice = 0.00): float
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT price FROM price_list WHERE item_name = :name");
        $stmt->execute(['name' => $name]);
        $price = $stmt->fetchColumn();
        return $price !== false ? (float)$price : $defaultPrice;
    }

    public function updatePrice(string $id, float $price): bool
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("UPDATE price_list SET price = :price, updated_at = NOW() WHERE id = :id");
        return $stmt->execute(['price' => $price, 'id' => $id]);
    }

    public function initializePrices(): void
    {
        $conn = $this->db->getConnection();
        $conn->exec("
            CREATE TABLE IF NOT EXISTS price_list (
                id VARCHAR(36) PRIMARY KEY,
                item_type VARCHAR(50) NOT NULL,
                item_name VARCHAR(100) UNIQUE NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                category VARCHAR(50) DEFAULT 'general',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        $prices = [
            ['type' => 'consultation', 'name' => 'Consultation Fee', 'price' => 5000.00, 'cat' => 'Service'],
            // HAEMATOLOGY
            ['type' => 'lab_test', 'name' => 'Fullblood count', 'price' => 2500.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Rbs', 'price' => 1000.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Fbs', 'price' => 1000.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Blood culture', 'price' => 5000.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Blood transfusion', 'price' => 10000.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Blood group', 'price' => 500.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Genotype', 'price' => 1500.00, 'cat' => 'Haematology'],
            ['type' => 'lab_test', 'name' => 'Pcv', 'price' => 500.00, 'cat' => 'Haematology'],
            // SEROLOGY
            ['type' => 'lab_test', 'name' => 'HbsAg', 'price' => 1500.00, 'cat' => 'Serology'],
            ['type' => 'lab_test', 'name' => 'Hcv', 'price' => 2000.00, 'cat' => 'Serology'],
            ['type' => 'lab_test', 'name' => 'Rvs', 'price' => 1500.00, 'cat' => 'Serology'],
            // MICROBIOLOGY
            ['type' => 'lab_test', 'name' => 'Fecal occult blood', 'price' => 2000.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Mcs (Feces)', 'price' => 3500.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Parasitology', 'price' => 1500.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Mcs (Urine)', 'price' => 3500.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Urinalysis', 'price' => 1000.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Urine afb', 'price' => 2500.00, 'cat' => 'Microbiology'],
            ['type' => 'lab_test', 'name' => 'Semen analysis', 'price' => 3000.00, 'cat' => 'Microbiology'],
            // BIOCHEMISTRY
            ['type' => 'lab_test', 'name' => 'Eucr', 'price' => 4000.00, 'cat' => 'Biochemistry'],
            ['type' => 'lab_test', 'name' => 'Bilirubin', 'price' => 2000.00, 'cat' => 'Biochemistry'],
            ['type' => 'lab_test', 'name' => 'Csf biochemisty', 'price' => 5000.00, 'cat' => 'Biochemistry'],
            ['type' => 'lab_test', 'name' => 'Urine biochemistry', 'price' => 3000.00, 'cat' => 'Biochemistry'],
            // MEDICATION
            ['type' => 'medication', 'name' => 'Medication Unit', 'price' => 1500.00, 'cat' => 'Pharmacy'],
        ];

        $stmt = $conn->prepare("INSERT IGNORE INTO price_list (id, item_type, item_name, price, category) VALUES (:id, :type, :name, :price, :cat)");
        foreach ($prices as $p) {
            $stmt->execute([
                'id' => Uuid::uuid4()->toString(),
                'type' => $p['type'],
                'name' => $p['name'],
                'price' => $p['price'],
                'cat' => $p['cat']
            ]);
        }
    }
}
