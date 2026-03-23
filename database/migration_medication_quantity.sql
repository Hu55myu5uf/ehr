-- ================================================
-- Medication Quantity & Inventory Deduction
-- ================================================

USE ehrecords;

-- 1. Add quantity field to medications table
ALTER TABLE medications 
    ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1 AFTER route;

-- 2. Audit existing records to have a quantity of 1 if NULL
UPDATE medications SET quantity = 1 WHERE quantity IS NULL;

SELECT 'Migration completed: Added quantity column to medications.' AS status;
