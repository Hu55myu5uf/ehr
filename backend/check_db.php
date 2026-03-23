<?php
require __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    $dsn = "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_NAME'] . ";port=" . ($_ENV['DB_PORT'] ?? '3306');
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_USER'] === 'root' && empty($_ENV['DB_PASS']) ? '' : $_ENV['DB_PASS']);
    echo "Connected successfully to " . $_ENV['DB_NAME'] . "\n";
    
    $stmt = $pdo->query("SELECT id, username, role, is_active FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Users found: " . count($users) . "\n";
    foreach ($users as $user) {
        echo "- " . $user['username'] . " (" . $user['role'] . ") status: " . ($user['is_active'] ? 'active' : 'inactive') . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
