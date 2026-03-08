<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\UserService;
use App\Services\RateLimiter;
use App\Middleware\AuditMiddleware;

class AuthController
{
    private AuthService $authService;
    private UserService $userService;
    private AuditMiddleware $audit;
    private RateLimiter $rateLimiter;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->userService = new UserService();
        $this->audit = new AuditMiddleware();
        $this->rateLimiter = new RateLimiter(5, 900); // 5 attempts per 15 min
    }

    /**
     * Login endpoint
     * POST /api/auth/login
     */
    public function login(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['username']) || !isset($data['password'])) {
                $this->badRequest('Username and password are required');
                return;
            }

            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
            $username = $data['username'];

            // Rate limiting check
            if (!$this->rateLimiter->check($ipAddress, $username)) {
                $retryAfter = $this->rateLimiter->getRetryAfter($ipAddress, $username);
                http_response_code(429);
                header('Content-Type: application/json');
                header('Retry-After: ' . $retryAfter);
                echo json_encode([
                    'error' => 'Too many login attempts. Please try again later.',
                    'retry_after' => $retryAfter
                ]);
                return;
            }

            $result = $this->authService->login(
                $username,
                $data['password'],
                $ipAddress
            );

            if (!$result) {
                $this->rateLimiter->recordFailure($ipAddress, $username);
                $this->unauthorized('Invalid credentials');
                return;
            }

            // Clear rate limit on success
            $this->rateLimiter->clearAttempts($ipAddress, $username);

            // If MFA is required, return the partial result
            if ($result['mfa_required'] ?? false) {
                $this->success($result);
                return;
            }

            $this->success($result);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Verify MFA endpoint
     * POST /api/auth/verify-mfa
     */
    public function verifyMfa(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['mfa_token']) || !isset($data['code'])) {
                $this->badRequest('MFA token and code are required');
                return;
            }

            $result = $this->authService->verifyMfa($data['mfa_token'], $data['code']);

            if (!$result) {
                $this->unauthorized('Invalid or expired MFA code');
                return;
            }

            $this->success($result);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Logout endpoint
     * POST /api/auth/logout
     */
    public function logout(): void
    {
        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                $this->authService->logout($token);
            }

            $this->success(['message' => 'Logged out successfully']);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Refresh token endpoint
     * POST /api/auth/refresh
     */
    public function refresh(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['refresh_token'])) {
                $this->badRequest('Refresh token is required');
                return;
            }

            $result = $this->authService->refreshAccessToken($data['refresh_token']);

            if (!$result) {
                $this->unauthorized('Invalid or expired refresh token');
                return;
            }

            $this->success($result);

        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Get current user info
     * GET /api/auth/me
     */
    public function me(object $user): void
    {
        try {
            $fullUser = $this->userService->getUserById($user->sub);
            if (!$fullUser) {
                $this->unauthorized('User not found');
                return;
            }
            $this->success($fullUser);
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

    private function unauthorized(string $message): void
    {
        $this->error($message, 401);
    }
}
