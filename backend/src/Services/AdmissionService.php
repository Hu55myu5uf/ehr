<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class AdmissionService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get all currently admitted patients
     * Based on admission_decision = 'admit' in consultation_details 
     * and encounter status = 'in_progress'
     */
    public function getAdmittedPatients(): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                p.id as patient_id, p.first_name, p.last_name, p.mrn, p.gender, p.date_of_birth,
                e.id as encounter_id, e.encounter_date, e.chief_complaint,
                cd.admission_decision, cd.nursing_instructions,
                pr.first_name as doctor_first, pr.last_name as doctor_last, pr.credentials as doctor_credentials,
                COALESCE(
                    (SELECT JSON_OBJECT(
                        'temp', cm.temp,
                        'bp_sys', cm.bp_sys,
                        'bp_dia', cm.bp_dia,
                        'hr', cm.hr,
                        'rr', cm.rr,
                        'spo2', cm.spo2,
                        'recorded_at', cm.recorded_at
                    ) FROM clinical_monitoring cm 
                      WHERE cm.encounter_id = e.id 
                      ORDER BY cm.recorded_at DESC 
                      LIMIT 1),
                    (SELECT nn.vitals 
                     FROM nursing_notes nn 
                     WHERE nn.encounter_id = e.id 
                       AND nn.vitals IS NOT NULL 
                     ORDER BY nn.created_at DESC 
                     LIMIT 1),
                    (SELECT JSON_OBJECT(
                        'temp', e2.temperature,
                        'bp_sys', e2.blood_pressure_systolic,
                        'bp_dia', e2.blood_pressure_diastolic,
                        'hr', e2.heart_rate,
                        'rr', e2.respiratory_rate,
                        'spo2', e2.oxygen_saturation,
                        'recorded_at', e2.created_at
                    ) FROM encounters e2 WHERE e2.id = e.id)
                ) as latest_vitals
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            JOIN consultation_details cd ON cd.encounter_id = e.id
            WHERE cd.admission_decision = 'admit'
            AND e.status = 'in_progress'
            AND e.deleted_at IS NULL
            ORDER BY e.encounter_date DESC
        ");
        
        $stmt->execute();
        $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($patients as &$patient) {
            if ($patient['latest_vitals']) {
                $patient['latest_vitals'] = json_decode($patient['latest_vitals'], true);
            }
        }

        return $patients;
    }

    /**
     * Get recently discharged/completed admissions
     */
    public function getDischargedPatients(int $limit = 50): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT 
                p.id as patient_id, p.first_name, p.last_name, p.mrn, p.gender, p.date_of_birth,
                e.id as encounter_id, e.encounter_date, e.closed_at, e.chief_complaint,
                cd.admission_decision,
                pr.first_name as doctor_first, pr.last_name as doctor_last
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            JOIN consultation_details cd ON cd.encounter_id = e.id
            WHERE cd.admission_decision = 'admit'
            AND e.status = 'completed'
            AND e.deleted_at IS NULL
            ORDER BY e.closed_at DESC
            LIMIT :limit
        ");
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get recent activity for an admitted patient
     */
    public function getAdmissionActivity(string $encounterId): array
    {
        $conn = $this->db->getConnection();
        
        // 1. Nursing Notes
        $notesStmt = $conn->prepare("
            SELECT 'nursing_note' as activity_type, nn.content, nn.vitals, nn.created_at,
                   pr.first_name as provider_first, pr.last_name as provider_last, 'Nurse' as provider_role
            FROM nursing_notes nn
            JOIN providers pr ON nn.nurse_id = pr.id
            WHERE nn.encounter_id = :eid
            ORDER BY nn.created_at DESC
        ");
        $notesStmt->execute(['eid' => $encounterId]);
        $notes = $notesStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($notes as &$n) {
            if ($n['vitals']) $n['vitals'] = json_decode($n['vitals'], true);
        }

        // 2. Lab Results
        $labsStmt = $conn->prepare("
            SELECT 'lab_result' as activity_type, lr.result_name, lr.result_value, lr.result_unit, 
                   lr.abnormal_flag, lr.created_at,
                   pr.first_name as provider_first, pr.last_name as provider_last, 'Lab Tech' as provider_role
            FROM lab_results lr
            JOIN lab_orders lo ON lr.lab_order_id = lo.id
            JOIN providers pr ON lr.performed_by = pr.id
            WHERE lo.encounter_id = :eid
            ORDER BY lr.created_at DESC
        ");
        $labsStmt->execute(['eid' => $encounterId]);
        $labs = $labsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Medications
        $medsStmt = $conn->prepare("
            SELECT 'medication' as activity_type, m.medication_name, m.dosage, m.frequency, 
                   m.instructions, m.created_at,
                   pr.first_name as provider_first, pr.last_name as provider_last, 'Doctor' as provider_role
            FROM medications m
            JOIN providers pr ON m.provider_id = pr.id
            WHERE m.encounter_id = :eid
            ORDER BY m.created_at DESC
        ");
        $medsStmt->execute(['eid' => $encounterId]);
        $meds = $medsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Combine and sort by date descending
        $activity = array_merge($notes, $labs, $meds);
        usort($activity, function($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });

        return $activity;
    }
}
