-- ================================================
-- Pharmacy Enhancement Migration
-- Adds drug branding, pricing, and invoicing support
-- ================================================

USE ehrecords;

-- 1. Create INVENTORY table if it doesn't exist
-- (It was referenced in code but missing from primary schema.sql)
CREATE TABLE IF NOT EXISTS inventory (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    item_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NULL,
    category VARCHAR(100) NULL,
    quantity INT DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'Tabs',
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    min_stock_level INT DEFAULT 10,
    expiry_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_item_name (item_name),
    INDEX idx_brand_name (brand_name)
) ENGINE=InnoDB COMMENT='Pharmacy drug inventory';

-- 2. Update MEDICATIONS table
-- Link to inventory and update billing workflow statuses
ALTER TABLE medications 
    ADD COLUMN inventory_item_id CHAR(36) NULL AFTER rxnorm_code,
    MODIFY COLUMN prescription_status ENUM('pending', 'active', 'dispensed', 'discontinued', 'expired', 'cancelled') DEFAULT 'pending',
    ADD COLUMN billing_status ENUM('pending_invoice', 'invoiced', 'paid', 'approved', 'rejected') DEFAULT 'pending_invoice' AFTER prescription_status,
    ADD CONSTRAINT fk_medication_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory(id) ON DELETE SET NULL;

-- 3. Update BILLS and BILL_ITEMS if needed
-- (The existing bill_items already has reference_id and item_type)
-- Ensure reference_id index for performance
ALTER TABLE bill_items ADD INDEX idx_reference_id (reference_id);

-- 4. Seed some initial inventory items if table was empty
INSERT IGNORE INTO inventory (id, item_name, brand_name, category, quantity, unit, unit_price) VALUES
(UUID(), 'Paracetamol', 'Panadol', 'Analgesic', 1000, 'Tabs', 50.00),
(UUID(), 'Amoxicillin', 'Amoxil', 'Antibiotic', 500, 'Caps', 150.00),
(UUID(), 'Ibuprofen', 'Advil', 'NSAID', 800, 'Tabs', 75.00),
(UUID(), 'Metformin', 'Glucophage', 'Antidiabetic', 600, 'Tabs', 120.00);

SELECT 'Pharmacy migration completed successfully!' AS status;
