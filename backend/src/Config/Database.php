<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $connection = null;
    private static ?Database $instance = null;

    public function __construct()
    {
        // Public constructor to allow direct instantiation if needed, 
        // though getInstance() is preferred for singleton access
    }

    public static function getInstance(): Database
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        if (self::$connection === null) {
            try {
                $host = trim($_ENV['DB_HOST'] ?? 'localhost');
                $port = trim($_ENV['DB_PORT'] ?? '3306');
                
                // Robust: Handle if host already contains a port (e.g. host:3306)
                if (strpos($host, ':') !== false) {
                    $parts = explode(':', $host);
                    $host = trim($parts[0]);
                    $port = trim($parts[1]);
                }

                // Final sanitization: Remove anything that isn't a number from port
                $port = preg_replace('/[^0-9]/', '', (string)$port);
                error_log("DEBUG EHR: Port [" . $port . "] Hex [" . bin2hex($port) . "]");

                // Manual DNS Resolution (Fixes "Name or service not known" on Render)
                if ($host !== 'localhost' && $host !== '127.0.0.1') {
                    $ip = gethostbyname($host);
                    if ($ip !== $host) {
                        error_log("EHR: Resolved {$host} to {$ip}");
                        $host = $ip;
                    } else {
                        error_log("EHR: FAILED to resolve {$host} manually.");
                    }
                }

                $dbname = trim($_ENV['DB_NAME'] ?? 'defaultdb');
                $username = trim($_ENV['DB_USER'] ?? 'avnadmin');
                $password = trim($_ENV['DB_PASS'] ?? '');

                // --- UNIVERSAL DSN CONNECTOR ---
                // Format: host:port is often preferred on Linux PDO
                $dsn = "mysql:host={$host}:{$port};dbname={$dbname};charset=utf8mb4";

                try {
                    error_log("EHR: Trying DSN [ $dsn ]");
                    self::$connection = new PDO($dsn, $username, $password, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
                    ]);
                    error_log("EHR: SUCCESS with DSN [ $dsn ]");
                    return self::$connection;
                } catch (PDOException $e) {
                    error_log("EHR: FAILED DSN [ $dsn ] | Error: " . $e->getMessage());
                    // Final fallback without port
                    $dsn_fallback = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
                    self::$connection = new PDO($dsn_fallback, $username, $password, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    ]);
                    return self::$connection;
                }

            } catch (\Exception $e) {
                error_log("CRITICAL EHR: " . $e->getMessage());
                throw $e;
            }
        }

        return self::$connection;
    }

    public function beginTransaction(): bool
    {
        return $this->getConnection()->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->getConnection()->commit();
    }

    public function rollBack(): bool
    {
        return $this->getConnection()->rollBack();
    }

    // Prevent cloning
    private function __clone() {}

    // Prevent unserialization
    public function __wakeup()
    {
        throw new \Exception("Cannot unserialize singleton");
    }
}
