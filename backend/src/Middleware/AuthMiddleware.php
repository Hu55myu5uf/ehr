<?php

namespace App\Middleware;

use App\Services\AuthService;

class AuthMiddleware
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    /**
     * Verify JWT token from Authorization header
     */
    public function handle(): ?object
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader)) {
            $this->unauthorized('No authorization header provided');
            return null;
        }

        // Extract token from "Bearer <token>"
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $this->unauthorized('Invalid authorization header format');
            return null;
        }

        $token = $matches[1];
        $decoded = $this->authService->verifyToken($token);

        if (!$decoded) {
            $this->unauthorized('Invalid or expired token');
            return null;
        }

        // Check token type
        if (($decoded->type ?? '') !== 'access') {
            $this->unauthorized('Invalid token type');
            return null;
        }

        return $decoded;
    }

    /**
     * Send 401 Unauthorized response
     */
    private function unauthorized(string $message): void
    {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Unauthorized',
            'message' => $message
        ]);
        exit;
    }

    /**
     * Check if user has required role
     */
    public static function requireRole(object $user, array $allowedRoles): bool
    {
        if (!in_array($user->role, $allowedRoles)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Forbidden',
                'message' => 'Insufficient permissions'
            ]);
            exit;
        }
        return true;
    }
}
