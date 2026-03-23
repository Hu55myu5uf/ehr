<?php
require __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Services\EncryptionService;

try {
    $dsn = "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_NAME'] . ";port=" . ($_ENV['DB_PORT'] ?? '3306');
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_USER'] === 'root' && empty($_ENV['DB_PASS']) ? '' : $_ENV['DB_PASS']);
    
    $password = 'P@ssword@123';
    $hash = EncryptionService::hashPassword($password);
    
    $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash, is_active = 1, mfa_enabled = 0 WHERE username = :username");
    $result = $stmt->execute(['hash' => $hash, 'username' => 'admin@ehr']);
    
    if ($result) {
        echo "Password for admin@ehr reset to 'password'\n";
    } else {
        echo "Failed to reset password\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
