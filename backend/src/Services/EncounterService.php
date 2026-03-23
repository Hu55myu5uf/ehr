<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class EncounterService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * List encounters (for consultation views, with optional provider/status filter)
     */
    public function listEncounters(?string $providerId = null, ?string $status = null, int $limit = 50, int $offset = 0): array
    {
        $conn = $this->db->getConnection();
        $where = ['e.deleted_at IS NULL'];
        $params = [];

        if ($providerId) {
            $where[] = 'e.provider_id = :pid';
            $params['pid'] = $providerId;
        }
        if ($status) {
            $where[] = 'e.status = :status';
            $params['status'] = $status;
        }

        $whereStr = implode(' AND ', $where);
        $stmt = $conn->prepare("
            SELECT e.id, e.patient_id, e.encounter_type, e.status, e.chief_complaint,
                e.encounter_date, e.created_at,
                p.first_name AS patient_first, p.last_name AS patient_last, p.mrn,
                pr.first_name AS provider_first, pr.last_name AS provider_last, pr.credentials
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            LEFT JOIN appointments a ON e.id = a.encounter_id
            WHERE {$whereStr} AND (a.id IS NULL OR a.status != 'pending_payment')
            ORDER BY e.encounter_date DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get all encounters (paginated, with optional filters)
     */
    public function getAllEncounters(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $conn = $this->db->getConnection();

        $where = ['e.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'e.status = :status';
            $params['status'] = $filters['status'];
        }

        $sql = "SELECT 
                e.id, e.encounter_type, e.status, e.chief_complaint,
                e.encounter_date, e.location, e.created_at,
                p.first_name as patient_first, p.last_name as patient_last, p.mrn,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                pr.first_name as provider_first, pr.last_name as provider_last,
                pr.credentials
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY e.encounter_date DESC
            LIMIT :limit OFFSET :offset";

        $stmt = $conn->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * Create new encounter
     */
    public function createEncounter(array $data, string $providerId): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            $id = Uuid::uuid4()->toString();

            $stmt = $conn->prepare("
                INSERT INTO encounters (
                    id, patient_id, provider_id, encounter_type, status,
                    chief_complaint, encounter_date, location,
                    temperature, blood_pressure_systolic, blood_pressure_diastolic,
                    heart_rate, respiratory_rate, oxygen_saturation, weight, height, bmi
                ) VALUES (
                    :id, :patient_id, :provider_id, :encounter_type, :status,
                    :chief_complaint, :encounter_date, :location,
                    :temp, :bp_sys, :bp_dia, :hr, :rr, :spo2, :weight, :height, :bmi
                )
            ");

            $stmt->execute([
                'id' => $id,
                'patient_id' => $data['patient_id'],
                'provider_id' => $providerId,
                'encounter_type' => $data['encounter_type'] ?? 'office_visit',
                'status' => 'in_progress',
                'chief_complaint' => $data['chief_complaint'] ?? null,
                'encounter_date' => $data['encounter_date'] ?? date('Y-m-d H:i:s'),
                'location' => $data['location'] ?? null,
                'temp' => $data['temperature'] ?? null,
                'bp_sys' => $data['blood_pressure_systolic'] ?? null,
                'bp_dia' => $data['blood_pressure_diastolic'] ?? null,
                'hr' => $data['heart_rate'] ?? null,
                'rr' => $data['respiratory_rate'] ?? null,
                'spo2' => $data['oxygen_saturation'] ?? null,
                'weight' => $data['weight'] ?? null,
                'height' => $data['height'] ?? null,
                'bmi' => $data['bmi'] ?? null
            ]);

            $conn->commit();

            return $this->getEncounterById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to create encounter: " . $e->getMessage());
        }
    }

    /**
     * Get encounter by ID with patient and provider info
     */
    public function getEncounterById(string $id): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                e.*,
                p.mrn, p.first_name as patient_first, p.last_name as patient_last,
                p.date_of_birth, p.gender,
                pr.first_name as provider_first, pr.last_name as provider_last,
                pr.credentials
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            WHERE e.id = :id AND e.deleted_at IS NULL
        ");
        
        $stmt->execute(['id' => $id]);
        $encounter = $stmt->fetch();

        if (!$encounter) {
            throw new \RuntimeException("Encounter not found");
        }

        // Get associated clinical notes
        $notesStmt = $conn->prepare("
            SELECT id, note_type, is_signed, signed_at, created_at
            FROM clinical_notes
            WHERE encounter_id = :id AND deleted_at IS NULL
            ORDER BY created_at DESC
        ");
        $notesStmt->execute(['id' => $id]);
        $encounter['clinical_notes'] = $notesStmt->fetchAll();

        // Get medications from this encounter
        $medsStmt = $conn->prepare("
            SELECT id, medication_name, dosage, frequency, is_active
            FROM medications
            WHERE encounter_id = :id AND deleted_at IS NULL
        ");
        $medsStmt->execute(['id' => $id]);
        $encounter['medications'] = $medsStmt->fetchAll();

        return $encounter;
    }

    /**
     * Get patient encounter history
     */
    public function getPatientEncounters(string $patientId, int $limit = 20): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                e.id, e.encounter_type, e.status, e.chief_complaint,
                e.encounter_date, e.location,
                pr.first_name as provider_first, pr.last_name as provider_last,
                pr.credentials
            FROM encounters e
            JOIN providers pr ON e.provider_id = pr.id
            WHERE e.patient_id = :patient_id AND e.deleted_at IS NULL
            ORDER BY e.encounter_date DESC
            LIMIT :limit
        ");
        
        $stmt->bindValue('patient_id', $patientId);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    /**
     * Update encounter
     */
    public function updateEncounter(string $id, array $data): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            $updates = [];
            $params = ['id' => $id];

            $allowedFields = [
                'chief_complaint', 'location', 'temperature',
                'blood_pressure_systolic', 'blood_pressure_diastolic',
                'heart_rate', 'respiratory_rate', 'oxygen_saturation',
                'weight', 'height', 'bmi'
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

            $sql = "UPDATE encounters SET " . implode(', ', $updates) . " WHERE id = :id AND deleted_at IS NULL";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);

            $conn->commit();

            return $this->getEncounterById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to update encounter: " . $e->getMessage());
        }
    }

    public function closeEncounter(string $id): array
    {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();

            $stmt = $conn->prepare("
                UPDATE encounters 
                SET status = 'completed', closed_at = NOW()
                WHERE id = :id AND deleted_at IS NULL
            ");
            
            $stmt->execute(['id' => $id]);

            // Sync appointment status if one is linked to this encounter
            $apptStmt = $conn->prepare("
                UPDATE appointments 
                SET status = 'completed', updated_at = NOW()
                WHERE encounter_id = :id AND deleted_at IS NULL
            ");
            $apptStmt->execute(['id' => $id]);

            $conn->commit();

            return $this->getEncounterById($id);

        } catch (\Exception $e) {
            $conn->rollBack();
            throw new \RuntimeException("Failed to close encounter: " . $e->getMessage());
        }
    }

    /**
     * Get active medications and allergies for patient (for context during encounter)
     */
    public function getPatientContext(string $patientId): array
    {
        $conn = $this->db->getConnection();
        
        // Active medications
        $medsStmt = $conn->prepare("
            SELECT id, medication_name, dosage, frequency, start_date
            FROM medications
            WHERE patient_id = :patient_id 
            AND is_active = 1 
            AND deleted_at IS NULL
            ORDER BY start_date DESC
        ");
        $medsStmt->execute(['patient_id' => $patientId]);
        $medications = $medsStmt->fetchAll();

        // Active allergies
        $allergyStmt = $conn->prepare("
            SELECT id, allergen, reaction, severity
            FROM allergies
            WHERE patient_id = :patient_id 
            AND is_active = 1 
            AND deleted_at IS NULL
        ");
        $allergyStmt->execute(['patient_id' => $patientId]);
        $allergies = $allergyStmt->fetchAll();

        // Active diagnoses
        $diagnosisStmt = $conn->prepare("
            SELECT id, icd10_code, description, onset_date
            FROM diagnoses
            WHERE patient_id = :patient_id 
            AND status IN ('active', 'chronic')
            AND deleted_at IS NULL
            ORDER BY onset_date DESC
        ");
        $diagnosisStmt->execute(['patient_id' => $patientId]);
        $diagnoses = $diagnosisStmt->fetchAll();

        return [
            'medications' => $medications,
            'allergies' => $allergies,
            'diagnoses' => $diagnoses
        ];
    }
    /**
     * Create a new encounter for a walk-in patient (atomic patient + encounter creation is handled by controller/frontend calling sequentially, but this helper simplifies it if needed)
     */
    public function createWalkInEncounter(array $patientData, string $providerId): array
    {
        $patientService = new PatientService();
        $patient = $patientService->registerWalkIn($patientData);
        
        return $this->createEncounter([
            'patient_id' => $patient['id'],
            'encounter_type' => 'walk_in',
            'chief_complaint' => 'Immediate walk-in consultation/order'
        ], $providerId);
    }
}
