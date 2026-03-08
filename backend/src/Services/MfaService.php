<?php

namespace App\Services;

use PragmaRX\Google2FA\Google2FA;
use App\Config\Database;

class MfaService
{
    private Google2FA $google2fa;
    private Database $db;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
        $this->db = Database::getInstance();
    }

    /**
     * Generate a new TOTP secret
     */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey(32);
    }

    /**
     * Get the otpauth:// URI for QR code generation
     */
    public function getQrCodeUri(string $username, string $secret): string
    {
        $appName = $_ENV['APP_NAME'] ?? 'EHR System';
        return $this->google2fa->getQRCodeUrl($appName, $username, $secret);
    }

    /**
     * Verify a TOTP code against a secret
     * Allows ±1 window (30 seconds each side)
     */
    public function verifyCode(string $secret, string $code): bool
    {
        return $this->google2fa->verifyKey($secret, $code, 1);
    }

    /**
     * Enable MFA for a user: store the secret and set mfa_enabled = 1
     */
    public function enableMfa(string $userId, string $secret): bool
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            UPDATE users 
            SET mfa_secret = :secret, mfa_enabled = 1, updated_at = NOW()
            WHERE id = :id
        ");
        return $stmt->execute(['secret' => $secret, 'id' => $userId]);
    }

    /**
     * Disable MFA for a user: clear secret and flag
     */
    public function disableMfa(string $userId): bool
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("
            UPDATE users 
            SET mfa_secret = NULL, mfa_enabled = 0, updated_at = NOW()
            WHERE id = :id
        ");
        return $stmt->execute(['id' => $userId]);
    }

    /**
     * Get the MFA secret for a user
     */
    public function getUserSecret(string $userId): ?string
    {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare("SELECT mfa_secret FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        return $row ? ($row['mfa_secret'] ?? null) : null;
    }

    /**
     * Setup MFA: generate secret + return URI (user hasn't confirmed yet)
     */
    public function setupMfa(string $userId, string $username): array
    {
        $secret = $this->generateSecret();
        $uri = $this->getQrCodeUri($username, $secret);

        return [
            'secret' => $secret,
            'otpauth_uri' => $uri,
            'message' => 'Scan the QR code with your authenticator app, then confirm with a code via POST /api/users/mfa/enable'
        ];
    }
}
