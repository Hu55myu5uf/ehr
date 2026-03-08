<?php
namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;
use PDO;

class TreatmentSheetService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function getOrCreateSheet(string $encounterId, string $patientId): array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM treatment_sheets WHERE encounter_id = :eid");
        $stmt->execute(['eid' => $encounterId]);
        $sheet = $stmt->fetch();

        if (!$sheet) {
            $id = Uuid::uuid4()->toString();
            $stmt = $conn->prepare("INSERT INTO treatment_sheets (id, encounter_id, patient_id) VALUES (:id, :eid, :pid)");
            $stmt->execute(['id' => $id, 'eid' => $encounterId, 'pid' => $patientId]);
            return $this->getSheetByEncounter($encounterId);
        }

        return $this->getSheetByEncounter($encounterId);
    }

    public function getSheetByEncounter(string $encounterId): array
    {
        $conn = $this->db->getConnection();
        
        // Get sheet info
        $stmt = $conn->prepare("SELECT * FROM treatment_sheets WHERE encounter_id = :eid");
        $stmt->execute(['eid' => $encounterId]);
        $sheet = $stmt->fetch();

        if (!$sheet) return [];

        // Get medications
        $stmt = $conn->prepare("
            SELECT tm.*, pr.first_name AS doctor_first, pr.last_name AS doctor_last
            FROM treatment_medications tm
            LEFT JOIN providers pr ON tm.doctor_id = pr.id
            WHERE tm.treatment_sheet_id = :sid
            ORDER BY tm.created_at ASC
        ");
        $stmt->execute(['sid' => $sheet['id']]);
        $meds = $stmt->fetchAll();

        // Get administrations for each med
        foreach ($meds as &$med) {
            $stmt = $conn->prepare("
                SELECT ma.*, pr.first_name AS nurse_first, pr.last_name AS nurse_last
                FROM medication_administrations ma
                JOIN providers pr ON ma.nurse_id = pr.id
                WHERE ma.treatment_medication_id = :mid
                ORDER BY ma.administration_time ASC
            ");
            $stmt->execute(['mid' => $med['id']]);
            $med['administrations'] = $stmt->fetchAll();
        }

        $sheet['medications'] = $meds;
        return $sheet;
    }

    public function addMedication(string $sheetId, array $data, string $doctorId): array
    {
        $conn = $this->db->getConnection();
        $id = Uuid::uuid4()->toString();

        $stmt = $conn->prepare("
            INSERT INTO treatment_medications (id, treatment_sheet_id, inventory_item_id, medication_name, dose, route, frequency, duration, doctor_id)
            VALUES (:id, :sid, :iid, :name, :dose, :route, :freq, :dur, :did)
        ");
        $stmt->execute([
            'id' => $id,
            'sid' => $sheetId,
            'iid' => $data['inventory_item_id'] ?? null,
            'name' => $data['medication_name'],
            'dose' => $data['dose'] ?? null,
            'route' => $data['route'] ?? null,
            'freq' => $data['frequency'] ?? null,
            'dur' => $data['duration'] ?? null,
            'did' => $doctorId
        ]);

        return ['id' => $id];
    }

    public function recordAdministration(string $medId, array $data, string $nurseId): array
    {
        $conn = $this->db->getConnection();
        $id = Uuid::uuid4()->toString();

        $stmt = $conn->prepare("
            INSERT INTO medication_administrations (id, treatment_medication_id, nurse_id, scheduled_time_slot, administration_time, status, notes)
            VALUES (:id, :mid, :nid, :slot, :time, :status, :notes)
        ");
        $stmt->execute([
            'id' => $id,
            'mid' => $medId,
            'nid' => $nurseId,
            'slot' => $data['scheduled_time_slot'],
            'time' => date('Y-m-d H:i:s'),
            'status' => $data['status'] ?? 'administered',
            'notes' => $data['notes'] ?? null
        ]);

        return ['id' => $id];
    }
}
