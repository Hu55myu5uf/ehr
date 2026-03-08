-- ================================================
-- Clinical Workflow Migration
-- Adds: appointments, consultation_details, nursing_notes, bills, bill_items
-- ================================================

USE ehrecords;

-- ================================================
-- APPOINTMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS appointments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NULL COMMENT 'Assigned doctor',
    appointment_date DATE NOT NULL,
    appointment_time TIME NULL,
    appointment_type ENUM('new_visit', 'follow_up', 'emergency', 'referral') DEFAULT 'new_visit',
    status ENUM('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    reason TEXT NULL,
    notes TEXT NULL,
    encounter_id CHAR(36) NULL COMMENT 'Linked when consultation starts',
    created_by CHAR(36) NOT NULL COMMENT 'Receptionist user ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='Appointment booking and queue management';

-- ================================================
-- CONSULTATION DETAILS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS consultation_details (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    encounter_id CHAR(36) NOT NULL UNIQUE,
    
    -- Patient Complaint
    chief_complaint TEXT NULL,
    history_of_presenting_illness TEXT NULL,
    
    -- Review of Systems (JSON: {cardiovascular: bool, respiratory: bool, ...notes})
    review_of_systems JSON NULL,
    
    -- History
    past_medical_history TEXT NULL,
    drug_history TEXT NULL,
    allergy_notes TEXT NULL,
    family_history TEXT NULL,
    social_history TEXT NULL,
    
    -- Diagnosis
    primary_diagnosis VARCHAR(255) NULL,
    primary_icd_code VARCHAR(10) NULL,
    secondary_diagnoses JSON NULL COMMENT '[{diagnosis, icd_code}]',
    
    -- Treatment Plan
    admission_decision ENUM('admit', 'discharge', 'refer', 'observe') DEFAULT 'discharge',
    nursing_instructions TEXT NULL,
    additional_notes TEXT NULL,
    referral_notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
    INDEX idx_encounter_id (encounter_id)
) ENGINE=InnoDB COMMENT='Structured consultation form data';

-- ================================================
-- NURSING NOTES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS nursing_notes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    encounter_id CHAR(36) NULL,
    nurse_id CHAR(36) NOT NULL COMMENT 'Provider ID of the nurse',
    note_type ENUM('care_note', 'vitals', 'observation', 'medication_admin') DEFAULT 'care_note',
    content TEXT NULL,
    vitals JSON NULL COMMENT '{temperature, bp_systolic, bp_diastolic, heart_rate, respiratory_rate, spo2, weight}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (nurse_id) REFERENCES providers(id) ON DELETE RESTRICT,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_encounter_id (encounter_id),
    INDEX idx_nurse_id (nurse_id)
) ENGINE=InnoDB COMMENT='Nursing care notes and vital signs';

-- ================================================
-- BILLS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS bills (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    encounter_id CHAR(36) NULL,
    bill_number VARCHAR(20) NOT NULL UNIQUE,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'pending', 'partial', 'paid', 'cancelled') DEFAULT 'draft',
    payment_method VARCHAR(50) NULL,
    payment_reference VARCHAR(100) NULL,
    notes TEXT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    created_by CHAR(36) NOT NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_encounter_id (encounter_id),
    INDEX idx_status (status),
    INDEX idx_bill_number (bill_number)
) ENGINE=InnoDB COMMENT='Patient billing';

-- ================================================
-- BILL ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS bill_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    bill_id CHAR(36) NOT NULL,
    item_type ENUM('consultation', 'lab_test', 'medication', 'admission', 'procedure', 'other') NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_id CHAR(36) NULL COMMENT 'FK to lab_order, medication, encounter',
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    INDEX idx_bill_id (bill_id)
) ENGINE=InnoDB COMMENT='Itemized bill entries';

-- ================================================
-- Add encounter_type values we need
-- ================================================
ALTER TABLE encounters MODIFY COLUMN encounter_type 
    ENUM('office_visit', 'emergency', 'telehealth', 'inpatient', 'follow_up', 'outpatient', 'consultation') NOT NULL;

-- ================================================
-- Add next-of-kin columns to patients if not present
-- ================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'ehrecords' AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'next_of_kin_name');
SET @stmt = IF(@col_exists > 0, 'SELECT 1',
    'ALTER TABLE patients 
     ADD COLUMN next_of_kin_name VARCHAR(200) NULL AFTER emergency_contact_relationship,
     ADD COLUMN next_of_kin_phone VARCHAR(20) NULL AFTER next_of_kin_name,
     ADD COLUMN next_of_kin_relationship VARCHAR(50) NULL AFTER next_of_kin_phone');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ================================================
-- Update dashboard stats query support
-- ================================================
SELECT 'Clinical workflow migration completed successfully!' AS status;
