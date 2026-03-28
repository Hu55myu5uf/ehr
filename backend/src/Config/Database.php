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
                $port = preg_replace('/[^0-9]/', '', $port);

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

                // Standard DSN Format for MySQL 8
                $dsn = "mysql:host={$host}";
                if (!empty($port) && (int)$port > 0 && (int)$port <= 65535) {
                    $dsn .= ";port=" . (int)$port;
                }
                $dsn .= ";dbname={$dbname};charset=utf8mb4";

                error_log("DEBUG EHR: Connecting [ " . $dsn . " ]");

                self::$connection = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    // SSL is often required for Aiven
                    PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
                ]);

            } catch (PDOException $e) {
                error_log("CRITICAL EHR Connection Failed: " . $e->getMessage() . " | DSN: " . ($dsn ?? 'N/A'));
                throw new \RuntimeException("Database Error: " . $e->getMessage());
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
