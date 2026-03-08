<?php

namespace App\Services;

use App\Config\Database;
use App\Config\Roles;
use PDO;
use PDOException;
use Ramsey\Uuid\Uuid;

class InventoryService
{
    private PDO $db;
    private AuditService $auditService;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    /**
     * Get all inventory items
     */
    public function getAllItems(): array
    {
        try {
            $stmt = $this->db->prepare("SELECT * FROM inventory WHERE deleted_at IS NULL ORDER BY item_name ASC");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch inventory: " . $e->getMessage());
        }
    }

    /**
     * Add new inventory item
     */
    public function addItem(array $data, string $userId): array
    {
        try {
            $id = Uuid::uuid4()->toString();
            $stmt = $this->db->prepare("
                INSERT INTO inventory (id, item_name, brand_name, category, quantity, unit, unit_price, min_stock_level, expiry_date)
                VALUES (:id, :name, :brand, :cat, :qty, :unit, :price, :min, :expiry)
            ");

            $stmt->execute([
                'id' => $id,
                'name' => $data['item_name'],
                'brand' => $data['brand_name'] ?? null,
                'cat' => $data['category'] ?? null,
                'qty' => $data['quantity'] ?? 0,
                'unit' => $data['unit'] ?? 'Tabs',
                'price' => $data['unit_price'] ?? 0.00,
                'min' => $data['min_stock_level'] ?? 10,
                'expiry' => $data['expiry_date'] ?? null
            ]);

            $this->auditService->log($userId, null, 'CREATE', 'inventory', $id, ['name' => $data['item_name']], 201);
            
            return $this->getItemById($id);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to add inventory item: " . $e->getMessage());
        }
    }

    /**
     * Update stock level
     */
    public function updateStock(string $id, int $quantity, string $userId): array
    {
        try {
            $item = $this->getItemById($id);
            if (!$item) throw new \InvalidArgumentException("Item not found");

            $stmt = $this->db->prepare("UPDATE inventory SET quantity = :qty, updated_at = NOW() WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $id, 'qty' => $quantity]);

            $this->auditService->log($userId, null, 'UPDATE', 'inventory', $id, [
                'name' => $item['item_name'],
                'old_qty' => $item['quantity'],
                'new_qty' => $quantity
            ], 200);

            return $this->getItemById($id);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to update stock: " . $e->getMessage());
        }
    }

    /**
     * Get item by ID
     */
    public function getItemById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM inventory WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Search inventory items by name or brand
     */
    public function searchItems(string $query): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM inventory 
                WHERE (item_name LIKE :q1 OR brand_name LIKE :q2) 
                  AND deleted_at IS NULL 
                ORDER BY item_name ASC
            ");
            $likeQuery = "%{$query}%";
            $stmt->execute(['q1' => $likeQuery, 'q2' => $likeQuery]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to search inventory: " . $e->getMessage());
        }
    }

    /**
     * Delete an item (Soft delete)
     */
    public function deleteItem(string $id, string $userId): bool
    {
        try {
            $item = $this->getItemById($id);
            if (!$item) throw new \InvalidArgumentException("Item not found");

            $stmt = $this->db->prepare("UPDATE inventory SET deleted_at = NOW() WHERE id = :id");
            $result = $stmt->execute(['id' => $id]);

            if ($result) {
                $this->auditService->log($userId, null, 'DELETE', 'inventory', $id, ['name' => $item['item_name']], 200);
            }

            return $result;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to delete inventory item: " . $e->getMessage());
        }
    }
}
