<?php

namespace App\Services;

use App\Config\Database;
use App\Config\Roles;
use Ramsey\Uuid\Uuid;
use PDO;
use PDOException;

class UserService
{
    private PDO $db;
    private AuditService $auditService;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->auditService = new AuditService();
    }

    /**
     * Create a new user
     */
    public function createUser(array $data, string $createdBy): array
    {
        // Validate required fields
        $required = ['username', 'email', 'password', 'role'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required");
            }
        }

        $fullName = $data['full_name'] ?? null;

        // Validate role
        if (!in_array($data['role'], Roles::ALL_ROLES)) {
            throw new \InvalidArgumentException("Invalid role: {$data['role']}");
        }

        // Validate password strength
        if (strlen($data['password']) < 8) {
            throw new \InvalidArgumentException("Password must be at least 8 characters");
        }

        // Check if username already exists
        if ($this->usernameExists($data['username'])) {
            throw new \InvalidArgumentException("Username already exists");
        }

        // Check if email already exists
        if ($this->emailExists($data['email'])) {
            throw new \InvalidArgumentException("Email already exists");
        }

        try {
            $userId = Uuid::uuid4()->toString();
            $fullName = $data['full_name'] ?? $data['username'];
            
            $stmt = $this->db->prepare("
                INSERT INTO users (id, username, full_name, email, password_hash, role, is_active, created_at)
                VALUES (:id, :username, :full_name, :email, :password_hash, :role, :is_active, NOW())
            ");

            $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            $isActive = $data['is_active'] ?? true;

            $stmt->execute([
                'id' => $userId,
                'username' => $data['username'],
                'full_name' => $fullName,
                'email' => $data['email'],
                'password_hash' => $passwordHash,
                'role' => $data['role'],
                'is_active' => $isActive ? 1 : 0
            ]);

            // If role is doctor, auto-create a provider record
            if ($data['role'] === Roles::DOCTOR) {
                $this->ensureProviderRecord($userId, $data['username'], $data['specialty'] ?? null);
            }

            // Get the created user
            $user = $this->getUserById($userId);

            // Audit log
            $this->auditService->log(
                $createdBy,
                null,
                'CREATE',
                'user',
                $user['id'],
                ['username' => $data['username'], 'role' => $data['role']],
                201
            );

            return $user;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to create user: " . $e->getMessage());
        }
    }

    /**
     * Get all users (with optional filters)
     */
    public function getAllUsers(array $filters = []): array
    {
        $query = "SELECT u.id, u.username, u.full_name, u.email, u.profile_picture, u.role, u.is_active, u.last_login_at, u.created_at, u.updated_at,
                         p.specialty
                  FROM users u
                  LEFT JOIN providers p ON u.id = p.user_id AND p.deleted_at IS NULL
                  WHERE u.deleted_at IS NULL";
        
        $params = [];

        if (!empty($filters['role'])) {
            $query .= " AND role = :role";
            $params['role'] = $filters['role'];
        }

        if (isset($filters['is_active'])) {
            $query .= " AND is_active = :is_active";
            $params['is_active'] = $filters['is_active'] ? 1 : 0;
        }

        $query .= " ORDER BY created_at DESC";

        try {
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add display names
            foreach ($users as &$user) {
                $user['role_display'] = Roles::getDisplayName($user['role']);
                $user['is_active'] = (bool) $user['is_active'];
            }

            return $users;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch users: " . $e->getMessage());
        }
    }

    /**
     * Get user by ID
     */
    public function getUserById(string $userId): ?array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT id, username, full_name, email, profile_picture, role, is_active, mfa_enabled, 
                       last_login_at, last_login_ip, created_at, updated_at
                FROM users 
                WHERE id = :id AND deleted_at IS NULL
            ");
            
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                $user['role_display'] = Roles::getDisplayName($user['role']);
                $user['permissions'] = Roles::getPermissions($user['role']);
                $user['is_active'] = (bool) $user['is_active'];
                $user['mfa_enabled'] = (bool) $user['mfa_enabled'];
            }

            return $user ?: null;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to fetch user: " . $e->getMessage());
        }
    }

    /**
     * Update user
     */
    public function updateUser(string $userId, array $data, string $updatedBy): array
    {
        $user = $this->getUserById($userId);
        if (!$user) {
            throw new \InvalidArgumentException("User not found");
        }

        $allowedFields = ['email', 'role', 'is_active', 'full_name'];
        $updates = [];
        $params = ['id' => $userId];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'role' && !in_array($data[$field], Roles::ALL_ROLES)) {
                    throw new \InvalidArgumentException("Invalid role: {$data[$field]}");
                }
                
                if ($field === 'email' && $data[$field] !== $user['email']) {
                    if ($this->emailExists($data[$field])) {
                        throw new \InvalidArgumentException("Email already exists");
                    }
                }

                $updates[] = "{$field} = :{$field}";
                $params[$field] = $field === 'is_active' ? ($data[$field] ? 1 : 0) : $data[$field];
            }
        }

        if (empty($updates)) {
            return $this->getUserById($userId);
        }

        try {
            $query = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            // Sync provider record when role changes
            if (isset($data['role'])) {
                if ($data['role'] === Roles::DOCTOR) {
                    $this->ensureProviderRecord($userId, $user['username'], $data['specialty'] ?? null);
                } else {
                    // Soft-delete provider record if user is no longer a doctor
                    $this->removeProviderRecord($userId);
                }
            }

            // Audit log
            $this->auditService->log(
                $updatedBy,
                null,
                'UPDATE',
                'user',
                $userId,
                $data,
                200
            );

            // Sync provider record
            $this->syncProviderProfile($userId, $data['full_name'] ?? $user['full_name']);

            return $this->getUserById($userId);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to update user: " . $e->getMessage());
        }
    }

    /**
     * Deactivate user (soft delete)
     */
    public function deactivateUser(string $userId, string $deactivatedBy): bool
    {
        $user = $this->getUserById($userId);
        if (!$user) {
            throw new \InvalidArgumentException("User not found");
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE users 
                SET is_active = 0, updated_at = NOW() 
                WHERE id = :id
            ");
            
            $stmt->execute(['id' => $userId]);

            // Audit log
            $this->auditService->log(
                $deactivatedBy,
                null,
                'DEACTIVATE',
                'user',
                $userId,
                ['username' => $user['username']],
                200
            );

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to deactivate user: " . $e->getMessage());
        }
    }

    /**
     * Activate user
     */
    public function activateUser(string $userId, string $activatedBy): bool
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE users 
                SET is_active = 1, updated_at = NOW() 
                WHERE id = :id
            ");
            
            $stmt->execute(['id' => $userId]);

            // Audit log
            $this->auditService->log(
                $activatedBy,
                null,
                'ACTIVATE',
                'user',
                $userId,
                [],
                200
            );

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to activate user: " . $e->getMessage());
        }
    }

    /**
     * Check if username exists
     */
    private function usernameExists(string $username): bool
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE username = :username AND deleted_at IS NULL");
        $stmt->execute(['username' => $username]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Check if email exists
     */
    private function emailExists(string $email): bool
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE email = :email AND deleted_at IS NULL");
        $stmt->execute(['email' => $email]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Get user by username
     */
    private function getUserByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare("
            SELECT id, username, email, role, is_active, created_at
            FROM users 
            WHERE username = :username AND deleted_at IS NULL
        ");
        
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $user['role_display'] = Roles::getDisplayName($user['role']);
            $user['is_active'] = (bool) $user['is_active'];
        }

        return $user ?: null;
    }

    /**
     * Update own profile (username and email only)
     */
    public function updateProfile(string $userId, array $data): array
    {
        $user = $this->getUserById($userId);
        if (!$user) {
            throw new \InvalidArgumentException("User not found");
        }

        $allowedFields = ['username', 'email', 'full_name'];
        $updates = [];
        $params = ['id' => $userId];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'email' && $data[$field] !== $user['email']) {
                    if ($this->emailExists($data[$field])) {
                        throw new \InvalidArgumentException("Email already exists");
                    }
                }
                if ($field === 'username' && $data[$field] !== $user['username']) {
                    if ($this->usernameExists($data[$field])) {
                        throw new \InvalidArgumentException("Username already exists");
                    }
                }

                $updates[] = "{$field} = :{$field}";
                $params[$field] = $data[$field];
            }
        }

        if (empty($updates)) {
            return $this->getUserById($userId);
        }

        try {
            $query = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            $this->auditService->log($userId, null, 'UPDATE_PROFILE', 'user', $userId, $data, 200);

            // Sync provider record
            $this->syncProviderProfile($userId, $data['full_name'] ?? $user['full_name']);

            return $this->getUserById($userId);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to update profile: " . $e->getMessage());
        }
    }

    /**
     * Update user full name directly (used for synchronization)
     */
    public function updateUserFullName(string $userId, string $fullName): bool
    {
        try {
            $stmt = $this->db->prepare("UPDATE users SET full_name = :full_name, updated_at = NOW() WHERE id = :id");
            return $stmt->execute(['full_name' => $fullName, 'id' => $userId]);
        } catch (PDOException $e) {
            error_log("Failed to update user full name for {$userId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Change own password
     */
    public function changePassword(string $userId, string $currentPassword, string $newPassword): bool
    {
        // Fetch user with password hash
        $stmt = $this->db->prepare("SELECT id, password_hash FROM users WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new \InvalidArgumentException("User not found");
        }

        // Verify current password
        if (!password_verify($currentPassword, $user['password_hash'])) {
            throw new \InvalidArgumentException("Current password is incorrect");
        }

        // Validate new password
        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException("New password must be at least 8 characters");
        }

        try {
            $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt = $this->db->prepare("UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id");
            $stmt->execute(['hash' => $newHash, 'id' => $userId]);

            $this->auditService->log($userId, null, 'CHANGE_PASSWORD', 'user', $userId, null, 200);

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to change password: " . $e->getMessage());
        }
    }

    /**
     * Delete user permanently
     */
    public function deleteUser(string $userId, string $deletedBy): bool
    {
        $user = $this->getUserById($userId);
        if (!$user) {
            throw new \InvalidArgumentException("User not found");
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute(['id' => $userId]);

            // Audit log
            $this->auditService->log(
                $deletedBy,
                null,
                'DELETE',
                'user',
                $userId,
                ['username' => $user['username']],
                200
            );

            return true;
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to delete user: " . $e->getMessage());
        }
    }

    /**
     * Ensure a provider record exists for a doctor user
     */
    public function ensureProviderRecord(string $userId, string $username, ?string $specialty = null): void
    {
        try {
            $user = $this->getUserById($userId);
            
            // Check if active provider already exists
            $stmt = $this->db->prepare("SELECT id FROM providers WHERE user_id = :uid AND deleted_at IS NULL");
            $stmt->execute(['uid' => $userId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing && $specialty) {
                // Update specialization if provided
                $update = $this->db->prepare("UPDATE providers SET specialty = :spec, updated_at = NOW() WHERE id = :id");
                $update->execute(['spec' => $specialty, 'id' => $existing['id']]);
            } elseif (!$existing) {
                // Check for a soft-deleted provider record
                $stmtDeleted = $this->db->prepare("SELECT id FROM providers WHERE user_id = :uid AND deleted_at IS NOT NULL");
                $stmtDeleted->execute(['uid' => $userId]);
                $softDeleted = $stmtDeleted->fetch(PDO::FETCH_ASSOC);

                if ($softDeleted) {
                    // Reactivate soft-deleted provider
                    $reactivate = $this->db->prepare("UPDATE providers SET deleted_at = NULL, specialty = :spec, updated_at = NOW() WHERE id = :id");
                    $reactivate->execute(['spec' => $specialty ?? 'General Medicine', 'id' => $softDeleted['id']]);
                } else {
                    // Create new provider record
                    $providerId = Uuid::uuid4()->toString();
                    
                    $firstName = 'Provider';
                    $lastName = $username;
                    
                    if (!empty($user['full_name'])) {
                        $parts = explode(' ', trim($user['full_name']));
                        $firstName = $parts[0];
                        $lastName = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : 'Provider';
                    } else {
                        $nameParts = explode('@', $username);
                        $firstName = ucfirst($nameParts[0]);
                    }

                    $insert = $this->db->prepare("
                        INSERT INTO providers (id, user_id, first_name, last_name, specialty, credentials, created_at, updated_at)
                        VALUES (:id, :user_id, :first_name, :last_name, :specialty, :credentials, NOW(), NOW())
                    ");
                    $insert->execute([
                        'id' => $providerId,
                        'user_id' => $userId,
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'specialty' => $specialty ?? 'General Medicine',
                        'credentials' => 'MD'
                    ]);
                }
            }
            // If active provider already exists and no specialty update, do nothing
        } catch (\Exception $e) {
            error_log("Failed to ensure provider record for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Soft-delete the provider record when a user is no longer a doctor.
     */
    private function removeProviderRecord(string $userId): void
    {
        try {
            $stmt = $this->db->prepare("UPDATE providers SET deleted_at = NOW() WHERE user_id = :uid AND deleted_at IS NULL");
            $stmt->execute(['uid' => $userId]);
        } catch (\Exception $e) {
            error_log("Failed to remove provider record for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Synchronize user full name to provider record
     */
    private function syncProviderProfile(string $userId, ?string $fullName): void
    {
        if (empty($fullName)) return;

        try {
            $parts = explode(' ', trim($fullName));
            $firstName = $parts[0];
            $lastName = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : 'Provider';

            $stmt = $this->db->prepare("
                UPDATE providers 
                SET first_name = :first, last_name = :last, updated_at = NOW() 
                WHERE user_id = :uid AND deleted_at IS NULL
            ");
            $stmt->execute([
                'first' => $firstName,
                'last' => $lastName,
                'uid' => $userId
            ]);
        } catch (\Exception $e) {
            error_log("Failed to sync provider profile for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Update user profile picture
     */
    public function updateProfilePicture(string $userId, string $filename): bool
    {
        try {
            $stmt = $this->db->prepare("UPDATE users SET profile_picture = :pic, updated_at = NOW() WHERE id = :id");
            return $stmt->execute(['pic' => $filename, 'id' => $userId]);
        } catch (PDOException $e) {
            throw new \RuntimeException("Failed to update profile picture: " . $e->getMessage());
        }
    }
}
