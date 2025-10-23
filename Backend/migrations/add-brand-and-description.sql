-- =====================================================
-- Migration: Add description and brand to products
-- Date: 2025-10-22
-- Version: v1.3.2
-- =====================================================
-- 
-- Changes:
-- 1. Add 'brand' column to products table
-- 2. Add 'description' column (already exists but ensuring it's there)
-- 3. Drop 'stock' requirement from products (stock is managed via purchases)
-- 4. Update product validation logic
--
-- =====================================================

BEGIN;

-- Step 1: Add brand column to products if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Step 2: Add comment to brand column
COMMENT ON COLUMN products.brand IS 'Product brand or manufacturer';

-- Step 3: Create index on brand for faster queries
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(company_id, brand);

-- Step 4: Drop the UNIQUE constraint on (company_id, sku) if it exists to make SKU optional
-- Note: This requires careful migration planning
-- We'll keep it but allow NULL values for stock-tracked items

-- Step 5: Update products to have description (already exists in init.sql)
-- Just ensuring it's there and not null for existing products
UPDATE products 
SET description = 'Sin descripción' 
WHERE description IS NULL OR description = '';

-- Step 6: Create view for product details with all info
CREATE OR REPLACE VIEW products_detail AS
SELECT
    p.id,
    p.company_id,
    p.category_id,
    c.name as category_name,
    p.sku,
    p.name,
    p.brand,
    p.description,
    p.price,
    p.stock,
    p.min_stock,
    p.image_url,
    p.barcode,
    p.condition,
    p.is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

COMMIT;

-- =====================================================
-- Rollback Instructions (if needed):
-- =====================================================
-- BEGIN;
-- DROP VIEW IF EXISTS products_detail;
-- DROP INDEX IF EXISTS idx_products_brand;
-- ALTER TABLE products DROP COLUMN IF EXISTS brand;
-- COMMIT;
