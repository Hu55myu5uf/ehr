<?php

namespace App\Controllers;

use App\Services\ReportService;
use App\Middleware\AuthMiddleware;
use App\Config\Roles;

class ReportController
{
    private ReportService $service;

    public function __construct()
    {
        $this->service = new ReportService();
    }

    private function success($data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $msg, int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $msg]);
    }

    /**
     * Get financial reports dashboard data
     * GET /api/reports/funds-statistics
     */
    public function getFundsStatistics(object $user): void
    {
        try {
            // Only Super Admin can see funds details
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN]);

            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;

            $overview = $this->service->getFinancialOverview($startDate, $endDate);
            $sections = $this->service->getRevenueBySection($startDate, $endDate);
            $trend = $this->service->getDailyRevenueTrend($startDate, $endDate);
            $recent = $this->service->getRecentPaidBills(15, $startDate, $endDate);

            $this->success([
                'overview' => $overview,
                'sections' => $sections,
                'trend' => $trend,
                'recent_transactions' => $recent
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * Get comprehensive hospital report statistics
     * GET /api/reports/comprehensive
     */
    public function getComprehensiveReport(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN]);
            $this->success($this->service->aggregateHospitalStats());
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
