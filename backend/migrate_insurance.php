<?php
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = App\Config\Database::getInstance()->getConnection();

$queries = [
    // Create insurance_providers table
    "CREATE TABLE IF NOT EXISTS insurance_providers (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // Create insurance_claims table
    "CREATE TABLE IF NOT EXISTS insurance_claims (
        id CHAR(36) PRIMARY KEY,
        bill_id CHAR(36) NOT NULL,
        provider_id CHAR(36) NOT NULL,
        claim_number VARCHAR(100) UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(bill_id),
        INDEX(provider_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // Update patients table
    "ALTER TABLE patients 
        ADD COLUMN IF NOT EXISTS insurance_provider_id CHAR(36) NULL AFTER last_name,
        ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100) NULL AFTER insurance_provider_id,
        ADD INDEX IF NOT EXISTS (insurance_provider_id);",

    // Update bills table
    "ALTER TABLE bills 
        ADD COLUMN IF NOT EXISTS insurance_portion DECIMAL(10,2) DEFAULT 0.00 AFTER total_amount,
        ADD COLUMN IF NOT EXISTS patient_portion DECIMAL(10,2) DEFAULT 0.00 AFTER insurance_portion;",

    // Update price_list table to support insurance-specific pricing
    "ALTER TABLE price_list 
        ADD COLUMN IF NOT EXISTS insurance_provider_id CHAR(36) NULL AFTER price,
        ADD INDEX IF NOT EXISTS (insurance_provider_id);"
];

foreach ($queries as $sql) {
    try {
        $db->exec($sql);
        echo "Executed: " . substr($sql, 0, 50) . "...\n";
    } catch (Exception $e) {
        echo "Error executing query: " . $e->getMessage() . "\n";
    }
}
echo "Migrations completed.\n";
