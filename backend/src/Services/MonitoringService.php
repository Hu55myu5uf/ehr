<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;
use PDO;

class MonitoringService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Add a monitoring record
     */
    public function addRecord(array $data, string $providerId): array
    {
        $conn = $this->db->getConnection();
        $id = Uuid::uuid4()->toString();

        $stmt = $conn->prepare("
            INSERT INTO clinical_monitoring (
                id, encounter_id, patient_id, recorded_by,
                temp, bp_sys, bp_dia, hr, rr, spo2,
                intake_ml, output_ml, output_type, notes
            ) VALUES (
                :id, :eid, :pid, :rid,
                :temp, :sys, :dia, :hr, :rr, :spo2,
                :intake, :output, :otype, :notes
            )
        ");

        $stmt->execute([
            'id' => $id,
            'eid' => $data['encounter_id'],
            'pid' => $data['patient_id'],
            'rid' => $providerId,
            'temp' => $data['temp'] ?? null,
            'sys' => $data['bp_sys'] ?? null,
            'dia' => $data['bp_dia'] ?? null,
            'hr' => $data['hr'] ?? null,
            'rr' => $data['rr'] ?? null,
            'spo2' => $data['spo2'] ?? null,
            'intake' => $data['intake_ml'] ?? null,
            'output' => $data['output_ml'] ?? null,
            'otype' => $data['output_type'] ?? 'urine',
            'notes' => $data['notes'] ?? null
        ]);

        return $this->getRecordById($id);
    }

    public function getRecordById(string $id): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM clinical_monitoring WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get records for an encounter
     */
    public function getByEncounter(string $encounterId): array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT cm.*, pr.first_name, pr.last_name, pr.credentials
            FROM clinical_monitoring cm
            JOIN providers pr ON cm.recorded_by = pr.id
            WHERE cm.encounter_id = :eid
            ORDER BY cm.recorded_at ASC
        ");
        $stmt->execute(['eid' => $encounterId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
