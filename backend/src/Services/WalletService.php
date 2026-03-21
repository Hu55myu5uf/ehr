<?php
namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class WalletService {
    private Database $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function deposit(string $patientId, float $amount, string $method, ?string $description, ?string $createdBy): array {
        $conn = $this->db->getConnection();
        $conn->beginTransaction();
        try {
            $transactionId = Uuid::uuid4()->toString();
            
            // Log transaction
            $stmt = $conn->prepare("
                INSERT INTO wallet_transactions (id, patient_id, amount, type, method, description, created_by)
                VALUES (:id, :pid, :amt, 'deposit', :method, :desc, :cb)
            ");
            $stmt->execute([
                'id' => $transactionId,
                'pid' => $patientId,
                'amt' => $amount,
                'method' => $method,
                'desc' => $description,
                'cb' => $createdBy
            ]);

            // Update patient balance
            $stmt = $conn->prepare("UPDATE patients SET wallet_balance = wallet_balance + :amt WHERE id = :id");
            $stmt->execute(['amt' => $amount, 'id' => $patientId]);

            $conn->commit();
            return ['id' => $transactionId, 'amount' => $amount, 'patient_id' => $patientId];
        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    public function deduct(string $patientId, float $amount, string $billId, ?string $createdBy): array {
        $conn = $this->db->getConnection();
        
        $conn->beginTransaction();
        try {
            // Check balance inside transaction so FOR UPDATE lock is actually held
            $stmt = $conn->prepare("SELECT wallet_balance FROM patients WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $patientId]);
            $patient = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$patient || $patient['wallet_balance'] < $amount) {
                $conn->rollBack();
                throw new \RuntimeException('Insufficient wallet balance');
            }

            $transactionId = Uuid::uuid4()->toString();
            
            // Log transaction
            $stmt = $conn->prepare("
                INSERT INTO wallet_transactions (id, patient_id, amount, type, method, reference_id, description, created_by)
                VALUES (:id, :pid, :amt, 'payment', 'wallet', :ref, 'Bill Payment', :cb)
            ");
            $stmt->execute([
                'id' => $transactionId,
                'pid' => $patientId,
                'amt' => -$amount,
                'ref' => $billId,
                'cb' => $createdBy
            ]);

            // Update patient balance
            $stmt = $conn->prepare("UPDATE patients SET wallet_balance = wallet_balance - :amt WHERE id = :id");
            $stmt->execute(['amt' => $amount, 'id' => $patientId]);

            $conn->commit();
            return ['id' => $transactionId, 'amount' => $amount];
        } catch (\Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    }

    public function getHistory(string $patientId): array {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM wallet_transactions WHERE patient_id = :pid ORDER BY created_at DESC");
        $stmt->execute(['pid' => $patientId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getBalance(string $patientId): float {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT wallet_balance FROM patients WHERE id = :pid");
        $stmt->execute(['pid' => $patientId]);
        return (float)($stmt->fetchColumn() ?: 0.00);
    }
}
