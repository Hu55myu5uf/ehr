<?php

namespace App\Services;

class RateLimiter
{
    private string $cacheDir;
    private int $maxAttempts;
    private int $windowSeconds;

    public function __construct(int $maxAttempts = 5, int $windowSeconds = 900)
    {
        $this->cacheDir = __DIR__ . '/../../cache/rate_limit';
        $this->maxAttempts = $maxAttempts;
        $this->windowSeconds = $windowSeconds;

        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0755, true);
        }
    }

    /**
     * Check if the given key (IP+username) is rate-limited
     * Returns true if request is ALLOWED, false if BLOCKED
     */
    public function check(string $ip, string $username): bool
    {
        $key = md5($ip . '|' . $username);
        $file = $this->cacheDir . '/' . $key . '.json';

        $attempts = $this->getAttempts($file);

        // Prune old attempts outside the window
        $cutoff = time() - $this->windowSeconds;
        $attempts = array_filter($attempts, fn($ts) => $ts > $cutoff);

        if (count($attempts) >= $this->maxAttempts) {
            return false; // blocked
        }

        return true;
    }

    /**
     * Record a failed login attempt
     */
    public function recordFailure(string $ip, string $username): void
    {
        $key = md5($ip . '|' . $username);
        $file = $this->cacheDir . '/' . $key . '.json';

        $attempts = $this->getAttempts($file);

        // Prune old
        $cutoff = time() - $this->windowSeconds;
        $attempts = array_filter($attempts, fn($ts) => $ts > $cutoff);

        $attempts[] = time();

        file_put_contents($file, json_encode(array_values($attempts)));
    }

    /**
     * Clear attempts on successful login
     */
    public function clearAttempts(string $ip, string $username): void
    {
        $key = md5($ip . '|' . $username);
        $file = $this->cacheDir . '/' . $key . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }

    /**
     * Get the number of remaining seconds until the block expires
     */
    public function getRetryAfter(string $ip, string $username): int
    {
        $key = md5($ip . '|' . $username);
        $file = $this->cacheDir . '/' . $key . '.json';
        $attempts = $this->getAttempts($file);

        if (empty($attempts)) {
            return 0;
        }

        $oldest = min($attempts);
        $retryAfter = ($oldest + $this->windowSeconds) - time();

        return max(0, $retryAfter);
    }

    private function getAttempts(string $file): array
    {
        if (!file_exists($file)) {
            return [];
        }

        $data = @file_get_contents($file);
        if (!$data) {
            return [];
        }

        $decoded = json_decode($data, true);
        return is_array($decoded) ? $decoded : [];
    }
}
