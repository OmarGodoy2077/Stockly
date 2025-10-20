-- =====================================================
-- MIGRATION: Product Improvements
-- Version: 1.1.0
-- Description: Add hierarchical categories, product attributes,
--             and condition field for enhanced product management
-- Date: 2025-10-20
-- =====================================================
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en tu instancia de Supabase
-- 2. Esta migración es compatible con la estructura existente
-- 3. No elimina datos, solo agrega nuevas funcionalidades
-- 4. Puedes revertir los cambios si es necesario (ver sección REVERT)
--
-- =====================================================

-- =====================================================
-- STEP 1: ALTER CATEGORIES TABLE - Add parent_id for hierarchical categories
-- =====================================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_hierarchy ON categories(company_id, parent_id);

-- Add trigger for categories updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_categories_updated_at();

-- =====================================================
-- STEP 2: ALTER PRODUCTS TABLE - Add condition field
-- =====================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS condition VARCHAR(50) 
  CHECK (condition IN ('new', 'used', 'open_box')) 
  DEFAULT 'new';

-- Create index for condition filtering
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);

-- =====================================================
-- STEP 3: CREATE PRODUCT_ATTRIBUTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,           -- Attribute name (e.g., "Capacity", "Speed", "Color", "Size")
    value TEXT NOT NULL,                  -- Attribute value (e.g., "1TB", "7000MB/s", "Red", "XL")
    order_index INTEGER DEFAULT 0,        -- Order for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for product attributes
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_name ON product_attributes(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attributes_unique ON product_attributes(product_id, name);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_attributes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_attributes_updated_at
BEFORE UPDATE ON product_attributes
FOR EACH ROW
EXECUTE FUNCTION update_product_attributes_updated_at();

-- =====================================================
-- STEP 4: CREATE ATTRIBUTE_TEMPLATES TABLE (Optional but recommended)
-- =====================================================
-- This allows defining attribute templates per category for consistency
-- E.g., RAM category always has Capacity, Speed, Brand attributes

CREATE TABLE IF NOT EXISTS attribute_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,           -- Attribute name for this category template
    is_required BOOLEAN DEFAULT false,    -- Whether attribute is required when creating products
    order_index INTEGER DEFAULT 0,        -- Display order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Create indexes for attribute templates
CREATE INDEX IF NOT EXISTS idx_attribute_templates_category_id ON attribute_templates(category_id);

-- Add trigger for attribute templates updated_at
CREATE OR REPLACE FUNCTION update_attribute_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attribute_templates_updated_at
BEFORE UPDATE ON attribute_templates
FOR EACH ROW
EXECUTE FUNCTION update_attribute_templates_updated_at();

-- =====================================================
-- STEP 5: CREATE VIEWS FOR ENHANCED QUERIES
-- =====================================================

-- View for hierarchical categories
CREATE OR REPLACE VIEW category_hierarchy AS
SELECT
    c.id,
    c.company_id,
    c.name,
    c.description,
    c.parent_id,
    COALESCE(parent.name, 'Root Category') as parent_name,
    COUNT(DISTINCT p.id) as product_count,
    c.created_at,
    c.updated_at,
    c.is_active
FROM categories c
LEFT JOIN categories parent ON c.parent_id = parent.id
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.company_id, c.name, c.description, c.parent_id, parent.name, c.created_at, c.updated_at, c.is_active;

-- View for products with attributes
CREATE OR REPLACE VIEW products_with_attributes AS
SELECT
    p.id,
    p.company_id,
    p.category_id,
    p.sku,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.min_stock,
    p.image_url,
    p.barcode,
    p.condition,
    p.is_active,
    c.name as category_name,
    json_agg(
        json_build_object(
            'id', pa.id,
            'name', pa.name,
            'value', pa.value,
            'order_index', pa.order_index
        ) ORDER BY pa.order_index, pa.name
    ) FILTER (WHERE pa.id IS NOT NULL) as attributes,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_attributes pa ON p.id = pa.product_id
WHERE p.is_active = true
GROUP BY p.id, p.company_id, p.category_id, p.sku, p.name, p.description,
         p.price, p.stock, p.min_stock, p.image_url, p.barcode, p.condition,
         p.is_active, c.name, p.created_at, p.updated_at;

-- =====================================================
-- STEP 6: SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample category hierarchy (only if company_id exists)
-- Uncomment to use with your test company

-- DO $$
-- DECLARE
--     v_company_id UUID;
--     v_pc_components_id UUID;
--     v_ram_id UUID;
--     v_clothing_id UUID;
-- BEGIN
--     -- Get first company (update with your company_id)
--     SELECT id INTO v_company_id FROM companies LIMIT 1;
--     
--     -- Insert parent categories
--     INSERT INTO categories (company_id, name, description, parent_id) 
--     VALUES (v_company_id, 'PC Components', 'Computer parts and components', NULL)
--     RETURNING id INTO v_pc_components_id;
--     
--     -- Insert subcategories
--     INSERT INTO categories (company_id, name, description, parent_id) 
--     VALUES 
--         (v_company_id, 'RAM', 'Memory modules', v_pc_components_id),
--         (v_company_id, 'SSDs', 'Solid State Drives', v_pc_components_id),
--         (v_company_id, 'Clothing', 'Apparel and accessories', NULL)
--     RETURNING id INTO v_ram_id;
--     
--     -- Add attribute templates for RAM category
--     INSERT INTO attribute_templates (category_id, name, is_required, order_index) 
--     VALUES 
--         (v_ram_id, 'Type', true, 1),
--         (v_ram_id, 'Capacity', true, 2),
--         (v_ram_id, 'Speed', true, 3),
--         (v_ram_id, 'Brand', false, 4);
-- END $$;

-- =====================================================
-- STEP 7: DOCUMENTATION COMMENTS
-- =====================================================

COMMENT ON TABLE product_attributes IS 'Stores dynamic product attributes (e.g., color, size, capacity, speed)';
COMMENT ON COLUMN product_attributes.name IS 'Attribute name (e.g., "Capacity", "Speed", "Color", "Size")';
COMMENT ON COLUMN product_attributes.value IS 'Attribute value (e.g., "1TB", "7000MB/s", "Red", "XL")';

COMMENT ON TABLE attribute_templates IS 'Template for attributes required in a category';
COMMENT ON COLUMN attribute_templates.name IS 'Attribute name that should be set for products in this category';
COMMENT ON COLUMN attribute_templates.is_required IS 'Whether this attribute is mandatory for products in this category';

COMMENT ON VIEW category_hierarchy IS 'Shows all categories with their parent relationships and product counts';
COMMENT ON VIEW products_with_attributes IS 'Shows products with all their attributes aggregated as JSON';

COMMENT ON COLUMN categories.parent_id IS 'References parent category for hierarchical structure (NULL for root categories)';
COMMENT ON COLUMN products.condition IS 'Product condition: new, used, or open_box';

-- =====================================================
-- REVERT SCRIPT (if needed)
-- =====================================================
-- To revert this migration, run:
--
-- DROP VIEW IF EXISTS products_with_attributes;
-- DROP VIEW IF EXISTS category_hierarchy;
-- DROP TABLE IF EXISTS attribute_templates CASCADE;
-- DROP TABLE IF EXISTS product_attributes CASCADE;
-- ALTER TABLE products DROP COLUMN IF EXISTS condition;
-- ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;
-- ALTER TABLE categories DROP COLUMN IF EXISTS updated_at;
-- DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
-- DROP FUNCTION IF EXISTS update_categories_updated_at();
-- DROP INDEX IF EXISTS idx_categories_parent_id;
-- DROP INDEX IF EXISTS idx_categories_hierarchy;
-- DROP INDEX IF EXISTS idx_products_condition;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Product improvements migration completed successfully!';
    RAISE NOTICE 'New features:';
    RAISE NOTICE '  - Hierarchical categories (parent_id)';
    RAISE NOTICE '  - Categories updated_at column and trigger';
    RAISE NOTICE '  - Product condition field (new, used, open_box)';
    RAISE NOTICE '  - Dynamic product attributes';
    RAISE NOTICE '  - Attribute templates for consistency';
    RAISE NOTICE '  - Enhanced views for product queries';
END $$;
