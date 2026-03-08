<?php

namespace App\Controllers;

use App\Services\UserService;
use App\Services\MfaService;
use App\Config\Roles;

class UserController
{
    private UserService $userService;
    private MfaService $mfaService;

    public function __construct()
    {
        $this->userService = new UserService();
        $this->mfaService = new MfaService();
    }

    /**
     * Create a new user (Super Admin only)
     * POST /api/users
     */
    public function create(array $user): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only Super Admins can create users']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $newUser = $this->userService->createUser($input, $user['id']);
            http_response_code(201);
            echo json_encode(['message' => 'User created successfully', 'user' => $newUser]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create user']);
        }
    }

    /**
     * Get all users (Super Admin only)
     * GET /api/users
     */
    public function index(array $user): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Only Super Admins can view all users']);
            return;
        }

        try {
            $filters = [];
            if (isset($_GET['role'])) $filters['role'] = $_GET['role'];
            if (isset($_GET['is_active'])) $filters['is_active'] = $_GET['is_active'] === 'true' || $_GET['is_active'] === '1';

            $users = $this->userService->getAllUsers($filters);
            http_response_code(200);
            echo json_encode(['count' => count($users), 'users' => $users]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch users']);
        }
    }

    /**
     * Get user by ID (Super Admin only)
     * GET /api/users/{id}
     */
    public function show(array $user, string $userId): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $targetUser = $this->userService->getUserById($userId);
            if (!$targetUser) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }
            http_response_code(200);
            echo json_encode($targetUser);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch user']);
        }
    }

    /**
     * Update user (Super Admin only)
     * PUT /api/users/{id}
     */
    public function update(array $user, string $userId): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $updatedUser = $this->userService->updateUser($userId, $input, $user['id']);
            http_response_code(200);
            echo json_encode(['message' => 'User updated successfully', 'user' => $updatedUser]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update user']);
        }
    }

    /**
     * Deactivate user (Super Admin only)
     * PATCH /api/users/{id}/deactivate
     */
    public function deactivate(array $user, string $userId): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        if ($user['id'] === $userId) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot deactivate your own account']);
            return;
        }

        try {
            $this->userService->deactivateUser($userId, $user['id']);
            http_response_code(200);
            echo json_encode(['message' => 'User deactivated successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to deactivate user']);
        }
    }

    /**
     * Activate user (Super Admin only)
     * PATCH /api/users/{id}/activate
     */
    public function activate(array $user, string $userId): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            $this->userService->activateUser($userId, $user['id']);
            http_response_code(200);
            echo json_encode(['message' => 'User activated successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to activate user']);
        }
    }

    /**
     * Update own profile (any authenticated user)
     * PUT /api/users/profile
     */
    public function updateProfile(array $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                return;
            }

            $updatedUser = $this->userService->updateProfile($user['id'], $input);
            http_response_code(200);
            echo json_encode(['message' => 'Profile updated successfully', 'user' => $updatedUser]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update profile']);
        }
    }

    /**
     * Change own password (any authenticated user)
     * PUT /api/users/password
     */
    public function changePassword(array $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['current_password']) || !isset($input['new_password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Current password and new password are required']);
                return;
            }

            $this->userService->changePassword($user['id'], $input['current_password'], $input['new_password']);
            http_response_code(200);
            echo json_encode(['message' => 'Password changed successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to change password']);
        }
    }

    /**
     * Setup MFA (generate secret + QR code URI)
     * POST /api/users/mfa/setup
     */
    public function setupMfa(array $user): void
    {
        try {
            $userInfo = $this->userService->getUserById($user['id']);
            if (!$userInfo) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                return;
            }

            $result = $this->mfaService->setupMfa($user['id'], $userInfo['username']);
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode($result);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to setup MFA']);
        }
    }

    /**
     * Enable MFA (verify code + save secret)
     * POST /api/users/mfa/enable
     */
    public function enableMfa(array $user): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['secret']) || !isset($input['code'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Secret and verification code are required']);
                return;
            }

            if (!$this->mfaService->verifyCode($input['secret'], $input['code'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid verification code']);
                return;
            }

            $this->mfaService->enableMfa($user['id'], $input['secret']);
            http_response_code(200);
            echo json_encode(['message' => 'MFA enabled successfully']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to enable MFA']);
        }
    }

    /**
     * Disable MFA
     * DELETE /api/users/mfa
     */
    public function disableMfa(array $user): void
    {
        try {
            $this->mfaService->disableMfa($user['id']);
            http_response_code(200);
            echo json_encode(['message' => 'MFA disabled successfully']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to disable MFA']);
        }
    }

    /**
     * Delete user permanently (Super Admin only)
     * DELETE /api/users/{id}
     */
    public function delete(array $user, string $userId): void
    {
        if (!Roles::hasPermission($user['role'], 'manage_users')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        if ($user['id'] === $userId) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete your own account']);
            return;
        }

        try {
            $this->userService->deleteUser($userId, $user['id']);
            http_response_code(200);
            echo json_encode(['message' => 'User deleted successfully']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete user']);
        }
    }

    /**
     * Upload profile picture
     * POST /api/users/profile-picture
     */
    public function uploadProfilePicture(array $user): void
    {
        try {
            if (!isset($_FILES['profile_picture'])) {
                http_response_code(400);
                echo json_encode(['error' => 'No file uploaded']);
                return;
            }

            $file = $_FILES['profile_picture'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!in_array($file['type'], $allowedTypes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid file type. Only JPG, PNG, and WEBP allowed.']);
                return;
            }

            // 2MB limit
            if ($file['size'] > 2 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['error' => 'File size exceeds 2MB limit']);
                return;
            }

            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = $user['id'] . '_' . time() . '.' . $extension;
            $uploadDir = __DIR__ . '/../../public/uploads/profiles/';
            
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $targetPath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $this->userService->updateProfilePicture($user['id'], $filename);
                http_response_code(200);
                echo json_encode(['message' => 'Profile picture uploaded successfully', 'profile_picture' => $filename]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to move uploaded file']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to upload profile picture: ' . $e->getMessage()]);
        }
    }
}
