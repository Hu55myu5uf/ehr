<?php

namespace App\Services;

use App\Config\Database;
use App\Services\UserService;
use PDO;

class ProviderService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Get provider record by associated user ID
     */
    public function getProviderByUserId(string $userId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT id, user_id, first_name, last_name, specialty, license_number, npi
                FROM providers 
                WHERE user_id = :user_id 
                AND deleted_at IS NULL 
                LIMIT 1
            ");
            $stmt->execute(['user_id' => $userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ?: null;
        } catch (\Exception $e) {
            error_log("Failed to fetch provider for user {$userId}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all active providers
     */
    public function getAllProviders(): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT id, user_id, first_name, last_name, specialty, credentials
                FROM providers 
                WHERE deleted_at IS NULL 
                ORDER BY first_name ASC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            error_log("Failed to fetch all providers: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Update provider record
     */
    public function updateProvider(string $providerId, array $data): array
    {
        $stmt = $this->db->prepare("SELECT * FROM providers WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $providerId]);
        $provider = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$provider) {
            throw new \InvalidArgumentException("Provider not found");
        }

        $allowedFields = ['first_name', 'last_name', 'specialty', 'credentials', 'license_number', 'npi'];
        $updates = [];
        $params = ['id' => $providerId];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($updates)) {
            return $provider;
        }

        try {
            $query = "UPDATE providers SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            // Fetch updated provider
            $stmt = $this->db->prepare("SELECT * FROM providers WHERE id = :id");
            $stmt->execute(['id' => $providerId]);
            $updatedProvider = $stmt->fetch(PDO::FETCH_ASSOC);

            // Bi-directional name sync to UserService
            if (isset($data['first_name']) || isset($data['last_name'])) {
                $firstName = $data['first_name'] ?? $provider['first_name'];
                $lastName = $data['last_name'] ?? $provider['last_name'];
                $newFullName = trim($firstName . ' ' . ($lastName === 'Provider' ? '' : $lastName));
                
                $userService = new UserService();
                $userService->updateUserFullName($provider['user_id'], $newFullName);
            }

            return $updatedProvider;
        } catch (\Exception $e) {
            throw new \RuntimeException("Failed to update provider: " . $e->getMessage());
        }
    }

    /**
     * Get provider ID by user ID
     */
    public function getProviderIdByUserId(string $userId): ?string
    {
        $provider = $this->getProviderByUserId($userId);
        return $provider ? $provider['id'] : null;
    }
}
