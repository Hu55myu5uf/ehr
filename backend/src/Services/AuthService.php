<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use App\Config\Database;
use App\Services\MfaService;

class AuthService
{
    private string $secret;
    private int $expiry;
    private int $refreshExpiry;
    private Database $db;
    private AuditService $auditService;

    public function __construct()
    {
        $this->secret = $_ENV['JWT_SECRET'] ?? '';
        $this->expiry = (int)($_ENV['JWT_EXPIRY'] ?? 3600); // 1 hour default
        $this->refreshExpiry = (int)($_ENV['JWT_REFRESH_EXPIRY'] ?? 86400); // 24 hours
        $this->db = Database::getInstance();
        $this->auditService = new AuditService();

        if (empty($this->secret)) {
            throw new \RuntimeException('JWT secret not configured');
        }
    }

    /**
     * Authenticate user and generate JWT token
     */
    public function login(string $username, string $password, string $ipAddress): ?array
    {
        $conn = $this->db->getConnection();
        
        $stmt = $conn->prepare("
            SELECT id, username, email, password_hash, role, is_active, mfa_enabled
            FROM users 
            WHERE (username = :username OR email = :email) 
            AND deleted_at IS NULL
        ");
        
        $stmt->execute([
            'username' => $username,
            'email' => $username
        ]);
        $user = $stmt->fetch();

        if (!$user) {
            $this->logFailedLogin($username, $ipAddress, 'User not found');
            return null;
        }

        if (!$user['is_active']) {
            $this->logFailedLogin($username, $ipAddress, 'Account inactive');
            return null;
        }

        if (!EncryptionService::verifyPassword($password, $user['password_hash'])) {
            $this->logFailedLogin($username, $ipAddress, 'Invalid password');
            return null;
        }

        // Check if MFA is required
        if ($user['mfa_enabled']) {
            return [
                'mfa_required' => true,
                'mfa_token' => $this->generateMfaToken($user),
                'user_id' => $user['id']
            ];
        }

        // Generate tokens
        $accessToken = $this->generateAccessToken($user);
        $refreshToken = $this->generateRefreshToken($user);

        // Log successful login
        $this->auditService->log($user['id'], null, 'LOGIN', 'user', $user['id'], ['ip' => $ipAddress], 200);

        return [
            'mfa_required' => false,
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->expiry,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
                'mfa_enabled' => (bool)$user['mfa_enabled']
            ]
        ];
    }

    /**
     * Generate temporary MFA token
     */
    private function generateMfaToken(array $user): string
    {
        $payload = [
            'iat' => time(),
            'exp' => time() + 300, // 5 minutes
            'sub' => $user['id'],
            'type' => 'mfa_auth'
        ];
        return JWT::encode($payload, $this->secret, 'HS256');
    }

    /**
     * Verify MFA code and generate full tokens
     */
    public function verifyMfa(string $mfaToken, string $code): ?array
    {
        $decoded = $this->verifyToken($mfaToken);
        if (!$decoded || ($decoded->type ?? '') !== 'mfa_auth') {
            return null;
        }

        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->execute(['id' => $decoded->sub]);
        $user = $stmt->fetch();

        if (!$user) return null;

        // Verify TOTP code using google2fa
        $mfaService = new MfaService();
        $secret = $user['mfa_secret'] ?? null;

        if (!$secret || !$mfaService->verifyCode($secret, $code)) {
            return null;
        }

        // Generate full tokens
        $accessToken = $this->generateAccessToken($user);
        $refreshToken = $this->generateRefreshToken($user);

        // Log successful MFA login
        $this->auditService->log($user['id'], null, 'MFA_VERIFIED', 'user', $user['id'], null, 200);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->expiry,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
                'mfa_enabled' => (bool)$user['mfa_enabled']
            ]
        ];
    }

    /**
     * Generate JWT access token
     */
    private function generateAccessToken(array $user): string
    {
        $issuedAt = time();
        $expire = $issuedAt + $this->expiry;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'jti' => bin2hex(random_bytes(16)),
            'sub' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'type' => 'access'
        ];

        return JWT::encode($payload, $this->secret, 'HS256');
    }

    /**
     * Generate JWT refresh token
     */
    private function generateRefreshToken(array $user): string
    {
        $issuedAt = time();
        $expire = $issuedAt + $this->refreshExpiry;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'jti' => bin2hex(random_bytes(16)),
            'sub' => $user['id'],
            'type' => 'refresh'
        ];

        return JWT::encode($payload, $this->secret, 'HS256');
    }

    /**
     * Verify and decode JWT token
     */
    public function verifyToken(string $token): ?object
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, 'HS256'));
            
            // Check if token is blacklisted
            if ($this->isTokenBlacklisted($decoded->jti)) {
                return null;
            }

            return $decoded;
        } catch (ExpiredException $e) {
            return null;
        } catch (\Exception $e) {
            error_log("Token verification failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Logout user by blacklisting token
     */
    public function logout(string $token): bool
    {
        try {
            $decoded = $this->verifyToken($token);
            if (!$decoded) {
                return false;
            }

            $conn = $this->db->getConnection();
            $stmt = $conn->prepare("
                INSERT INTO jwt_blacklist (token_jti, user_id, expires_at)
                VALUES (:jti, :user_id, FROM_UNIXTIME(:expires))
            ");

            $result = $stmt->execute([
                'jti' => $decoded->jti,
                'user_id' => $decoded->sub,
                'expires' => $decoded->exp
            ]);

            if ($result) {
                $this->auditService->log($decoded->sub, null, 'LOGOUT', 'user', $decoded->sub, null, 200);
            }

            return $result;
        } catch (\Exception $e) {
            error_log("Logout failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if token is blacklisted
     */
    private function isTokenBlacklisted(string $jti): bool
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT id FROM jwt_blacklist WHERE token_jti = :jti");
        $stmt->execute(['jti' => $jti]);
        return $stmt->fetch() !== false;
    }

    /**
     * Refresh access token using a valid refresh token
     */
    public function refreshAccessToken(string $refreshToken): ?array
    {
        $decoded = $this->verifyToken($refreshToken);
        if (!$decoded || ($decoded->type ?? '') !== 'refresh') {
            return null;
        }

        // Blacklist the old refresh token
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            INSERT INTO jwt_blacklist (token_jti, user_id, expires_at)
            VALUES (:jti, :user_id, FROM_UNIXTIME(:expires))
        ");
        $stmt->execute([
            'jti' => $decoded->jti,
            'user_id' => $decoded->sub,
            'expires' => $decoded->exp
        ]);

        // Fetch user for fresh token payload
        $userStmt = $conn->prepare("SELECT id, username, email, role, mfa_enabled FROM users WHERE id = :id AND is_active = 1 AND deleted_at IS NULL");
        $userStmt->execute(['id' => $decoded->sub]);
        $user = $userStmt->fetch();

        if (!$user) {
            return null;
        }

        // Issue new tokens
        $newAccessToken = $this->generateAccessToken($user);
        $newRefreshToken = $this->generateRefreshToken($user);

        return [
            'access_token' => $newAccessToken,
            'refresh_token' => $newRefreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->expiry
        ];
    }

    /**
     * Log failed login attempt
     */
    private function logFailedLogin(string $username, string $ipAddress, string $reason): void
    {
        $this->auditService->log(null, null, 'LOGIN_FAILED', 'user', null, [
            'username' => $username,
            'reason' => $reason,
            'ip' => $ipAddress
        ], 401);
    }
}
