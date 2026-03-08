<?php

namespace App\Services;

use App\Config\Database;
use Ramsey\Uuid\Uuid;
use App\Services\EncounterService;
use App\Services\ProviderService;

class AppointmentService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    /**
     * Create a new appointment
     */
    public function createAppointment(array $data, string $createdBy): array
    {
        $conn = $this->db->getConnection();
        $id = Uuid::uuid4()->toString();

        $stmt = $conn->prepare("
            INSERT INTO appointments (id, patient_id, provider_id, appointment_date, appointment_time, 
                appointment_type, status, reason, notes, created_by)
            VALUES (:id, :patient_id, :provider_id, :appointment_date, :appointment_time,
                :appointment_type, 'scheduled', :reason, :notes, :created_by)
        ");

        $stmt->execute([
            'id' => $id,
            'patient_id' => $data['patient_id'],
            'provider_id' => (!empty($data['provider_id'])) ? $data['provider_id'] : null,
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'] ?? null,
            'appointment_type' => $data['appointment_type'] ?? 'new_visit',
            'reason' => $data['reason'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy
        ]);

        return $this->getAppointmentById($id);
    }

    /**
     * Get appointment by ID
     */
    public function getAppointmentById(string $id): ?array
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            SELECT a.*, 
                p.first_name AS patient_first, p.last_name AS patient_last, p.mrn, p.phone AS patient_phone,
                pr.first_name AS doctor_first, pr.last_name AS doctor_last
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN providers pr ON a.provider_id = pr.id
            WHERE a.id = :id
        ");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List appointments with filters
     */
    public function listAppointments(array $filters = []): array
    {
        $conn = $this->db->getConnection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['date'])) {
            $where[] = 'a.appointment_date = :date';
            $params['date'] = $filters['date'];
        }
        if (!empty($filters['provider_id'])) {
            $where[] = 'a.provider_id = :provider_id';
            $params['provider_id'] = $filters['provider_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'a.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['patient_id'])) {
            $where[] = 'a.patient_id = :patient_id';
            $params['patient_id'] = $filters['patient_id'];
        }

        $limit = (int)($filters['limit'] ?? 50);
        $offset = (int)($filters['offset'] ?? 0);
        $whereStr = implode(' AND ', $where);

        $stmt = $conn->prepare("
            SELECT a.*, 
                p.first_name AS patient_first, p.last_name AS patient_last, p.mrn, p.phone AS patient_phone,
                pr.first_name AS doctor_first, pr.last_name AS doctor_last
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN providers pr ON a.provider_id = pr.id
            WHERE {$whereStr}
            ORDER BY a.appointment_date DESC, a.appointment_time ASC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get today's queue
     */
    public function getTodaysQueue(?string $providerId = null): array
    {
        $filters = ['date' => date('Y-m-d')];
        if ($providerId) {
            $filters['provider_id'] = $providerId;
        }
        return $this->listAppointments($filters);
    }

    /**
     * Start an appointment (create encounter if needed)
     */
    public function startAppointment(string $appointmentId, string $userId): array
    {
        $conn = $this->db->getConnection();
        $appointment = $this->getAppointmentById($appointmentId);

        if (!$appointment) {
            throw new \RuntimeException("Appointment not found");
        }

        $encounterId = $appointment['encounter_id'];

        if (!$encounterId) {
            // Need to create a new encounter
            $providerService = new ProviderService();
            $providerId = $providerService->getProviderIdByUserId($userId);

            if (!$providerId) {
                // If the user starting it isn't linked to a provider (e.g. Superadmin),
                // use the provider assigned to the appointment.
                $providerId = $appointment['provider_id'];
            }
            
            if (!$providerId) {
                // Last ditch effort: Just pick the first available provider so the encounter can be created
                $allProviders = $providerService->getAllProviders();
                if (!empty($allProviders)) {
                    $providerId = $allProviders[0]['id'];
                }
            }

            if (!$providerId) {
                throw new \RuntimeException("Cannot start appointment: No provider available to assign to the encounter.");
            }

            $encounterService = new EncounterService();
            $encounter = $encounterService->createEncounter([
                'patient_id' => $appointment['patient_id'],
                'encounter_type' => $appointment['appointment_type'],
                'chief_complaint' => $appointment['reason'],
                'encounter_date' => date('Y-m-d H:i:s'),
                'status' => 'in_progress'
            ], $providerId);

            $encounterId = $encounter['id'];
        }

        // Update appointment status and link encounter
        return $this->updateStatus($appointmentId, 'in_progress', $encounterId);
    }

    /**
     * Update appointment status
     */
    public function updateStatus(string $id, string $status, ?string $encounterId = null): array
    {
        $conn = $this->db->getConnection();
        
        if ($encounterId) {
            $stmt = $conn->prepare("UPDATE appointments SET status = :status, encounter_id = :eid, updated_at = NOW() WHERE id = :id");
            $stmt->execute(['status' => $status, 'eid' => $encounterId, 'id' => $id]);
        } else {
            $stmt = $conn->prepare("UPDATE appointments SET status = :status, updated_at = NOW() WHERE id = :id");
            $stmt->execute(['status' => $status, 'id' => $id]);
        }

        return $this->getAppointmentById($id);
    }

    /**
     * Count today's appointments
     */
    public function countTodays(): int
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE()");
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }
}
