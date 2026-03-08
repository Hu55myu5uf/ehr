<?php

namespace App\Controllers;

use App\Services\LabService;
use App\Config\Roles;

class LabController
{
    private LabService $labService;
    private \App\Services\ProviderService $providerService;

    public function __construct()
    {
        $this->labService = new LabService();
        $this->providerService = new \App\Services\ProviderService();
    }

    /**
     * Create a lab order
     * POST /api/labs/orders
     */
    public function createOrder(object $user): void
    {
        // Use sub or id property from auth object
        $userId = $user->sub ?? $user->id ?? null;

        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized: Invalid user session']);
            return;
        }

        // Doctors, nurses, receptionists, and lab attendants can order labs
        if (!in_array($user->role, Roles::CAN_CREATE_ENCOUNTERS) && 
            $user->role !== Roles::RECEPTIONIST &&
            $user->role !== Roles::LAB_ATTENDANT) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Insufficient permissions to order lab tests']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            // Get provider ID from user (if they are a provider)
            $providerId = $this->providerService->getProviderIdByUserId($userId);
            
            // Note: $providerId can be null for receptionists
            $order = $this->labService->createLabOrder($input, $providerId, $userId);

            http_response_code(201);
            echo json_encode([
                'message' => 'Lab order created successfully',
                'order' => $order
            ]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            error_log("Lab Order Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create lab order: ' . $e->getMessage()]);
        }
    }

    /**
     * Get pending lab orders
     * GET /api/labs/orders/pending
     */
    public function getPendingOrders(object $user): void
    {
        // Lab attendants, doctors, and nurses can view pending orders
        if (!Roles::hasPermission($user->role, 'manage_lab_results')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Insufficient permissions']);
            return;
        }

        try {
            $orders = $this->labService->getPendingLabOrders();

            http_response_code(200);
            echo json_encode([
                'count' => count($orders),
                'orders' => $orders
            ]);
        } catch (\Exception $e) {
            error_log("Laboratory Fetch Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch pending orders: ' . $e->getMessage()]);
        }
    }

    /**
     * Get completed lab orders
     * GET /api/labs/orders/completed
     */
    public function getCompletedOrders(object $user): void
    {
        if (!Roles::hasPermission($user->role, 'view_patients')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Insufficient permissions']);
            return;
        }

        try {
            $limit = (int)($_GET['limit'] ?? 50);
            $orders = $this->labService->getCompletedLabOrders($limit);

            http_response_code(200);
            echo json_encode([
                'count' => count($orders),
                'orders' => $orders
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch completed orders']);
        }
    }

    /**
     * Get lab orders for a patient
     * GET /api/labs/orders/patient/{id}
     */
    public function getPatientOrders(object $user, string $patientId): void
    {
        // Check if user can view patient data
        if (!Roles::hasPermission($user->role, 'view_patients')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Cannot view patient data']);
            return;
        }

        try {
            $orders = $this->labService->getPatientLabOrders($patientId);

            http_response_code(200);
            echo json_encode([
                'count' => count($orders),
                'orders' => $orders
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch lab orders']);
        }
    }

    /**
     * Get lab order by ID
     * GET /api/labs/orders/{id}
     */
    public function getOrder(object $user, string $orderId): void
    {
        if (!Roles::hasPermission($user->role, 'view_patients')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $order = $this->labService->getLabOrderById($orderId);

            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Lab order not found']);
                return;
            }

            http_response_code(200);
            echo json_encode($order);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch lab order']);
        }
    }

    /**
     * Update lab order status
     * PATCH /api/labs/orders/{id}/status
     */
    public function updateOrderStatus(object $user, string $orderId): void
    {
        if (!Roles::hasPermission($user->role, 'manage_lab_results')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['status'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Status is required']);
                return;
            }

            $this->labService->updateLabOrderStatus($orderId, $input['status'], $user->sub);

            http_response_code(200);
            echo json_encode(['message' => 'Order status updated successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update order status']);
        }
    }

    /**
     * Add lab results
     * POST /api/labs/results
     */
    public function addResult(object $user): void
    {
        if (!Roles::hasPermission($user->role, 'manage_lab_results')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Cannot add lab results']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $result = $this->labService->addLabResult($input, $user->sub);

            http_response_code(201);
            echo json_encode([
                'message' => 'Lab result added successfully',
                'result' => $result
            ]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add lab result']);
        }
    }

    /**
     * Verify lab results
     * POST /api/labs/results/{id}/verify
     */
    public function verifyResult(object $user, string $resultId): void
    {
        // Only doctors and super admins can verify results
        if ($user->role !== Roles::DOCTOR && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only doctors can verify lab results']);
            return;
        }

        try {
            $this->labService->verifyLabResults($resultId, $user->sub);

            http_response_code(200);
            echo json_encode(['message' => 'Lab result verified successfully']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to verify lab result']);
        }
    }

    /**
     * Get lab orders pending invoicing
     * GET /api/labs/invoicing/pending
     */
    public function getInvoicingQueue(object $user): void
    {
        if ($user->role !== Roles::LAB_ATTENDANT && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $orders = $this->labService->getInvoicingQueue();
            echo json_encode(['orders' => $orders]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Get lab orders for a patient filtered by invoicing state
     * GET /api/labs/patient/{id}/invoicing
     */
    public function getPatientInvoicingQueue(object $user, string $patientId): void
    {
        if ($user->role !== Roles::LAB_ATTENDANT && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $orders = $this->labService->getLabOrdersByPatientId($patientId, true);
            echo json_encode(['orders' => $orders]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Generate invoice for selected lab orders
     * POST /api/labs/invoice
     */
    public function generateInvoice(object $user): void
    {
        if ($user->role !== Roles::LAB_ATTENDANT && $user->role !== Roles::SUPER_ADMIN) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $patientId = $input['patient_id'] ?? null;
            $orderIds = $input['order_ids'] ?? [];

            if (!$patientId || empty($orderIds)) {
                http_response_code(400);
                echo json_encode(['error' => 'Patient ID and Order IDs are required']);
                return;
            }

            $billingService = new \App\Services\BillingService();
            $bill = $billingService->generateLabInvoice($patientId, $orderIds, $user->sub);
            
            // Mark as invoiced
            $this->labService->markAsInvoiced($orderIds, $user->sub);

            http_response_code(201);
            echo json_encode([
                'message' => 'Invoice generated successfully',
                'bill' => $bill
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

