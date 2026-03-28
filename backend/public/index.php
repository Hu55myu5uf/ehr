<?php

/**
 * EHR System - Main Entry Point (index.php)
 * Place this file in: backend/public/index.php
 */


require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use App\Controllers\AuthController;
use App\Controllers\PatientController;
use App\Controllers\EncounterController;
use App\Controllers\ClinicalNoteController;
use App\Controllers\UserController;
use App\Controllers\LabController;
use App\Controllers\PharmacyController;
use App\Controllers\DashboardController;
use App\Controllers\AppointmentController;
use App\Controllers\ConsultationController;
use App\Controllers\NursingController;
use App\Controllers\BillingController;
use App\Controllers\AttachmentController;
use App\Controllers\AdmissionController;
use App\Controllers\ReportController;
use App\Controllers\InsuranceController;
use App\Controllers\ProviderController;
use App\Controllers\TreatmentSheetController;
use App\Controllers\MonitoringController;
use App\Controllers\InventoryController;
use App\Controllers\PriceListController;
use App\Controllers\WardController;
use App\Controllers\SettingsController;
use App\Controllers\AIController;
use App\Controllers\WalletController;
use App\Controllers\AuditController;
use App\Controllers\WalkInController;

// Load environment variables (Optional for Render)
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} elseif (file_exists(__DIR__ . '/../../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../..');
    $dotenv->load();
}

// Initialize Audit Middleware globally
$auditMiddleware = new AuditMiddleware();
register_shutdown_function(function() use ($auditMiddleware) {
    // Only log if auth was successful (user object exists) and it's an API request
    global $user, $uri;
    if (isset($user) && strpos($uri, '/api/') === 0 && $uri !== '/api/audit/logs') {
        $auditMiddleware->logRequest($user);
    }
});

// Error handling
$appDebug = ($_ENV['APP_DEBUG'] ?? 'false') === 'true';
error_reporting($appDebug ? E_ALL : 0);
ini_set('display_errors', $appDebug ? '1' : '0');

// Flexible CORS Headers for Vercel <-> InfinityFree
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && isset($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}
$requestUri = $_SERVER['REQUEST_URI'];
$uriPath = parse_url($requestUri, PHP_URL_PATH);

// Robuster internal URI mapping
if (preg_match('#/public(/api/.*)$#', $uriPath, $matches)) {
    $uri = $matches[1];
} else {
    $pos = strpos($uriPath, '/api/');
    if ($pos !== false) {
        $uri = substr($uriPath, $pos);
    } else {
        $uri = $uriPath;
    }
}

