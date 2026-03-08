<?php

namespace App\Services;

class EncryptionService
{
    private string $key;
    private string $method;

    public function __construct()
    {
        $this->key = $_ENV['ENCRYPTION_KEY'] ?? '';
        $this->method = $_ENV['ENCRYPTION_METHOD'] ?? 'AES-256-CBC';

        if (empty($this->key)) {
            throw new \RuntimeException('Encryption key not configured');
        }

        // Ensure key is proper length
        if (strlen($this->key) < 32) {
            throw new \RuntimeException('Encryption key must be at least 32 characters');
        }
    }

    /**
     * Encrypt sensitive data (NIN, etc.)
     */
    public function encrypt(string $data): string
    {
        if (empty($data)) {
            return '';
        }

        $ivLength = openssl_cipher_iv_length($this->method);
        $iv = openssl_random_pseudo_bytes($ivLength);

        $encrypted = openssl_encrypt(
            $data,
            $this->method,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($encrypted === false) {
            throw new \RuntimeException('Encryption failed');
        }

        // Combine IV and encrypted data, then base64 encode
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt sensitive data
     */
    public function decrypt(string $encryptedData): string
    {
        if (empty($encryptedData)) {
            return '';
        }

        $data = base64_decode($encryptedData);
        
        if ($data === false) {
            throw new \RuntimeException('Invalid encrypted data');
        }

        $ivLength = openssl_cipher_iv_length($this->method);
        $iv = substr($data, 0, $ivLength);
        $encrypted = substr($data, $ivLength);

        $decrypted = openssl_decrypt(
            $encrypted,
            $this->method,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv
        );

        if ($decrypted === false) {
            throw new \RuntimeException('Decryption failed');
        }

        return $decrypted;
    }

    /**
     * Mask NIN to show only last 4 digits
     */
    public static function maskNIN(string $nin): string
    {
        if (empty($nin)) {
            return '';
        }

        // Remove any non-numeric characters
        $clean = preg_replace('/[^0-9]/', '', $nin);
        
        if (strlen($clean) < 4) {
            return str_repeat('X', strlen($clean));
        }

        return str_repeat('X', strlen($clean) - 4) . substr($clean, -4);
    }

    /**
     * Hash password using bcrypt
     */
    public static function hashPassword(string $password): string
    {
        $rounds = $_ENV['BCRYPT_ROUNDS'] ?? 12;
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => $rounds]);
    }

    /**
     * Verify password against hash
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
