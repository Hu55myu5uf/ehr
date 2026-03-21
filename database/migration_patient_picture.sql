-- Migration: Add profile_picture to patients table
ALTER TABLE patients ADD COLUMN profile_picture VARCHAR(255) NULL AFTER marital_status;
