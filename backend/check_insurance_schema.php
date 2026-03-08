<?php
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = App\Config\Database::getInstance()->getConnection();

$tables = ['patients', 'bills', 'bill_items', 'price_list', 'inventory'];

foreach ($tables as $table) {
    echo "\nTable: $table\n";
    try {
        $stmt = $db->query("DESCRIBE $table");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            echo "  {$column['Field']} ({$column['Type']})\n";
        }
    } catch (Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
}
