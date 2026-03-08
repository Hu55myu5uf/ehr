<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class SettingsService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAllSettings(): array
    {
        $stmt = $this->db->query("SELECT setting_key, setting_value, category, updated_at FROM system_settings");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $settings = [];
        foreach ($results as $row) {
            $settings[$row['setting_key']] = [
                'value' => $row['setting_value'],
                'category' => $row['category'],
                'updated_at' => $row['updated_at']
            ];
        }
        return $settings;
    }

    public function getSetting(string $key, $default = null)
    {
        $stmt = $this->db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $value = $stmt->fetchColumn();
        return $value !== false ? $value : $default;
    }

    public function updateSettings(array $settings): bool
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            foreach ($settings as $key => $value) {
                $stmt->execute([$key, $value]);
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
