<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;

class NursingService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    /**
     * Add a nursing note
     */
    public function addNote(array $data, string $nurseProviderId): array
    {
        $conn = $this->db->getConnection();
        $id = Uuid::uuid4()->toString();

        $vitalsData = $data['vitals'] ?? null;
        if ($vitalsData) {
            // Map keys to standard short names
            $vitals = json_encode([
                'temp' => $vitalsData['temperature'] ?? $vitalsData['temp'] ?? null,
                'bp_sys' => $vitalsData['bp_systolic'] ?? $vitalsData['bp_sys'] ?? null,
                'bp_dia' => $vitalsData['bp_diastolic'] ?? $vitalsData['bp_dia'] ?? null,
                'hr' => $vitalsData['heart_rate'] ?? $vitalsData['hr'] ?? null,
                'rr' => $vitalsData['respiratory_rate'] ?? $vitalsData['rr'] ?? null,
                'spo2' => $vitalsData['spo2'] ?? null,
                'weight' => $vitalsData['weight'] ?? null,
                'intake_ml' => $vitalsData['intake_ml'] ?? null,
                'output_ml' => $vitalsData['output_ml'] ?? null,
                'output_type' => $vitalsData['output_type'] ?? null,
                'notes' => $vitalsData['notes'] ?? null,
            ]);
        } else {
            $vitals = null;
        }

        $stmt = $conn->prepare("
            INSERT INTO nursing_notes (id, patient_id, encounter_id, nurse_id, note_type, content, vitals)
            VALUES (:id, :pid, :eid, :nid, :type, :content, :vitals)
        ");
        $stmt->execute([
            'id' => $id,
            'pid' => $data['patient_id'],
            'eid' => $data['encounter_id'] ?? null,
            'nid' => $nurseProviderId,
            'type' => $data['note_type'] ?? 'care_note',
            'content' => $data['content'] ?? null,
            'vitals' => $vitals,
        ]);

        return $this->getNoteById($id);
    }

    /**
     * Get note by ID
     */
    public function getNoteById(string $id): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT nn.*, p.first_name AS patient_first, p.last_name AS patient_last, p.mrn,
                pr.first_name AS nurse_first, pr.last_name AS nurse_last
            FROM nursing_notes nn
            JOIN patients p ON nn.patient_id = p.id
            JOIN providers pr ON nn.nurse_id = pr.id
            WHERE nn.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $note = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($note && $note['vitals']) {
            $note['vitals'] = json_decode($note['vitals'], true);
        }
        return $note ?: null;
    }

    /**
     * Get nursing notes for a patient
     */
    public function getByPatient(string $patientId): array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT nn.*, pr.first_name AS nurse_first, pr.last_name AS nurse_last
            FROM nursing_notes nn
            JOIN providers pr ON nn.nurse_id = pr.id
            WHERE nn.patient_id = :pid
            ORDER BY nn.created_at DESC
        ");
        $stmt->execute(['pid' => $patientId]);
        $notes = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($notes as &$n) {
            if ($n['vitals']) $n['vitals'] = json_decode($n['vitals'], true);
        }
        return $notes;
    }

    /**
     * Get active patients with nursing instructions
     */
    public function getActivePatientsWithInstructions(): array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT e.id AS encounter_id, e.status, e.chief_complaint,
                p.id AS patient_id, p.first_name, p.last_name, p.mrn, p.gender, p.date_of_birth,
                cd.nursing_instructions, cd.admission_decision,
                pr.first_name AS doctor_first, pr.last_name AS doctor_last
            FROM encounters e
            JOIN patients p ON e.patient_id = p.id
            JOIN providers pr ON e.provider_id = pr.id
            LEFT JOIN consultation_details cd ON cd.encounter_id = e.id
            WHERE e.status IN ('in_progress', 'scheduled')
              AND e.deleted_at IS NULL
            ORDER BY e.created_at DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
