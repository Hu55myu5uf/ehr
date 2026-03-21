<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class ConsultationService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    /**
     * Get consultation details by encounter ID
     */
    public function getByEncounterId(string $encounterId): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM consultation_details WHERE encounter_id = :eid");
        $stmt->execute(['eid' => $encounterId]);
        $detail = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($detail) {
            // Decode JSON fields
            if ($detail['review_of_systems']) {
                $detail['review_of_systems'] = json_decode($detail['review_of_systems'], true);
            }
            if ($detail['secondary_diagnoses']) {
                $detail['secondary_diagnoses'] = json_decode($detail['secondary_diagnoses'], true);
            }
        }

        return $detail ?: null;
    }

    /**
     * Save (create or update) consultation details
     */
    public function save(string $encounterId, array $data): array
    {
        $conn = $this->db->getConnection();
        
        $existing = $this->getByEncounterId($encounterId);

        // Encode JSON fields
        $ros = isset($data['review_of_systems']) ? json_encode($data['review_of_systems']) : null;
        $secondaryDx = isset($data['secondary_diagnoses']) ? json_encode($data['secondary_diagnoses']) : null;

        if ($existing) {
            // Update
            $stmt = $conn->prepare("
                UPDATE consultation_details SET
                    chief_complaint = :cc,
                    history_of_presenting_illness = :hpi,
                    review_of_systems = :ros,
                    past_medical_history = :pmh,
                    drug_history = :dh,
                    allergy_notes = :an,
                    family_history = :fh,
                    social_history = :sh,
                    primary_diagnosis = :pd,
                    primary_icd_code = :pic,
                    secondary_diagnoses = :sd,
                    admission_decision = :ad,
                    nursing_instructions = :ni,
                    additional_notes = :notes,
                    referral_notes = :rn,
                    updated_at = NOW()
                WHERE encounter_id = :eid
            ");
        } else {
            // Insert
            $id = Uuid::uuid4()->toString();
            $stmt = $conn->prepare("
                INSERT INTO consultation_details 
                    (id, encounter_id, chief_complaint, history_of_presenting_illness, review_of_systems,
                     past_medical_history, drug_history, allergy_notes, family_history, social_history,
                     primary_diagnosis, primary_icd_code, secondary_diagnoses,
                     admission_decision, nursing_instructions, additional_notes, referral_notes)
                VALUES
                    (:id, :eid, :cc, :hpi, :ros,
                     :pmh, :dh, :an, :fh, :sh,
                     :pd, :pic, :sd,
                     :ad, :ni, :notes, :rn)
            ");
        }

        $params = [
            'eid' => $encounterId,
            'cc' => $data['chief_complaint'] ?? null,
            'hpi' => $data['history_of_presenting_illness'] ?? null,
            'ros' => $ros,
            'pmh' => $data['past_medical_history'] ?? null,
            'dh' => $data['drug_history'] ?? null,
            'an' => $data['allergy_notes'] ?? null,
            'fh' => $data['family_history'] ?? null,
            'sh' => $data['social_history'] ?? null,
            'pd' => $data['primary_diagnosis'] ?? null,
            'pic' => $data['primary_icd_code'] ?? null,
            'sd' => $secondaryDx,
            'ad' => $data['admission_decision'] ?? 'discharge',
            'ni' => $data['nursing_instructions'] ?? null,
            'notes' => $data['additional_notes'] ?? null,
            'rn' => $data['referral_notes'] ?? null,
        ];

        if (!$existing) {
            $params['id'] = $id;
        }

        $stmt->execute($params);
        return $this->getByEncounterId($encounterId);
    }

    /**
     * Get full consultation view (encounter + details + patient + meds + labs)
     */
    public function getFullConsultation(string $encounterId): array
    {
        $conn = $this->db->getConnection();

        // Encounter + patient
        $stmt = $conn->prepare("
            SELECT e.*, 
                p.first_name, p.last_name, p.mrn, p.date_of_birth, p.gender, 
                p.phone, p.email, p.emergency_contact_name AS next_of_kin_name, 
                p.emergency_contact_phone AS next_of_kin_phone, 
                p.emergency_contact_relationship AS next_of_kin_relationship,
                pr.first_name AS doctor_first, pr.last_name AS doctor_last
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            WHERE e.id = :eid
        ");
        $stmt->execute(['eid' => $encounterId]);
        $encounter = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$encounter) {
            throw new \RuntimeException('Encounter not found');
        }

        // Consultation details
        $details = $this->getByEncounterId($encounterId);

        // Lab orders for this encounter
        $labStmt = $conn->prepare("
            SELECT lo.*, lr.result_value, lr.result_unit, lr.reference_range, lr.abnormal_flag
            FROM lab_orders lo
            LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
            WHERE lo.encounter_id = :eid
            GROUP BY lo.id
            ORDER BY lo.ordered_at DESC
        ");
        $labStmt->execute(['eid' => $encounterId]);
        $labs = $labStmt->fetchAll(\PDO::FETCH_ASSOC);

        // Medications for this encounter
        $medStmt = $conn->prepare("
            SELECT * FROM medications WHERE encounter_id = :eid ORDER BY created_at DESC
        ");
        $medStmt->execute(['eid' => $encounterId]);
        $medications = $medStmt->fetchAll(\PDO::FETCH_ASSOC);

        // Attachments for this encounter
        $attStmt = $conn->prepare("
            SELECT a.*, u.username as uploaded_by_name 
            FROM encounter_attachments a
            JOIN users u ON a.uploaded_by = u.id
            WHERE a.encounter_id = :eid 
            ORDER BY a.uploaded_at DESC
        ");
        $attStmt->execute(['eid' => $encounterId]);
        $attachments = $attStmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'encounter' => $encounter,
            'details' => $details,
            'lab_orders' => $labs,
            'medications' => $medications,
            'attachments' => $attachments,
        ];
    }
}
