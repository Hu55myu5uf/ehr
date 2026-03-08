<?php

namespace App\Controllers;

use App\Services\BillingService;
use App\Services\LabService;
use App\Services\MedicationService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Config\Roles;

class BillingController
{
    private BillingService $service;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->service = new BillingService();
        $this->audit = new AuditMiddleware();
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
     * List all bills
     * GET /api/billing?status=pending
     */
    public function index(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::BILLING_OFFICER]);
            $status = $_GET['status'] ?? null;
            $limit = (int)($_GET['limit'] ?? 50);
            $offset = (int)($_GET['offset'] ?? 0);
            $bills = $this->service->listBills($status, $limit, $offset);
            $this->success(['bills' => $bills, 'count' => count($bills)]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get a specific bill
     * GET /api/billing/{id}
     */
    public function show(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::BILLING_OFFICER]);
            $bill = $this->service->getBillById($id);
            if (!$bill) {
                $this->error('Bill not found', 404);
                return;
            }
            $this->success($bill);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Generate bill for an encounter
     * POST /api/billing/generate
     */
    public function generate(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::DOCTOR]);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['encounter_id'])) {
                $this->error('encounter_id is required', 400);
                return;
            }

            $bill = $this->service->generateBill($data['encounter_id'], $user->sub);
            $this->audit->logRequest($user);
            $this->success($bill, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Generate bill for standalone lab orders
     * POST /api/billing/generate-direct
     */
    public function generateDirect(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST]);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['patient_id'])) {
                $this->error('patient_id is required', 400);
                return;
            }

            $bill = $this->service->generateDirectLabBill($data['patient_id'], $user->sub);
            $this->audit->logRequest($user);
            $this->success($bill, 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Process payment on a bill
     * POST /api/billing/{id}/pay
     */
    public function pay(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::BILLING_OFFICER]);
            $data = json_decode(file_get_contents('php://input'), true);
            $bill = $this->service->processPayment($id, $data ?? []);
            $this->audit->logRequest($user);
            $this->success($bill);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get bill for an encounter
     * GET /api/billing/encounter/{encounterId}
     */
    public function byEncounter(object $user, string $encounterId): void
    {
        try {
            AuthMiddleware::requireRole($user, [Roles::SUPER_ADMIN, Roles::RECEPTIONIST, Roles::BILLING_OFFICER, Roles::DOCTOR]);
            $bill = $this->service->getBillByEncounterId($encounterId);
            if (!$bill) {
                $this->error('No bill found for this encounter', 404);
                return;
            }
            $this->success($bill);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get pending billing verifications (lab orders + medications)
     * GET /api/billing/pending-verification
     */
    public function pendingVerification(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, Roles::CAN_MANAGE_BILLING);

            $labService = new LabService();
            $medService = new MedicationService();

            $labOrders = $labService->getPendingBillingLabOrders();
            $medications = $medService->getPendingBillingMedications();

            $this->success([
                'lab_orders' => $labOrders,
                'medications' => $medications,
                'lab_count' => count($labOrders),
                'med_count' => count($medications),
                'total' => count($labOrders) + count($medications)
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Verify a lab order (approve/reject)
     * POST /api/billing/verify-lab/{id}
     */
    public function verifyLabOrder(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, Roles::CAN_MANAGE_BILLING);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['billing_status'])) {
                $this->error('billing_status is required (approved or rejected)', 400);
                return;
            }

            $labService = new LabService();
            $labService->verifyLabOrderBilling($id, $data['billing_status'], $user->sub, $data['notes'] ?? null);
            $this->audit->logRequest($user);
            $this->success(['message' => 'Lab order billing ' . $data['billing_status']]);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Verify a medication (approve/reject)
     * POST /api/billing/verify-medication/{id}
     */
    public function verifyMedication(object $user, string $id): void
    {
        try {
            AuthMiddleware::requireRole($user, Roles::CAN_MANAGE_BILLING);
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['billing_status'])) {
                $this->error('billing_status is required (approved or rejected)', 400);
                return;
            }

            $medService = new MedicationService();
            $medService->verifyMedicationBilling($id, $data['billing_status'], $user->sub, $data['notes'] ?? null);
            $this->audit->logRequest($user);
            $this->success(['message' => 'Medication billing ' . $data['billing_status']]);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
