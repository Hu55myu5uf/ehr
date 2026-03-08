-- EHR System - Migration for all fixes
-- Run this against the 'ehrecords' database

-- Fix 1: Add MFA secret column
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64) NULL AFTER mfa_enabled;

-- Fix 7: Add billing_officer role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'doctor', 'nurse', 'lab_attendant', 'receptionist', 'pharmacist', 'billing_officer', 'patient') NOT NULL;

-- Fix 8: Add billing columns to lab_orders table
ALTER TABLE lab_orders 
    ADD COLUMN IF NOT EXISTS billing_status ENUM('pending_invoice', 'invoiced', 'paid', 'approved', 'rejected') DEFAULT 'pending_invoice' AFTER status,
    ADD COLUMN IF NOT EXISTS billing_verified_by CHAR(36) NULL AFTER billing_status,
    ADD COLUMN IF NOT EXISTS billing_verified_at TIMESTAMP NULL AFTER billing_verified_by,
    ADD COLUMN IF NOT EXISTS billing_notes TEXT NULL AFTER billing_verified_at,
    ADD FOREIGN KEY IF NOT EXISTS (billing_verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- Fix 6: Login rate limiting table
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(255) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_username (ip_address, username),
    INDEX idx_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
