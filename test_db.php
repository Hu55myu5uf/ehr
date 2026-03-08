<?php
require 'backend/vendor/autoload.php';
$db = \App\Config\Database::getInstance()->getConnection();
$stmt = $db->query("SELECT id, medication_name, batch_id, prescription_status, billing_status, inventory_item_id FROM medications WHERE prescription_status IN ('pending', 'dispensed') AND billing_status = 'pending_invoice' LIMIT 10;");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
