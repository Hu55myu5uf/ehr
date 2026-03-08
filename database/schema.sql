-- ================================================
-- EHR System Database Schema for MySQL 8.0
-- HIPAA-Compliant Electronic Health Record System
-- ================================================

-- Create database
CREATE DATABASE IF NOT EXISTS ehrecords 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE ehrecords;

-- ================================================
-- 1. USERS TABLE (System Authentication)
-- ================================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'doctor', 'nurse', 'lab_attendant', 'receptionist', 'pharmacist', 'patient') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255) NULL,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- ================================================
-- 2. PROVIDERS TABLE (Healthcare Providers)
-- ================================================
CREATE TABLE providers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credentials VARCHAR(50) NULL COMMENT 'MD, DO, NP, PA, RN',
    specialty VARCHAR(100) NULL,
    license_number VARCHAR(50) NULL,
    npi VARCHAR(10) NULL COMMENT 'National Provider Identifier',
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_npi (npi),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ================================================
-- 3. PATIENTS TABLE (Patient Demographics)
-- ================================================
CREATE TABLE patients (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    mrn VARCHAR(20) NOT NULL UNIQUE COMMENT 'Medical Record Number',
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other', 'unknown') NOT NULL,
    ssn VARBINARY(255) NULL COMMENT 'Encrypted SSN',
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(50) NULL,
    zip_code VARCHAR(10) NULL,
    country VARCHAR(50) DEFAULT 'USA',
    emergency_contact_name VARCHAR(200) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    emergency_contact_relationship VARCHAR(50) NULL,
    insurance_provider VARCHAR(100) NULL,
    insurance_policy_number VARBINARY(255) NULL COMMENT 'Encrypted',
    insurance_group_number VARCHAR(50) NULL,
    primary_language VARCHAR(50) DEFAULT 'English',
    race VARCHAR(50) NULL,
    ethnicity VARCHAR(50) NULL,
    marital_status ENUM('single', 'married', 'divorced', 'widowed', 'other') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_mrn (mrn),
    INDEX idx_last_name (last_name),
    INDEX idx_dob (date_of_birth)
) ENGINE=InnoDB;

-- ================================================
-- 4. ENCOUNTERS TABLE (Clinical Encounters)
-- ================================================
CREATE TABLE encounters (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    encounter_type ENUM('office_visit', 'emergency', 'telehealth', 'inpatient', 'follow_up') NOT NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    chief_complaint TEXT NULL,
    encounter_date DATETIME NOT NULL,
    location VARCHAR(100) NULL,
    
    -- Vital Signs
    temperature DECIMAL(4,1) NULL COMMENT 'Fahrenheit',
    blood_pressure_systolic INT NULL,
    blood_pressure_diastolic INT NULL,
    heart_rate INT NULL COMMENT 'beats per minute',
    respiratory_rate INT NULL COMMENT 'breaths per minute',
    oxygen_saturation DECIMAL(5,2) NULL COMMENT 'SpO2 percentage',
    weight DECIMAL(5,2) NULL COMMENT 'pounds',
    height DECIMAL(5,2) NULL COMMENT 'inches',
    bmi DECIMAL(4,2) NULL COMMENT 'Body Mass Index',
    
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    INDEX idx_patient_id (patient_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_encounter_date (encounter_date),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ================================================
-- 5. CLINICAL_NOTES TABLE (SOAP Notes)
-- ================================================
CREATE TABLE clinical_notes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    encounter_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    note_type ENUM('soap', 'progress', 'admission', 'discharge', 'consultation') DEFAULT 'soap',
    
    -- SOAP Format
    subjective TEXT NULL COMMENT 'Patient reported symptoms',
    objective TEXT NULL COMMENT 'Objective findings and exam',
    assessment TEXT NULL COMMENT 'Diagnosis and clinical impression',
    plan TEXT NULL COMMENT 'Treatment plan',
    
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP NULL,
    signed_by CHAR(36) NULL,
    
    -- Amendment tracking
    is_amended BOOLEAN DEFAULT FALSE,
    amendment_reason TEXT NULL,
    original_note_id CHAR(36) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    FOREIGN KEY (signed_by) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY (original_note_id) REFERENCES clinical_notes(id) ON DELETE SET NULL,
    INDEX idx_encounter_id (encounter_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_signed (is_signed)
) ENGINE=InnoDB;

-- ================================================
-- 6. MEDICATIONS TABLE
-- ================================================
CREATE TABLE medications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    encounter_id CHAR(36) NULL,
    provider_id CHAR(36) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    rxnorm_code VARCHAR(20) NULL COMMENT 'RxNorm standard code',
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    route ENUM('oral', 'iv', 'im', 'subcutaneous', 'topical', 'inhalation', 'other') NOT NULL,
    instructions TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    INDEX idx_patient_id (patient_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ================================================
-- 7. ALLERGIES TABLE
-- ================================================
CREATE TABLE allergies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    allergen VARCHAR(255) NOT NULL,
    reaction VARCHAR(255) NULL,
    severity ENUM('mild', 'moderate', 'severe') NOT NULL,
    onset_date DATE NULL,
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id)
) ENGINE=InnoDB;

-- ================================================
-- 8. DIAGNOSES TABLE
-- ================================================
CREATE TABLE diagnoses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    encounter_id CHAR(36) NULL,
    provider_id CHAR(36) NOT NULL,
    icd10_code VARCHAR(10) NOT NULL,
    description VARCHAR(255) NOT NULL,
    status ENUM('active', 'resolved', 'chronic') DEFAULT 'active',
    onset_date DATE NULL,
    resolved_date DATE NULL,
    notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    INDEX idx_patient_id (patient_id),
    INDEX idx_icd10 (icd10_code)
) ENGINE=InnoDB;

