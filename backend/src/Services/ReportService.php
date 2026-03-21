<?php

namespace App\Services;

use App\Config\Database;

class ReportService
{
    private Database $db;

    public function __construct()
    {
        $this->db = new Database();
    }

    /**
     * Get overall financial overview
     */
    public function getFinancialOverview(?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "1=1";
        $params = [];
        if ($startDate) {
            $where .= " AND generated_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        }
        if ($endDate) {
            $where .= " AND generated_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "
            SELECT 
                SUM(total_amount) as total_revenue,
                SUM(paid_amount) as total_collected,
                SUM(total_amount - paid_amount) as total_pending,
                COUNT(*) as total_bills,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_bills
            FROM bills
            WHERE $where
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $stats = $stmt->fetch(\PDO::FETCH_ASSOC);

        // Convert nulls to 0
        foreach ($stats as $key => $value) {
            $stats[$key] = $value ?? 0;
        }

        return $stats;
    }

    /**
     * Get revenue breakdown by section (item_type)
     */
    public function getRevenueBySection(?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "b.status = 'paid'";
        $params = [];
        if ($startDate) {
            $where .= " AND b.paid_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        }
        if ($endDate) {
            $where .= " AND b.paid_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "
            SELECT 
                bi.item_type as section,
                SUM(bi.total_price) as generated_revenue
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            WHERE $where
            GROUP BY bi.item_type
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get revenue trend for the last 30 days
     */
    public function getDailyRevenueTrend(?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "status = 'paid'";
        $params = [];
        if ($startDate) {
            $where .= " AND paid_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        } else {
            $where .= " AND paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }
        if ($endDate) {
            $where .= " AND paid_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "
            SELECT 
                DATE(paid_at) as date,
                SUM(paid_amount) as amount
            FROM bills
            WHERE $where
            GROUP BY DATE(paid_at)
            ORDER BY date ASC
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get recent transactions
     */
    public function getRecentPaidBills(int $limit = 10, ?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "b.status = 'paid'";
        $params = [];
        if ($startDate) {
            $where .= " AND b.paid_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        }
        if ($endDate) {
            $where .= " AND b.paid_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "
            SELECT 
                b.*, 
                p.first_name as patient_first, 
                p.last_name as patient_last
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            WHERE $where
            ORDER BY b.paid_at DESC
            LIMIT :limit
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get comprehensive hospital stats for the general report
     */
    public function aggregateHospitalStats(): array
    {
        $conn = $this->db->getConnection();
        
        // 1. Patient Totals
        $patients = $conn->query("SELECT COUNT(*) as total, 
                                  SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as males,
                                  SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as females
                                  FROM patients WHERE deleted_at IS NULL")->fetch(\PDO::FETCH_ASSOC);

        // 2. Admission Stats
        $admissions = $conn->query("SELECT 
                                    (SELECT COUNT(*) FROM encounters WHERE status = 'in_progress' AND encounter_type = 'inpatient') as current_inpatients,
                                    (SELECT COUNT(*) FROM ward_beds WHERE status = 'occupied') as occupied_beds,
                                    (SELECT COUNT(*) FROM ward_beds) as total_beds
                                    ")->fetch(\PDO::FETCH_ASSOC);

        // 3. Clinical Volume (Last 30 days)
        $volume = $conn->query("SELECT 
                                (SELECT COUNT(*) FROM encounters WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as total_encounters,
                                (SELECT COUNT(*) FROM lab_orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as total_labs,
                                (SELECT COUNT(*) FROM appointments WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as total_appointments
                                ")->fetch(\PDO::FETCH_ASSOC);

        return [
            'patients' => $patients ?: ['total' => 0, 'males' => 0, 'females' => 0],
            'admissions' => $admissions ?: ['current_inpatients' => 0, 'occupied_beds' => 0, 'total_beds' => 0],
            'volume' => $volume ?: ['total_encounters' => 0, 'total_labs' => 0, 'total_appointments' => 0],
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Get visit trend for the last 30 days
     */
    public function getDailyVisitTrend(?string $startDate = null, ?string $endDate = null): array
    {
        $conn = $this->db->getConnection();
        
        $where = "1=1";
        $params = [];
        if ($startDate) {
            $where .= " AND created_at >= :start";
            $params['start'] = $startDate . " 00:00:00";
        } else {
            $where .= " AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }
        if ($endDate) {
            $where .= " AND created_at <= :end";
            $params['end'] = $endDate . " 23:59:59";
        }

        $sql = "
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM encounters
            WHERE $where
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Get a consolidated performance overview for dashboards
     */
    public function getPerformanceOverview(): array
    {
        return [
            'financial' => $this->getFinancialOverview(),
            'revenue_trend' => $this->getDailyRevenueTrend(),
            'visit_trend' => $this->getDailyVisitTrend(),
            'hospital_stats' => $this->aggregateHospitalStats()
        ];
    }
}
