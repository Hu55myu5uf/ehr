<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class PatientService
{
    private Database $db;
    private EncryptionService $encryption;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->encryption = new EncryptionService();
    }

    /**
     * Register new patient
     */
    public function registerPatient(array $data): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            // Generate MRN (Medical Record Number)
            $mrn = $this->generateMRN();

            // Encrypt sensitive data
            $encryptedNIN = !empty($data['nin']) 
                ? $this->encryption->encrypt($data['nin']) 
                : null;

            $id = Uuid::uuid4()->toString();

            $stmt = $conn->prepare("
                INSERT INTO patients (
                    id, mrn, first_name, middle_name, last_name, date_of_birth, gender,
                    nin, phone, email, address_line1, address_line2, city, state, zip_code,
                    country, emergency_contact_name, emergency_contact_phone, 
                    emergency_contact_relationship, primary_language,
                    race, ethnicity, marital_status
                ) VALUES (
                    :id, :mrn, :first_name, :middle_name, :last_name, :dob, :gender,
                    :nin, :phone, :email, :address1, :address2, :city, :state, :zip,
                    :country, :emergency_name, :emergency_phone, :emergency_relationship,
                    :language, :race, :ethnicity, :marital_status
                )
            ");

            $stmt->execute([
                'id' => $id,
                'mrn' => $mrn,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'dob' => $data['date_of_birth'],
                'gender' => $data['gender'],
                'nin' => $encryptedNIN,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'address1' => $data['address_line1'] ?? null,
                'address2' => $data['address_line2'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'zip' => $data['zip_code'] ?? null,
                'country' => $data['country'] ?? 'USA',
                'emergency_name' => $data['emergency_contact_name'] ?? null,
                'emergency_phone' => $data['emergency_contact_phone'] ?? null,
                'emergency_relationship' => $data['emergency_contact_relationship'] ?? null,
                'language' => $data['primary_language'] ?? 'English',
                'race' => $data['race'] ?? null,
                'ethnicity' => $data['ethnicity'] ?? null,
                'marital_status' => $data['marital_status'] ?? null
            ]);

            $conn->commit();

            return $this->getPatientById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to register patient: " . $e->getMessage());
        }
    }

    /**
     * Get patient by ID
     */
    public function getPatientById(string $id, bool $maskSensitive = true): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT * FROM patients 
            WHERE id = :id AND deleted_at IS NULL
        ");
        
        $stmt->execute(['id' => $id]);
        $patient = $stmt->fetch();

        if (!$patient) {
            throw new \RuntimeException("Patient not found");
        }

        return $this->formatPatient($patient, $maskSensitive);
    }

    /**
     * Search patients
     */
    public function searchPatients(array $criteria): array
    {
        $conn = $this->db->getConnection();
        
        $where = ['deleted_at IS NULL'];
        $params = [];

        if (!empty($criteria['mrn'])) {
            $where[] = 'mrn = :mrn';
            $params['mrn'] = $criteria['mrn'];
        }

        if (!empty($criteria['last_name'])) {
            $where[] = 'last_name LIKE :last_name';
            $params['last_name'] = '%' . $criteria['last_name'] . '%';
        }

        if (!empty($criteria['first_name'])) {
            $where[] = 'first_name LIKE :first_name';
            $params['first_name'] = '%' . $criteria['first_name'] . '%';
        }

        if (!empty($criteria['date_of_birth'])) {
            $where[] = 'date_of_birth = :dob';
            $params['dob'] = $criteria['date_of_birth'];
        }

        $sql = "SELECT * FROM patients WHERE " . implode(' AND ', $where) . " ORDER BY last_name, first_name LIMIT 50";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $patients = [];
        while ($row = $stmt->fetch()) {
            $patients[] = $this->formatPatient($row, true);
        }

        return $patients;
    }

    /**
     * List all patients (paginated, no search criteria required)
     */
    public function listPatients(int $limit = 50, int $offset = 0): array
    {
        $conn = $this->db->getConnection();

        $stmt = $conn->prepare("
            SELECT * FROM patients 
            WHERE deleted_at IS NULL 
            ORDER BY last_name, first_name 
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $patients = [];
        while ($row = $stmt->fetch()) {
            $patients[] = $this->formatPatient($row, true);
        }

        return $patients;
    }

    /**
     * Update patient
     */
    public function updatePatient(string $id, array $data): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            // Build update query dynamically
            $updates = [];
            $params = ['id' => $id];

            $allowedFields = [
                'first_name', 'middle_name', 'last_name', 'phone', 'email',
                'address_line1', 'address_line2', 'city', 'state', 'zip_code',
                'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relationship', 'marital_status'
            ];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $data[$field];
                }
            }

            if (empty($updates)) {
                throw new \RuntimeException("No valid fields to update");
            }

            $sql = "UPDATE patients SET " . implode(', ', $updates) . " WHERE id = :id AND deleted_at IS NULL";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);

            $conn->commit();

            return $this->getPatientById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to update patient: " . $e->getMessage());
        }
    }

    /**
     * Format patient data for response
     */
    private function formatPatient(array $patient, bool $maskSensitive): array
    {
        // Decrypt NIN if not masking
        if (!empty($patient['nin']) && !$maskSensitive) {
            $patient['nin'] = $this->encryption->decrypt($patient['nin']);
        } elseif (!empty($patient['nin'])) {
            $patient['nin'] = EncryptionService::maskNIN(
                $this->encryption->decrypt($patient['nin'])
            );
        }

        // Remove timestamps if not needed
        unset($patient['deleted_at']);

        return $patient;
    }

    /**
     * Generate unique MRN (Medical Record Number)
     */
    private function generateMRN(): string
    {
        $conn = $this->db->getConnection();
        
        do {
            // Format: MRN + 8 digits
            $mrn = 'MRN' . str_pad(random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
            
            $stmt = $conn->prepare("SELECT id FROM patients WHERE mrn = :mrn");
            $stmt->execute(['mrn' => $mrn]);
            $exists = $stmt->fetch();
            
        } while ($exists);

        return $mrn;
    }

    /**
     * Delete patient (soft delete)
     */
    public function deletePatient(string $id): bool
    {
        $conn = $this->db->getConnection();
        
        try {
            $stmt = $conn->prepare("
                UPDATE patients 
                SET deleted_at = NOW() 
                WHERE id = :id
            ");
            
            return $stmt->execute(['id' => $id]);
        } catch (\PDOException $e) {
            throw new \RuntimeException("Failed to delete patient: " . $e->getMessage());
        }
    }
}