-- ================================================
-- 9. AUDIT_LOGS TABLE (HIPAA Compliance)
-- ================================================
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NULL,
    patient_id CHAR(36) NULL,
    action VARCHAR(100) NOT NULL COMMENT 'CREATE, READ, UPDATE, DELETE, LOGIN, etc',
    entity_type VARCHAR(50) NOT NULL COMMENT 'patient, encounter, note, etc',
    entity_id CHAR(36) NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    request_method VARCHAR(10) NULL,
    request_url VARCHAR(500) NULL,
    request_data JSON NULL,
    response_status INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ================================================
-- 10. JWT_BLACKLIST TABLE (Token Management)
-- ================================================
CREATE TABLE jwt_blacklist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_jti VARCHAR(255) NOT NULL UNIQUE COMMENT 'JWT ID',
    user_id CHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_jti (token_jti),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ================================================
-- SEED DATA (Initial Setup)
-- ================================================
-- Password for all users: Password@123
-- Hash generated with: password_hash('Password@123', PASSWORD_BCRYPT)

-- Super Admin user
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(UUID(), 'superadmin', 'superadmin@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', TRUE);

-- Doctor (Physician)
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
('uuid-doctor-001', 'dr.smith', 'dr.smith@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', TRUE);

-- Nurse
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(UUID(), 'nurse.jones', 'nurse.jones@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'nurse', TRUE);

-- Lab Attendant
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(UUID(), 'lab.tech', 'lab.tech@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'lab_attendant', TRUE);

-- Receptionist
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(UUID(), 'receptionist', 'receptionist@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'receptionist', TRUE);

-- Pharmacist
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(UUID(), 'pharmacist', 'pharmacist@ehr.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pharmacist', TRUE);

-- Create sample provider record for doctor
INSERT INTO providers (id, user_id, first_name, last_name, credentials, specialty, npi) VALUES
(UUID(), 'uuid-doctor-001', 'John', 'Smith', 'MD', 'Family Medicine', '1234567890');

-- ================================================
-- HELPFUL QUERIES
-- ================================================

-- View all patients with latest encounter
-- SELECT p.mrn, p.first_name, p.last_name, MAX(e.encounter_date) as last_visit
-- FROM patients p
-- LEFT JOIN encounters e ON p.id = e.patient_id
-- WHERE p.deleted_at IS NULL
-- GROUP BY p.id;

-- View audit trail for a specific patient
-- SELECT al.*, u.username 
-- FROM audit_logs al
-- LEFT JOIN users u ON al.user_id = u.id
-- WHERE al.patient_id = 'patient-uuid-here'
-- ORDER BY al.created_at DESC;
