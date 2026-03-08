<?php

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/Config/Database.php';

// Manual .env loader
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

use App\Config\Database;

function migrate() {
    $db = Database::getInstance()->getConnection();
    echo "Starting System Settings Migration...\n";

    try {
        // 1. Create system_settings table
        $sql = "CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            category VARCHAR(50) DEFAULT 'general',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $db->exec($sql);
        echo "Table 'system_settings' created or already exists.\n";

        // 2. Insert initial settings
        $settings = [
            ['session_timeout', '30', 'security'],
            ['hospital_name', 'EHR Health', 'general'],
            ['hospital_currency', '₦', 'general'],
            ['hospital_address', '123 Medical Way, Healthcare City', 'general'],
            ['system_timezone', 'Africa/Lagos', 'general'],
            ['maintenance_mode', 'false', 'security']
        ];

        $stmt = $db->prepare("INSERT IGNORE INTO system_settings (setting_key, setting_value, category) VALUES (?, ?, ?)");
        foreach ($settings as $s) {
            $stmt->execute($s);
        }
        echo "Initial settings seeded.\n";

        echo "Migration completed successfully.\n";

    } catch (\Exception $e) {
        echo "Migration Error: " . $e->getMessage() . "\n";
    }
}

migrate();
