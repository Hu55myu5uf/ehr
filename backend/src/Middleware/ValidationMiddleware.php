<?php

namespace App\Middleware;

/**
 * Global request validation middleware.
 * Provides reusable validation helpers used across controllers.
 */
class ValidationMiddleware
{
    /**
     * Validate required fields exist in the data array.
     * Returns an array of missing field names.
     */
    public static function validateRequired(array $data, array $requiredFields): array
    {
        $missing = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }
        return $missing;
    }

    /**
     * Validate email format.
     */
    public static function isValidEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate date format (YYYY-MM-DD).
     */
    public static function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    /**
     * Validate NIN format (XXX-XX-XXXX).
     */
    public static function isValidNIN(string $nin): bool
    {
        return preg_match('/^\d{11}$/', $nin) === 1;
    }

    /**
     * Validate gender value.
     */
    public static function isValidGender(string $gender): bool
    {
        return in_array(strtolower($gender), ['male', 'female', 'other']);
    }

    /**
     * Validate UUID v4 format.
     */
    public static function isValidUUID(string $uuid): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid) === 1;
    }

    /**
     * Validate phone number (basic international format).
     */
    public static function isValidPhone(string $phone): bool
    {
        return preg_match('/^\+?[\d\s\-().]{7,20}$/', $phone) === 1;
    }

    /**
     * Validate a string has a minimum/maximum length.
     */
    public static function isValidLength(string $value, int $min = 1, int $max = 255): bool
    {
        $len = strlen(trim($value));
        return $len >= $min && $len <= $max;
    }

    /**
     * Validate and return request body as parsed JSON.
     * Returns null and sends 400 if body is invalid JSON.
     */
    public static function parseJsonBody(): ?array
    {
        $raw = file_get_contents('php://input');
        if (empty($raw)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Request body is empty']);
            return null;
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
            return null;
        }

        return $data;
    }

    /**
     * Full validation pipeline for a request.
     * Parses JSON body, checks required fields, and returns
     * [data, errors] tuple. Sends 400 automatically on failure.
     */
    public static function validateRequest(array $requiredFields = []): ?array
    {
        $data = self::parseJsonBody();
        if ($data === null) return null;

        if (!empty($requiredFields)) {
            $missing = self::validateRequired($data, $requiredFields);
            if (!empty($missing)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'error' => 'Missing required fields: ' . implode(', ', $missing)
                ]);
                return null;
            }
        }

        return $data;
    }
}