// Simple router
try {
    // ──────────────────────────────────
    // Public routes (no auth required)
    // ──────────────────────────────────
    if ($uri === '/api/auth/login' && $method === 'POST') {
        $controller = new AuthController();
        $controller->login();
        exit;
    }

    if ($uri === '/api/auth/logout' && $method === 'POST') {
        $controller = new AuthController();
        $controller->logout();
        exit;
    }

    if ($uri === '/api/auth/verify-mfa' && $method === 'POST') {
        $controller = new AuthController();
        $controller->verifyMfa();
        exit;
    }

    if ($uri === '/api/auth/refresh' && $method === 'POST') {
        $controller = new AuthController();
        $controller->refresh();
        exit;
    }

    if ($uri === '/api/health' && $method === 'GET') {
        // One-time seed for admin if table is empty
        try {
            $db = \App\Config\Database::getInstance()->getConnection();
            $count = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
            if ($count == 0) {
                $passHash = password_hash('password', PASSWORD_BCRYPT);
                $db->exec("INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES (UUID(), 'admin', 'admin@ehr.com', '$passHash', 'super_admin', 1)");
            }
        } catch (\Exception $e) {
            error_log("Seed failed: " . $e->getMessage());
        }

        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'healthy',
            'timestamp' => date('c'),
            'version' => '1.1.1-HEARTBEAT'
        ]);
        exit;
    }

    // ──────────────────────────────────
    // Protected routes (auth required)
    // ──────────────────────────────────
    $authMiddleware = new AuthMiddleware();
    $user = $authMiddleware->handle();

    if (!$user) {
        exit; // Auth middleware already sent 401 response
    }

    // Convert user object to array for controllers that expect arrays
    $userArray = [
        'id' => $user->sub,
        'username' => $user->username,
        'role' => $user->role
    ];

    // ── Auth routes ──
    if (preg_match('#^/api/auth/me$#', $uri) && $method === 'GET') {
        $controller = new AuthController();
        $controller->me($user);
    }

    // ── Dashboard routes ──
    elseif ($uri === '/api/dashboard/stats' && $method === 'GET') {
        $controller = new DashboardController();
        $controller->getStats($user);
    }

    // ── Patient routes ──
    elseif ($uri === '/api/patients' && $method === 'GET') {
        $controller = new PatientController();
        $controller->index($user);
    }
    elseif ($uri === '/api/patients' && $method === 'POST') {
        $controller = new PatientController();
        $controller->create($user);
    }
    elseif ($uri === '/api/patients/walk-in' && $method === 'POST') {
        $controller = new PatientController();
        $controller->createWalkIn($user);
    }
    elseif ($uri === '/api/patients/search' && $method === 'GET') {
        $controller = new PatientController();
        $controller->search($user);
    }
    elseif (preg_match('#^/api/patients/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new PatientController();
        $controller->getById($user, $matches[1]);
    }
    elseif (preg_match('#^/api/patients/([0-9a-f-]+)$#', $uri, $matches) && $method === 'DELETE') {
        $controller = new PatientController();
        $controller->delete($user, $matches[1]);
    }
    elseif (preg_match('#^/api/patients/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new PatientController();
        $controller->update($user, $matches[1]);
    }
    
    // ── Encounter routes ──
    elseif ($uri === '/api/encounters/walk-in' && $method === 'POST') {
        $controller = new EncounterController();
        $controller->createWalkIn($user);
    }
    elseif ($uri === '/api/encounters' && $method === 'GET') {
        $controller = new EncounterController();
        $controller->index($user);
    }
    elseif ($uri === '/api/encounters' && $method === 'POST') {
        $controller = new EncounterController();
        $controller->create($user);
    }
    elseif (preg_match('#^/api/encounters/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new EncounterController();
        $controller->getById($user, $matches[1]);
    }
    elseif (preg_match('#^/api/encounters/patient/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new EncounterController();
        $controller->getPatientEncounters($user, $matches[1]);
    }
    elseif (preg_match('#^/api/encounters/patient/([0-9a-f-]+)/context$#', $uri, $matches) && $method === 'GET') {
        $controller = new EncounterController();
        $controller->getPatientContext($user, $matches[1]);
    }
    elseif (preg_match('#^/api/encounters/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PATCH') {
        $controller = new EncounterController();
        $controller->update($user, $matches[1]);
    }
    elseif (preg_match('#^/api/encounters/([0-9a-f-]+)/close$#', $uri, $matches) && $method === 'POST') {
        $controller = new EncounterController();
        $controller->close($user, $matches[1]);
    }
    
    // ── Clinical Note routes ──
    elseif ($uri === '/api/notes' && $method === 'POST') {
        $controller = new ClinicalNoteController();
        $controller->create($user);
    }
    elseif (preg_match('#^/api/notes/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new ClinicalNoteController();
        $controller->getById($user, $matches[1]);
    }
    elseif (preg_match('#^/api/notes/encounter/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new ClinicalNoteController();
        $controller->getEncounterNotes($user, $matches[1]);
    }
    elseif (preg_match('#^/api/notes/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new ClinicalNoteController();
        $controller->update($user, $matches[1]);
    }
    elseif (preg_match('#^/api/notes/([0-9a-f-]+)/sign$#', $uri, $matches) && $method === 'POST') {
        $controller = new ClinicalNoteController();
        $controller->sign($user, $matches[1]);
    }
    elseif (preg_match('#^/api/notes/([0-9a-f-]+)/amend$#', $uri, $matches) && $method === 'POST') {
        $controller = new ClinicalNoteController();
        $controller->amend($user, $matches[1]);
    }
    
    // ── User Management routes ──
    // Self-service routes (must come BEFORE /api/users/{id} patterns)
    elseif ($uri === '/api/users/profile' && $method === 'PUT') {
        $controller = new UserController();
        $controller->updateProfile($userArray);
    }
    elseif ($uri === '/api/users/profile-picture' && $method === 'POST') {
        $controller = new UserController();
        $controller->uploadProfilePicture($userArray);
    }
    elseif ($uri === '/api/users/password' && $method === 'PUT') {
        $controller = new UserController();
        $controller->changePassword($userArray);
    }
    elseif ($uri === '/api/users/mfa/setup' && $method === 'POST') {
        $controller = new UserController();
        $controller->setupMfa($userArray);
    }
    elseif ($uri === '/api/users/mfa/enable' && $method === 'POST') {
        $controller = new UserController();
        $controller->enableMfa($userArray);
    }
    elseif ($uri === '/api/users/mfa' && $method === 'DELETE') {
        $controller = new UserController();
        $controller->disableMfa($userArray);
    }
    // Admin routes
    elseif ($uri === '/api/users' && $method === 'POST') {
        $controller = new UserController();
        $controller->create($userArray);
    }
    elseif ($uri === '/api/users' && $method === 'GET') {
        $controller = new UserController();
        $controller->index($userArray);
    }
    elseif (preg_match('#^/api/users/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new UserController();
        $controller->show($userArray, $matches[1]);
    }
    elseif (preg_match('#^/api/users/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new UserController();
        $controller->update($userArray, $matches[1]);
    }
    elseif (preg_match('#^/api/users/([0-9a-f-]+)$#', $uri, $matches) && $method === 'DELETE') {
        $controller = new UserController();
        $controller->delete($userArray, $matches[1]);
    }
    elseif (preg_match('#^/api/users/([0-9a-f-]+)/deactivate$#', $uri, $matches) && $method === 'PATCH') {
        $controller = new UserController();
        $controller->deactivate($userArray, $matches[1]);
    }
    elseif (preg_match('#^/api/users/([0-9a-f-]+)/activate$#', $uri, $matches) && $method === 'PATCH') {
        $controller = new UserController();
        $controller->activate($userArray, $matches[1]);
    }
    
    // ── Lab Management routes ──
    elseif ($uri === '/api/labs/orders' && $method === 'POST') {
        $controller = new LabController();
        $controller->createOrder($user);
    }
    elseif ($uri === '/api/labs/orders/pending' && $method === 'GET') {
        $controller = new LabController();
        $controller->getPendingOrders($user);
    }
    elseif ($uri === '/api/labs/orders/awaiting-payment' && $method === 'GET') {
        $controller = new LabController();
        $controller->listAwaitingPayment($user);
    }
    elseif (preg_match('#^/api/labs/orders/patient/([^/]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new LabController();
        $controller->getPatientOrders($user, $matches[1]);
    }
    elseif (preg_match('#^/api/labs/orders/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new LabController();
        $controller->getOrder($user, $matches[1]);
    }
    elseif (preg_match('#^/api/labs/orders/([0-9a-f-]+)/status$#', $uri, $matches) && $method === 'PATCH') {
        $controller = new LabController();
        $controller->updateOrderStatus($user, $matches[1]);
    }
    elseif ($uri === '/api/labs/results' && $method === 'POST') {
        $controller = new LabController();
        $controller->addResult($user);
    }
    elseif (preg_match('#^/api/labs/results/([0-9a-f-]+)/verify$#', $uri, $matches) && $method === 'POST') {
        $controller = new LabController();
        $controller->verifyResult($user, $matches[1]);
    }
    elseif ($uri === '/api/labs/invoicing/pending' && $method === 'GET') {
        $controller = new LabController();
        $controller->getInvoicingQueue($user);
    }
    elseif (preg_match('#^/api/labs/patient/([^/]+)/invoicing$#', $uri, $matches) && $method === 'GET') {
        $controller = new LabController();
        $controller->getPatientInvoicingQueue($user, $matches[1]);
    }
    elseif ($uri === '/api/labs/invoice' && $method === 'POST') {
        $controller = new LabController();
        $controller->generateInvoice($user);
    }
    
    // ── Medication/Pharmacy routes ──
    elseif ($uri === '/api/medications' && $method === 'POST') {
        $controller = new PharmacyController();
        $controller->prescribe($user);
    }
    elseif ($uri === '/api/medications/pending' && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getPending($user);
    }
    elseif ($uri === '/api/medications/history' && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getHistory($user);
    }
    elseif (preg_match('#^/api/medications/patient/([^/]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getPatientMedications($user, $matches[1]);
    }
    elseif (preg_match('#^/api/medications/patient/([^/]+)/pending$#', $uri, $matches) && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getPatientPrescriptions($user, $matches[1]);
    }
    elseif ($uri === '/api/pharmacy/orders/awaiting-payment' && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->listAwaitingPayment($user);
    }
    elseif ($uri === '/api/pharmacy/invoicing/pending' && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getInvoicingQueue($user);
    }
    elseif ($uri === '/api/pharmacy/invoice' && $method === 'POST') {
        $controller = new PharmacyController();
        $controller->generateInvoice($user);
    }
    elseif (preg_match('#^/api/medications/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new PharmacyController();
        $controller->getMedication($user, $matches[1]);
    }
    elseif (preg_match('#^/api/medications/([0-9a-f-]+)/dispense$#', $uri, $matches) && $method === 'POST') {
        $controller = new PharmacyController();
        $controller->dispense($user, $matches[1]);
    }
    elseif (preg_match('#^/api/medications/([0-9a-f-]+)/refill$#', $uri, $matches) && $method === 'POST') {
        $controller = new PharmacyController();
        $controller->refill($user, $matches[1]);
    }

    // ── Inventory routes ──
    elseif ($uri === '/api/inventory' && $method === 'GET') {
        $controller = new InventoryController();
        $controller->index($user);
    }
    elseif ($uri === '/api/inventory/add' && $method === 'POST') {
        $controller = new InventoryController();
        $controller->store($user);
    }
    elseif (preg_match('#^/api/inventory/([0-9a-f-]+)$#', $uri, $matches) && $method === 'DELETE') {
        $controller = new InventoryController();
        $controller->delete($user, $matches[1]);
    }
    elseif (preg_match('#^/api/inventory/([0-9a-f-]+)/update$#', $uri, $matches) && $method === 'POST') {
        $controller = new InventoryController();
        $controller->update($user, $matches[1]);
    }
    elseif (preg_match('#^/api/medications/([0-9a-f-]+)/discontinue$#', $uri, $matches) && $method === 'POST') {
        $controller = new PharmacyController();
        $controller->discontinue($user, $matches[1]);
    }


    // ── Monitoring routes ──
    elseif ($uri === '/api/monitoring' && $method === 'POST') {
        $controller = new MonitoringController();
        $controller->store($user);
    }
    elseif (preg_match('#^/api/monitoring/encounter/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new MonitoringController();
        $controller->getByEncounter($user, $matches[1]);
    }
    
    // ── Ward Management routes ──
    elseif ($uri === '/api/wards' && $method === 'GET') {
        $controller = new WardController();
        $controller->index($user);
    }
    elseif (preg_match('#^/api/wards/([0-9a-f-]+)/beds$#', $uri, $matches) && $method === 'GET') {
        $controller = new WardController();
        $controller->beds($matches[1], $user);
    }
    elseif ($uri === '/api/wards/admit' && $method === 'POST') {
        $controller = new WardController();
        $controller->admit($user);
    }
    elseif (preg_match('#^/api/wards/discharge/([0-9a-f-]+)$#', $uri, $matches) && $method === 'POST') {
        $controller = new WardController();
        $controller->discharge($matches[1], $user);
    }
    
    // ── Report routes ──
    elseif ($uri === '/api/reports/funds-statistics' && $method === 'GET') {
        $controller = new ReportController();
        $controller->getFundsStatistics($user);
    }
    elseif ($uri === '/api/reports/comprehensive' && $method === 'GET') {
        $controller = new ReportController();
        $controller->getComprehensiveReport($user);
    }
    elseif ($uri === '/api/reports/performance' && $method === 'GET') {
        $controller = new ReportController();
        $controller->getPerformanceOverview($user);
    }

    // ── Insurance routes ──
    elseif ($uri === '/api/insurance/providers' && $method === 'GET') {
        $controller = new InsuranceController();
        $controller->getProviders($user);
    }
    elseif ($uri === '/api/insurance/providers' && $method === 'POST') {
        $controller = new InsuranceController();
        $controller->createProvider($user);
    }
    elseif (preg_match('#^/api/insurance/providers/([^/]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new InsuranceController();
        $controller->updateProvider($user, $matches[1]);
    }
    elseif ($uri === '/api/insurance/link-patient' && $method === 'POST') {
        $controller = new InsuranceController();
        $controller->linkPatient($user);
    }
    elseif ($uri === '/api/insurance/claims-report' && $method === 'GET') {
        $controller = new InsuranceController();
        $controller->getClaimsReport($user);
    }

    // ── Provider routes ──
    elseif ($uri === '/api/providers' && $method === 'GET') {
        $controller = new ProviderController();
        $controller->index($user);
    }
    elseif (preg_match('#^/api/providers/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new ProviderController();
        $controller->update($user, $matches[1]);
    }

    // ── Appointment routes ──
    elseif ($uri === '/api/appointments' && $method === 'POST') {
        $controller = new AppointmentController();
        $controller->create($user);
    }
    elseif ($uri === '/api/appointments' && $method === 'GET') {
        $controller = new AppointmentController();
        $controller->index($user);
    }
    elseif ($uri === '/api/appointments/today' && $method === 'GET') {
        $controller = new AppointmentController();
        $controller->today($user);
    }
    elseif (preg_match('#^/api/appointments/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new AppointmentController();
        $controller->show($user, $matches[1]);
    }
    elseif (preg_match('#^/api/appointments/([0-9a-f-]+)/status$#', $uri, $matches) && $method === 'PATCH') {
        $controller = new AppointmentController();
        $controller->updateStatus($user, $matches[1]);
    }
    
    // ── Consultation routes ──
    elseif ($uri === '/api/consultations' && $method === 'GET') {
        $controller = new ConsultationController();
        $controller->index($user);
    }
    elseif (preg_match('#^/api/consultations/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new ConsultationController();
        $controller->show($user, $matches[1]);
    }
    elseif (preg_match('#^/api/consultations/([0-9a-f-]+)$#', $uri, $matches) && $method === 'PUT') {
        $controller = new ConsultationController();
        $controller->save($user, $matches[1]);
    }
    elseif (preg_match('#^/api/consultations/([0-9a-f-]+)/complete$#', $uri, $matches) && $method === 'POST') {
        $controller = new ConsultationController();
        $controller->complete($user, $matches[1]);
    }
    
    // ── Attachment routes ──
    elseif ($uri === '/api/attachments' && $method === 'POST') {
        $controller = new AttachmentController();
        $controller->upload($userArray);
    }
    elseif (preg_match('#^/api/attachments/encounter/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new AttachmentController();
        $controller->getByEncounter($userArray, $matches[1]);
    }
    elseif (preg_match('#^/api/attachments/([0-9a-f-]+)$#', $uri, $matches) && $method === 'DELETE') {
        $controller = new AttachmentController();
        $controller->delete($userArray, $matches[1]);
    }
    
    // ── Nursing routes ──
    elseif ($uri === '/api/nursing/patients' && $method === 'GET') {
        $controller = new NursingController();
        $controller->activePatients($user);
    }
    elseif (preg_match('#^/api/nursing/patient/([0-9a-f-]+)/notes$#', $uri, $matches) && $method === 'GET') {
        $controller = new NursingController();
        $controller->patientNotes($user, $matches[1]);
    }
    elseif ($uri === '/api/nursing/notes' && $method === 'POST') {
        $controller = new NursingController();
        $controller->addNote($user);
    }

    // ── Treatment Sheet (MAR) routes ──
    elseif (preg_match('#^/api/treatment-sheets/encounter/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new TreatmentSheetController();
        $controller->getByEncounter($user, $matches[1]);
    }
    elseif (preg_match('#^/api/treatment-sheets/([0-9a-f-]+)/medications$#', $uri, $matches) && $method === 'POST') {
        $controller = new TreatmentSheetController();
        $controller->addMedication($user, $matches[1]);
    }
    elseif (preg_match('#^/api/treatment-sheets/medications/([0-9a-f-]+)/administer$#', $uri, $matches) && $method === 'POST') {
        $controller = new TreatmentSheetController();
        $controller->administer($user, $matches[1]);
    }
    
    // ── Billing routes ──
    elseif ($uri === '/api/billing' && $method === 'GET') {
        $controller = new BillingController();
        $controller->index($user);
    }
    elseif ($uri === '/api/billing/generate' && $method === 'POST') {
        $controller = new BillingController();
        $controller->generate($user);
    }
    elseif ($uri === '/api/billing/generate-direct' && $method === 'POST') {
        $controller = new BillingController();
        $controller->generateDirect($user);
    }
    elseif ($uri === '/api/billing/pending-verification' && $method === 'GET') {
        $controller = new BillingController();
        $controller->pendingVerification($user);
    }
    elseif (preg_match('#^/api/billing/verify-lab/([0-9a-f-]+)$#', $uri, $matches) && $method === 'POST') {
        $controller = new BillingController();
        $controller->verifyLabOrder($user, $matches[1]);
    }
    elseif (preg_match('#^/api/billing/verify-medication/([0-9a-f-]+)$#', $uri, $matches) && $method === 'POST') {
        $controller = new BillingController();
        $controller->verifyMedication($user, $matches[1]);
    }
    elseif (preg_match('#^/api/billing/encounter/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new BillingController();
        $controller->byEncounter($user, $matches[1]);
    }
    elseif (preg_match('#^/api/billing/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new BillingController();
        $controller->show($user, $matches[1]);
    }
    elseif (preg_match('#^/api/billing/([0-9a-f-]+)/pay$#', $uri, $matches) && $method === 'POST') {
        $controller = new BillingController();
        $controller->pay($user, $matches[1]);
    }
    
    // ── Wallet routes ──
    elseif ($uri === '/api/wallet/deposit' && $method === 'POST') {
        $controller = new WalletController();
        $controller->deposit($userArray);
    }
    elseif (preg_match('#^/api/wallet/history/([0-9a-f-]+)$#', $uri, $matches) && $method === 'GET') {
        $controller = new WalletController();
        $controller->history($userArray, $matches[1]);
    }
    
    // ── Audit Logs routes ──
    elseif ($uri === '/api/audit/logs' && $method === 'GET') {
        $controller = new AuditController();
        $controller->index($user);
    }
    
    // ── Laboratory routes ──
    elseif ($uri === '/api/labs/orders/completed' && $method === 'GET') {
        $controller = new LabController();
        $controller->getCompletedOrders($user);
    }
    
    // ── Price List routes ──
    elseif ($uri === '/api/prices' && $method === 'GET') {
        $controller = new PriceListController();
        $controller->index($user);
    }
    elseif ($uri === '/api/prices/update' && $method === 'POST') {
        $controller = new PriceListController();
        $controller->update($user);
    }
    elseif ($uri === '/api/prices/init' && $method === 'POST') {
        $controller = new PriceListController();
        $controller->init();
    }
    
    // ── Admission routes ──
    elseif ($uri === '/api/admissions' && $method === 'GET') {
        $controller = new AdmissionController();
        $controller->index($user);
    }
    elseif (preg_match('#^/api/admissions/([0-9a-f-]+)/activity$#', $uri, $matches) && $method === 'GET') {
        $controller = new AdmissionController();
        $controller->activity($matches[1], $user);
    }
    elseif ($uri === '/api/admissions/history' && $method === 'GET') {
        $controller = new AdmissionController();
        $controller->history($user);
    }

    // ── Settings routes ──
    elseif ($uri === '/api/settings' && $method === 'GET') {
        $controller = new SettingsController();
        $controller->getSettings($user);
    }
    elseif ($uri === '/api/settings/update' && $method === 'POST') {
        $controller = new SettingsController();
        $controller->updateSettings($user);
    }

    // ── AI routes ──
    elseif ($uri === '/api/ai/analyze' && $method === 'POST') {
        $controller = new AIController();
        $controller->analyzeConsultation($user);
    }
    elseif ($uri === '/api/ai/help' && $method === 'POST') {
        $controller = new AIController();
        $controller->getSystemHelp($user);
    }
    
    // ── Walk-in routes ──
    elseif ($uri === '/api/walk-in/consultation' && $method === 'POST') {
        $controller = new WalkInController();
        $controller->consultation($user);
    }
    elseif ($uri === '/api/walk-in/lab-tests' && $method === 'POST') {
        $controller = new WalkInController();
        $controller->labTests($user);
    }
    elseif ($uri === '/api/walk-in/lab-tests/existing' && $method === 'POST') {
        $controller = new WalkInController();
        $controller->labTestsExisting($user);
    }
    elseif ($uri === '/api/walk-in/lab-catalog' && $method === 'GET') {
        $controller = new WalkInController();
        $controller->labCatalog($user);
    }
    elseif ($uri === '/api/walk-in/pharmacy' && $method === 'POST') {
        $controller = new WalkInController();
        $controller->pharmacy($user);
    }
    elseif ($uri === '/api/walk-in/pharmacy/existing' && $method === 'POST') {
        $controller = new WalkInController();
        $controller->pharmacyExisting($user);
    }
    elseif ($uri === '/api/walk-in/med-catalog' && $method === 'GET') {
        $controller = new WalkInController();
        $controller->medicationCatalog($user);
    }
    
    // 404 Not Found
    else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Route not found']);
    }

} catch (\Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'debug_info' => 'Check Render Logs for DSN'
    ]);
    error_log("EHR System Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
}
