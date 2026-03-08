<?php

namespace App\Controllers;

use App\Config\Database;
use App\Config\Roles;

class DashboardController
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get dashboard statistics
     * GET /api/dashboard/stats
     */
    public function getStats(object $user): void
    {
        try {
            $conn = $this->db->getConnection();

            // Total patients
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM patients WHERE deleted_at IS NULL");
            $totalPatients = (int)$stmt->fetch()['cnt'];

            // Active encounters (in_progress)
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM encounters WHERE status = 'in_progress' AND deleted_at IS NULL");
            $activeEncounters = (int)$stmt->fetch()['cnt'];

            // Pending lab orders
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM lab_orders WHERE status IN ('ordered','in_progress') AND deleted_at IS NULL");
            $pendingLabs = (int)$stmt->fetch()['cnt'];

            // Pending medications (pending prescription_status)
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM medications WHERE prescription_status = 'pending' AND deleted_at IS NULL");
            $pendingRx = (int)$stmt->fetch()['cnt'];

            // Today's appointments
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date = CURDATE()");
            $todaysAppointments = (int)$stmt->fetch()['cnt'];

            // Pending bills + Pending verification items
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM bills WHERE status IN ('pending', 'partial')");
            $draftBillsCount = (int)$stmt->fetch()['cnt'];

            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM lab_orders WHERE billing_status = 'pending_invoice' AND deleted_at IS NULL");
            $pendingLabInvoices = (int)$stmt->fetch()['cnt'];

            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM medications WHERE billing_status = 'pending_invoice' AND deleted_at IS NULL");
            $pendingMedInvoices = (int)$stmt->fetch()['cnt'];

            $pendingBills = $draftBillsCount + $pendingLabInvoices + $pendingMedInvoices;

            // Completed today (encounters, labs, medications)
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM encounters WHERE status = 'completed' AND DATE(closed_at) = CURDATE() AND deleted_at IS NULL");
            $completedEncounters = (int)$stmt->fetch()['cnt'];

            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM lab_orders WHERE status = 'completed' AND DATE(completed_at) = CURDATE() AND deleted_at IS NULL");
            $completedLabs = (int)$stmt->fetch()['cnt'];

            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM medications WHERE prescription_status = 'dispensed' AND DATE(dispensed_at) = CURDATE() AND deleted_at IS NULL");
            $completedMeds = (int)$stmt->fetch()['cnt'];

            $completedToday = $completedEncounters + $completedLabs + $completedMeds;

            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'total_patients' => $totalPatients,
                'active_encounters' => $activeEncounters,
                'pending_labs' => $pendingLabs,
                'pending_rx' => $pendingRx,
                'todays_appointments' => $todaysAppointments,
                'pending_bills' => $pendingBills,
                'completed_today' => $completedToday,
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch dashboard stats']);
            error_log("Dashboard stats error: " . $e->getMessage());
        }
    }
}
