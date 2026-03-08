<?php
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$_ENV['DB_NAME'] = 'ehrecords';

$host = $_ENV['DB_HOST'] ?? 'localhost';
$db   = $_ENV['DB_NAME'];
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASS'] ?? '';

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    echo "Creating clinical_monitoring table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS clinical_monitoring (
            id CHAR(36) PRIMARY KEY,
            encounter_id CHAR(36) NOT NULL,
            patient_id CHAR(36) NOT NULL,
            recorded_by CHAR(36) NOT NULL,
            
            temp DECIMAL(5,2) NULL,
            bp_sys INT NULL,
            bp_dia INT NULL,
            hr INT NULL,
            rr INT NULL,
            spo2 INT NULL,
            
            intake_ml INT NULL,
            output_ml INT NULL,
            output_type ENUM('urine', 'drain', 'vomitus', 'other') DEFAULT 'urine',
            
            notes TEXT NULL,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (recorded_by) REFERENCES providers(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    
    echo "Migration successful!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
