<?php

namespace App\Controllers;

use App\Services\PatientService;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;
use Respect\Validation\Validator as v;

class PatientController
{
    private PatientService $patientService;
    private AuditMiddleware $audit;

    public function __construct()
    {
        $this->patientService = new PatientService();
        $this->audit = new AuditMiddleware();
    }

    /**
     * List all patients (paginated)
     * GET /api/patients
     */
    public function index(object $user): void
    {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $patients = $this->patientService->listPatients($limit, $offset);

            $this->success([
                'patients' => $patients,
                'count' => count($patients),
                'limit' => $limit,
                'offset' => $offset
            ]);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Register new patient
     * POST /api/patients
     */
    public function create(object $user): void
    {
        try {
            // Check permissions
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_EDIT_PATIENTS);

            $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
            if (strpos($contentType, 'multipart/form-data') !== false) {
                $data = $_POST;
                if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                    $data['profile_picture'] = $this->handleImageUpload($_FILES['profile_picture']);
                }
            } else {
                $data = json_decode(file_get_contents('php://input'), true);
            }

            // Validate input using Respect\Validation
            $validator = v::key('first_name', v::stringType()->notEmpty())
                ->key('last_name', v::stringType()->notEmpty())
                ->key('date_of_birth', v::date('Y-m-d'))
                ->key('gender', v::in(['male', 'female', 'other']))
                ->key('nin', v::optional(v::oneOf(v::stringType()->regex('/^\d{11}$/'), v::equals(''))), false)
                ->key('email', v::optional(v::oneOf(v::email(), v::equals(''))), false);

            try {
                $validator->assert($data);
            } catch (\Respect\Validation\Exceptions\NestedValidationException $e) {
                $this->badRequest($e->getFullMessage());
                return;
            }

            $patient = $this->patientService->registerPatient($data);

            // Log audit trail
            $this->audit->logRequest($user, $patient['id']);

            $this->success($patient, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get patient by ID
     * GET /api/patients/{id}
     */
    public function getById(object $user, string $id): void
    {
        try {
            // Determine if user can see unmasked data
            $maskSensitive = !in_array($user->role, \App\Config\Roles::CAN_VIEW_SENSITIVE_DATA);

            $patient = $this->patientService->getPatientById($id, $maskSensitive);

            // Log data access
            $this->audit->logRequest($user, $id);

            $this->success($patient);

        } catch (\Exception $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * Search patients
     * GET /api/patients/search?mrn=xxx&last_name=xxx
     */
    public function search(object $user): void
    {
        try {
            $criteria = [
                'mrn' => $_GET['mrn'] ?? null,
                'last_name' => $_GET['last_name'] ?? null,
                'first_name' => $_GET['first_name'] ?? null,
                'date_of_birth' => $_GET['date_of_birth'] ?? null
            ];

            // Remove null values
            $criteria = array_filter($criteria);

            if (empty($criteria)) {
                $this->badRequest('At least one search criterion is required');
                return;
            }

            $patients = $this->patientService->searchPatients($criteria);

            // Log search
            $this->audit->logRequest($user);

            $this->success(['patients' => $patients, 'count' => count($patients)]);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Update patient
     * PUT /api/patients/{id}
     */
    public function update(object $user, string $id): void
    {
        try {
            // Check permissions
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_EDIT_PATIENTS);

            $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
            if (strpos($contentType, 'multipart/form-data') !== false) {
                $data = $_POST;
                if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                    $data['profile_picture'] = $this->handleImageUpload($_FILES['profile_picture']);
                }
            } else {
                $data = json_decode(file_get_contents('php://input'), true);
            }

            $patient = $this->patientService->updatePatient($id, $data);

            // Log audit trail
            $this->audit->logRequest($user, $id);

            $this->success($patient);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Create a minimal walk-in patient record
     * POST /api/patients/walk-in
     */
    public function createWalkIn(object $user): void
    {
        try {
            AuthMiddleware::requireRole($user, \App\Config\Roles::CAN_EDIT_PATIENTS);

            $data = json_decode(file_get_contents('php://input'), true);

            // Minimal validation
            $validator = v::key('first_name', v::stringType()->notEmpty())
                ->key('last_name', v::stringType()->notEmpty())
                ->key('date_of_birth', v::date('Y-m-d'))
                ->key('gender', v::in(['male', 'female', 'other']));

            try {
                $validator->assert($data);
            } catch (\Respect\Validation\Exceptions\NestedValidationException $e) {
                $this->badRequest($e->getFullMessage());
                return;
            }

            $patient = $this->patientService->registerWalkIn($data);

            // Log audit trail
            $this->audit->logRequest($user, $patient['id']);

            $this->success($patient, 201);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Delete patient (Super Admin only)
     * DELETE /api/patients/{id}
     */
    public function delete(object $user, string $id): void
    {
        try {
            if ($user->role !== \App\Config\Roles::SUPER_ADMIN) {
                $this->error('Forbidden: Only Super Admins can delete patients', 403);
                return;
            }

            $this->patientService->deletePatient($id);

            // Log audit trail
            $this->audit->logRequest($user, $id);

            $this->success(['message' => 'Patient record deleted successfully']);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Response helpers
    private function success(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $message, int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
    }

    private function badRequest(string $message): void
    {
        $this->error($message, 400);
    }

    private function handleImageUpload(array $file): string
    {
        $uploadDir = __DIR__ . '/../../public/uploads/patients/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = \Ramsey\Uuid\Uuid::uuid4()->toString() . '.' . $extension;
        $targetPath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new \RuntimeException('Failed to save profile picture');
        }

        return 'uploads/patients/' . $fileName;
    }
}
