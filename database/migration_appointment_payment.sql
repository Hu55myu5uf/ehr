-- ================================================
-- Migration: Appointment Payment Status
-- Date: 2026-03-23
-- ================================================

USE ehrecords;

-- 1. Add 'pending_payment' to appointment status ENUM
ALTER TABLE appointments 
    MODIFY COLUMN status ENUM(
        'scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'pending_payment'
    ) DEFAULT 'scheduled';

-- 2. Ensure encounters table has is_walk_in info via patient join
-- (already done in patients table, but encounters should have it too for easy joins)
-- Actually joining patients is fine.

-- 3. Add billing_status to appointments for easier tracking (optional but helpful)
-- ALTER TABLE appointments ADD COLUMN billing_status ENUM('pending', 'paid') DEFAULT 'pending';
