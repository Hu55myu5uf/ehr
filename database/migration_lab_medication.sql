-- ================================================
-- Lab Results & Medication Management Extensions
-- Migration Script for EHR System
-- ================================================

USE ehrecords;

-- ================================================
-- LAB ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lab_orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    encounter_id CHAR(36) NULL,
    provider_id CHAR(36) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(50) NULL COMMENT 'LOINC or CPT code',
    test_category VARCHAR(100) NULL COMMENT 'Hematology, Chemistry, Microbiology, etc.',
    priority ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
    status ENUM('ordered', 'collected', 'in_progress', 'completed', 'cancelled') DEFAULT 'ordered',
    specimen_type VARCHAR(100) NULL COMMENT 'Blood, Urine, etc.',
    notes TEXT NULL,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collected_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    INDEX idx_ordered_at (ordered_at)
) ENGINE=InnoDB COMMENT='Laboratory test orders';

-- ================================================
-- LAB RESULTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lab_results (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lab_order_id CHAR(36) NOT NULL,
    result_name VARCHAR(255) NOT NULL,
    result_value VARCHAR(500) NOT NULL,
    result_unit VARCHAR(50) NULL,
    reference_range VARCHAR(200) NULL,
    abnormal_flag ENUM('normal', 'high', 'low', 'critical', 'abnormal') DEFAULT 'normal',
    notes TEXT NULL,
    performed_by CHAR(36) NULL COMMENT 'User ID of lab technician',
    performed_at TIMESTAMP NULL,
    verified_by CHAR(36) NULL COMMENT 'User ID who verified results',
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_lab_order_id (lab_order_id),
    INDEX idx_abnormal_flag (abnormal_flag)
) ENGINE=InnoDB COMMENT='Laboratory test results';

-- ================================================
-- ENHANCE MEDICATIONS TABLE
-- ================================================
-- Check if columns exist before adding them
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'ehrecords'
     AND TABLE_NAME = 'medications'
     AND COLUMN_NAME = 'prescribed_by') > 0,
    'SELECT 1',
    'ALTER TABLE medications 
     ADD COLUMN prescribed_by CHAR(36) NULL AFTER provider_id,
     ADD COLUMN dispensed_by CHAR(36) NULL AFTER prescribed_by,
     ADD COLUMN dispensed_at TIMESTAMP NULL AFTER dispensed_by,
     ADD COLUMN refills_authorized INT DEFAULT 0 AFTER instructions,
     ADD COLUMN refills_remaining INT DEFAULT 0 AFTER refills_authorized,
     ADD COLUMN prescription_status ENUM("pending", "active", "dispensed", "discontinued", "expired") DEFAULT "pending" AFTER is_active,
     ADD COLUMN discontinuation_reason TEXT NULL,
     ADD FOREIGN KEY (prescribed_by) REFERENCES providers(id) ON DELETE SET NULL,
     ADD FOREIGN KEY (dispensed_by) REFERENCES users(id) ON DELETE SET NULL'
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================
-- SAMPLE DATA FOR TESTING
-- ================================================

-- Get provider ID for dr.smith
SET @provider_id = (SELECT id FROM providers WHERE first_name = 'John' AND last_name = 'Smith' LIMIT 1);

-- Get patient IDs if any exist
SET @patient_id = (SELECT id FROM patients LIMIT 1);

-- Only insert sample data if we have both provider and patient
-- This section can be run manually after patients are created

-- Sample lab order (uncomment after creating patients)
-- INSERT INTO lab_orders (id, patient_id, provider_id, test_name, test_code, test_category, priority, status)
-- VALUES (UUID(), @patient_id, @provider_id, 'Complete Blood Count (CBC)', '58410-2', 'Hematology', 'routine', 'ordered');

-- ================================================
-- HELPFUL QUERIES
-- ================================================

-- View pending lab orders
-- SELECT lo.*, p.first_name, p.last_name, pr.first_name as doctor_first, pr.last_name as doctor_last
-- FROM lab_orders lo
-- JOIN patients p ON lo.patient_id = p.id
-- JOIN providers pr ON lo.provider_id = pr.id
-- WHERE lo.status IN ('ordered', 'collected', 'in_progress')
-- ORDER BY lo.ordered_at DESC;

-- View lab results with orders
-- SELECT lr.*, lo.test_name, p.first_name, p.last_name
-- FROM lab_results lr
-- JOIN lab_orders lo ON lr.lab_order_id = lo.id
-- JOIN patients p ON lo.patient_id = p.id
-- ORDER BY lr.performed_at DESC;

-- View pending prescriptions
-- SELECT m.*, p.first_name, p.last_name
-- FROM medications m
-- JOIN patients p ON m.patient_id = p.id
-- WHERE m.prescription_status = 'pending'
-- ORDER BY m.created_at DESC;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

SELECT 'Migration completed successfully!' AS status,
       'Lab orders and results tables created' AS note1,
       'Medications table enhanced with prescription workflow' AS note2;
