-- ================================================
-- Migration: Walk-in Patient Support & Consultation Fee Tiers
-- Date: 2026-03-22
-- ================================================

USE ehrecords;

-- 1. Add 'walk_in' to encounter_type ENUM
ALTER TABLE encounters 
    MODIFY COLUMN encounter_type ENUM(
        'office_visit', 'emergency', 'telehealth', 'inpatient', 'follow_up', 'walk_in'
    ) NOT NULL;

-- 2. Add 'is_walk_in' column to patients (if not already added)
ALTER TABLE patients ADD COLUMN 
    is_walk_in BOOLEAN DEFAULT FALSE;

-- 3. Add 'phone' column capture for walk-in patients (quick contact)
ALTER TABLE patients ADD COLUMN 
    wallet_balance DECIMAL(12,2) DEFAULT 0.00;

-- 4. Ensure price_list exists and add consultation fee tiers
CREATE TABLE IF NOT EXISTS price_list (
    id VARCHAR(36) PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    category VARCHAR(50) DEFAULT 'general',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO price_list (id, item_type, item_name, price, category) VALUES
    (UUID(), 'consultation_emergency', 'Emergency Consultation Fee', 15000.00, 'Service'),
    (UUID(), 'consultation_followup', 'Follow-up Consultation Fee', 3000.00, 'Service'),
    (UUID(), 'consultation_walkin', 'Walk-in Consultation Fee', 5000.00, 'Service'),
    (UUID(), 'consultation_specialist', 'Specialist Consultation Fee', 10000.00, 'Service');

-- 5. Add service_type to track what a walk-in came for
ALTER TABLE encounters ADD COLUMN 
    service_type ENUM('consultation', 'lab_only', 'pharmacy_only', 'consultation_and_lab', 'consultation_and_pharmacy', 'full_service') DEFAULT 'consultation';
