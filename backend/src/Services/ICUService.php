<?php

namespace App\Services;

use PDO;
use Exception;
use Ramsey\Uuid\Uuid;

class ICUService {
    private $db;
    private $auditService;

    public function __construct() {
        $this->db = \App\Config\Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    public function getBeds() {
                SELECT b.*, 
                       p.first_name, p.last_name, p.dob,
                       a.id as admission_id, a.patient_id, a.encounter_id, a.acuity, a.ventilator_settings, a.drips, a.admitted_at,
                       d.diagnosis_code as diagnosis
                FROM icu_beds b
                LEFT JOIN icu_admissions a ON b.id = a.bed_id AND a.discharged_at IS NULL
                LEFT JOIN patients p ON a.patient_id = p.id
                LEFT JOIN diagnoses d ON a.encounter_id = d.encounter_id
                ORDER BY b.bed_number ASC";
        
        $stmt = $this->db->query($sql);
        $beds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($beds as &$bed) {
            if ($bed['patient_id']) {
                $bed['patient'] = [
                    'name' => $bed['first_name'] . ' ' . $bed['last_name'],
                    'age' => $this->calculateAge($bed['dob']),
                    'diagnosis' => $bed['diagnosis'] ?? 'Under Observation',
                    'admittedAt' => $bed['admitted_at'],
                    'acuity' => $bed['acuity']
                ];
                $bed['ventilator'] = json_decode($bed['ventilator_settings'], true);
                $bed['drips'] = json_decode($bed['drips'], true);
                
                // Fetch latest vitals for this encounter
                $bed['vitals'] = $this->getLatestVitals($bed['encounter_id']);
            }
        }
        return $beds;
    }

    public function admitPatient($data) {
        $this->db->beginTransaction();
        try {
            $id = Uuid::uuid4()->toString();
            
            // 1. Check if bed is available
            $stmt = $this->db->prepare("SELECT status FROM icu_beds WHERE id = ?");
            $stmt->execute([$data['bed_id']]);
            $bed = $stmt->fetch();
            
            if (!$bed || $bed['status'] !== 'available') {
                throw new Exception("Bed is not available");
            }

            // 2. Create admission record
            $sql = "INSERT INTO icu_admissions (id, patient_id, encounter_id, bed_id, acuity, ventilator_settings, drips) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $id,
                $data['patient_id'],
                $data['encounter_id'],
                $data['bed_id'],
                $data['acuity'] ?? 'stable',
                json_encode($data['ventilator'] ?? null),
                json_encode($data['drips'] ?? [])
            ]);

            // 3. Update bed status
            $stmt = $this->db->prepare("UPDATE icu_beds SET status = 'occupied' WHERE id = ?");
            $stmt->execute([$data['bed_id']]);

            $this->auditService->log('ICU_ADMISSION', $data['patient_id'], ['bed_id' => $data['bed_id']]);
            
            $this->db->commit();
            return $id;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function updateMonitoring($admissionId, $data) {
        $sql = "UPDATE icu_admissions SET 
                acuity = COALESCE(?, acuity),
                ventilator_settings = COALESCE(?, ventilator_settings),
                drips = COALESCE(?, drips)
                WHERE id = ? AND discharged_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['acuity'] ?? null,
            isset($data['ventilator']) ? json_encode($data['ventilator']) : null,
            isset($data['drips']) ? json_encode($data['drips']) : null,
            $admissionId
        ]);
        
        return true;
    }

    public function dischargePatient($admissionId) {
        $this->db->beginTransaction();
        try {
            // 1. Get admission details
            $stmt = $this->db->prepare("SELECT bed_id, patient_id FROM icu_admissions WHERE id = ?");
            $stmt->execute([$admissionId]);
            $admission = $stmt->fetch();

            if (!$admission) throw new Exception("Admission not found");

            // 2. Update admission record
            $stmt = $this->db->prepare("UPDATE icu_admissions SET discharged_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$admissionId]);

            // 3. Set bed to cleaning
            $stmt = $this->db->prepare("UPDATE icu_beds SET status = 'cleaning' WHERE id = ?");
            $stmt->execute([$admission['bed_id']]);

            $this->auditService->log('ICU_DISCHARGE', $admission['patient_id'], ['bed_id' => $admission['bed_id']]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function getLatestVitals($encounterId) {
        // Simple mock vitals logic or fetch from nursing_notes if available
        $stmt = $this->db->prepare("SELECT temperature, bp_systolic, bp_diastolic, heart_rate, respiratory_rate, spo2 
                                  FROM nursing_notes 
                                  WHERE encounter_id = ? 
                                  ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$encounterId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) return null;

        return [
            'heartRate' => $row['heart_rate'],
            'bloodPressure' => $row['bp_systolic'] . '/' . $row['bp_diastolic'],
            'spO2' => $row['spo2'],
            'temperature' => $row['temperature'],
            'respiratoryRate' => $row['respiratory_rate']
        ];
    }

    private function calculateAge($dob) {
        $birthDate = new \DateTime($dob);
        $today = new \DateTime();
        return $birthDate->diff($today)->y;
    }
}
