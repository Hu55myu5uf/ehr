<?php

namespace App\Services;

use App\Config\Database;
use PDO;
use Exception;
use Ramsey\Uuid\Uuid;

class WardService
{
    private $db;
    private $auditService;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    public function getWards(): array
    {
        $sql = "SELECT w.*, 
                       (SELECT COUNT(*) FROM ward_beds WHERE ward_id = w.id) as total_beds,
                       (SELECT COUNT(*) FROM ward_beds WHERE ward_id = w.id AND status = 'occupied') as occupied_beds,
                       (SELECT COUNT(*) FROM ward_beds WHERE ward_id = w.id AND status = 'available') as available_beds
                FROM wards w
                ORDER BY CASE 
                    WHEN type = 'EMERGENCY' THEN 1
                    WHEN type = 'ICU' THEN 2
                    ELSE 3
                END, name ASC";
        
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getWardBeds(string $wardId): array
    {
        $sql = "SELECT b.*, 
                       p.first_name, p.last_name, p.mrn, p.gender, p.date_of_birth,
                       wa.id as admission_id, wa.patient_id, wa.encounter_id, wa.acuity, wa.admitted_at,
                       cd.primary_diagnosis as diagnosis
                FROM ward_beds b
                LEFT JOIN ward_admissions wa ON b.id = wa.bed_id AND wa.discharged_at IS NULL
                LEFT JOIN patients p ON wa.patient_id = p.id
                LEFT JOIN consultation_details cd ON wa.encounter_id = cd.encounter_id
                WHERE b.ward_id = ?
                ORDER BY b.bed_number ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$wardId]);
        $beds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($beds as &$bed) {
            if ($bed['patient_id']) {
                $bed['patient'] = [
                    'name' => $bed['first_name'] . ' ' . $bed['last_name'],
                    'mrn' => $bed['mrn'],
                    'gender' => $bed['gender'],
                    'diagnosis' => $bed['diagnosis'] ?? 'Under Observation',
                    'admittedAt' => $bed['admitted_at'],
                    'acuity' => $bed['acuity']
                ];
            }
        }
        return $beds;
    }

    public function admitToWard(array $data): string
    {
        $this->db->beginTransaction();
        try {
            // 1. Check bed availability
            $stmt = $this->db->prepare("SELECT status FROM ward_beds WHERE id = ?");
            $stmt->execute([$data['bed_id']]);
            $bed = $stmt->fetch();

            if (!$bed || $bed['status'] !== 'available') {
                throw new Exception("Bed is not available for admission.");
            }

            // 2. Create admission record
            $id = Uuid::uuid4()->toString();
            $sql = "INSERT INTO ward_admissions (id, patient_id, encounter_id, bed_id, acuity, ventilator_settings, drips, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $id,
                $data['patient_id'],
                $data['encounter_id'],
                $data['bed_id'],
                $data['acuity'] ?? 'stable',
                isset($data['ventilator']) ? json_encode($data['ventilator']) : null,
                isset($data['drips']) ? json_encode($data['drips']) : null,
                $data['notes'] ?? null
            ]);

            // 3. Update bed status
            $stmt = $this->db->prepare("UPDATE ward_beds SET status = 'occupied' WHERE id = ?");
            $stmt->execute([$data['bed_id']]);

            $this->auditService->log(null, $data['patient_id'], 'CREATE', 'ward_admission', $id, ['bed_id' => $data['bed_id']]);
            
            $this->db->commit();
            return $id;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function dischargeFromWard(string $admissionId): bool
    {
        $this->db->beginTransaction();
        try {
            // 1. Get admission details
            $stmt = $this->db->prepare("SELECT bed_id, patient_id FROM ward_admissions WHERE id = ? AND discharged_at IS NULL");
            $stmt->execute([$admissionId]);
            $admission = $stmt->fetch();

            if (!$admission) throw new Exception("Active admission not found.");

            // 2. Update admission record
            $stmt = $this->db->prepare("UPDATE ward_admissions SET discharged_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$admissionId]);

            // 3. Mark bed for cleaning
            $stmt = $this->db->prepare("UPDATE ward_beds SET status = 'cleaning' WHERE id = ?");
            $stmt->execute([$admission['bed_id']]);

            $this->auditService->log(null, $admission['patient_id'], 'UPDATE', 'ward_admission', $admissionId, ['status' => 'discharged', 'bed_id' => $admission['bed_id']]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
