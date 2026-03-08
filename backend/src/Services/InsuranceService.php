<?php

namespace App\Services;

use App\Config\Database;
use App\Utils\UuidGenerator;
use PDO;

class InsuranceService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    /**
     * Get all insurance providers
     */
    public function getAllProviders(): array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->query("SELECT * FROM insurance_providers ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create insurance provider
     */
    public function createProvider(array $data): array
    {
        $conn = $this->db->getConnection();
        $id = UuidGenerator::generate();
        
        $sql = "INSERT INTO insurance_providers (id, name, email, phone, address, status) 
                VALUES (:id, :name, :email, :phone, :address, :status)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active'
        ]);

        return array_merge(['id' => $id], $data);
    }

    /**
     * Update insurance provider
     */
    public function updateProvider(string $id, array $data): bool
    {
        $conn = $this->db->getConnection();
        
        $sql = "UPDATE insurance_providers 
                SET name = :name, email = :email, phone = :phone, address = :address, status = :status
                WHERE id = :id";
        
        $stmt = $conn->prepare($sql);
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active'
        ]);
    }

    /**
     * Link patient to insurance
     */
    public function linkPatientInsurance(string $patientId, ?string $providerId, ?string $policyNumber): bool
    {
        $conn = $this->db->getConnection();
        
        $sql = "UPDATE patients 
                SET insurance_provider_id = :provider_id, insurance_policy_number = :policy_number
                WHERE id = :id";
        
        $stmt = $conn->prepare($sql);
        return $stmt->execute([
            'id' => $patientId,
            'provider_id' => $providerId,
            'policy_number' => $policyNumber
        ]);
    }

    /**
     * Create an insurance claim from a bill
     */
    public function createClaim(string $billId, string $providerId, float $amount): string
    {
        $conn = $this->db->getConnection();
        $id = UuidGenerator::generate();
        $claimNumber = 'CLM-' . strtoupper(substr($id, 0, 8));

        $sql = "INSERT INTO insurance_claims (id, bill_id, provider_id, claim_number, amount, status) 
                VALUES (:id, :bill_id, :provider_id, :claim_number, :amount, 'pending')";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'bill_id' => $billId,
            'provider_id' => $providerId,
            'claim_number' => $claimNumber,
            'amount' => $amount
        ]);

        return $id;
    }

    /**
     * Get claims report
     */
    public function getClaimsReport(?string $providerId = null, ?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "1=1";
        $params = [];

        if ($providerId) {
            $where .= " AND c.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        if ($startDate) {
            $where .= " AND c.created_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        }

        if ($endDate) {
            $where .= " AND c.created_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "SELECT c.*, p.name as provider_name, b.bill_number, pat.first_name, pat.last_name
                FROM insurance_claims c
                JOIN insurance_providers p ON c.provider_id = p.id
                JOIN bills b ON c.bill_id = b.id
                JOIN patients pat ON b.patient_id = pat.id
                WHERE $where
                ORDER BY c.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
