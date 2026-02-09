-- Migration: Add Sales functionality
-- Date: 2026-01-19
-- Description: Add SOLD status, sales table, and sale_id to devices

-- 1. Add SOLD status to devicestatus enum
-- Note: PostgreSQL doesn't allow adding enum values in a transaction, so this needs to be done separately
ALTER TYPE devicestatus ADD VALUE IF NOT EXISTS 'sold';

-- 2. Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    sale_date TIMESTAMP DEFAULT NOW(),
    buyer_name VARCHAR NOT NULL,
    buyer_dni VARCHAR NOT NULL,
    buyer_email VARCHAR,
    buyer_phone VARCHAR,
    buyer_address VARCHAR,
    sale_price INTEGER,
    payment_method VARCHAR,
    notes TEXT,
    acta_path VARCHAR,
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add sale_id to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sale_id INTEGER REFERENCES sales(id);

-- 4. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_sale_id ON devices(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer_dni ON sales(buyer_dni);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

-- Verification queries (optional, for testing)
-- SELECT * FROM sales LIMIT 5;
-- SELECT id, serial_number, status, sale_id FROM devices WHERE sale_id IS NOT NULL LIMIT 5;
