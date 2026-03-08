@echo off
echo ================================================
echo EHR System - XAMPP Setup Script
echo ================================================
echo.

REM Set XAMPP paths
set PHP_PATH=C:\xampp\php
set MYSQL_PATH=C:\xampp\mysql\bin

echo [1/4] Checking PHP installation...
"%PHP_PATH%\php.exe" -v
if errorlevel 1 (
    echo ERROR: PHP not found! Make sure XAMPP is installed at C:\xampp
    pause
    exit /b 1
)
echo.

echo [2/4] Checking Composer...
where composer >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: Composer not found in PATH!
    echo Please install Composer from https://getcomposer.org/download/
    echo.
    echo After installing Composer, run this script again.
    pause
    exit /b 1
)
echo Composer found!
echo.

echo [3/4] Installing PHP dependencies...
cd /d "%~dp0backend"
composer install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo [4/4] Checking database configuration...
if not exist "backend\.env" (
    echo Creating .env file from .env.example...
    copy "backend\.env.example" "backend\.env"
    echo.
    echo IMPORTANT: Edit backend\.env and set your encryption keys!
    echo Run this PHP code to generate keys:
    echo.
    echo ^<?php
    echo echo "APP_KEY: " . base64_encode(random_bytes(32)) . "\n";
    echo echo "JWT_SECRET: " . bin2hex(random_bytes(32)) . "\n";
    echo echo "ENCRYPTION_KEY: " . bin2hex(random_bytes(32)) . "\n";
    echo ?^>
    echo.
)

echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Start Apache and MySQL in XAMPP Control Panel
echo 2. Open phpMyAdmin: http://localhost/phpmyadmin
echo 3. Create database 'ehr_system'
echo 4. Import database\schema.sql
echo 5. Update encryption keys in backend\.env
echo 6. Test: http://localhost/ehr/backend/public/api/health
echo.
pause
