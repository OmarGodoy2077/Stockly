-- =====================================================
-- Stockly Database Schema - PostgreSQL
-- Compatible with Supabase
-- =====================================================
--
-- INSTRUCCIONES DE USO:
-- 
-- Este script SQL debe ejecutarse MANUALMENTE en tu instancia de Supabase.
-- 
-- Pasos para ejecutar:
-- 1. Accede a tu proyecto en Supabase (https://supabase.com)
-- 2. Ve a SQL Editor en el menú lateral
-- 3. Crea una nueva query
-- 4. Copia y pega TODO el contenido de este archivo
-- 5. Ejecuta el script haciendo clic en "Run"
-- 6. Verifica que todas las tablas se hayan creado correctamente
-- 
-- El script incluye:
-- - Creación de todas las tablas del sistema
-- - Índices para optimización
-- - Triggers para actualización automática
-- - Vistas para consultas comunes
-- - Datos de ejemplo para desarrollo (OPCIONAL - puedes eliminarlos en producción)
-- 
-- Nota: Las políticas de Row Level Security (RLS) están configuradas básicamente.
-- Deberás ajustarlas según tus necesidades de seguridad específicas.
-- 
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table - Main user authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table - Multi-tenant companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    ruc VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Company relationship table (many-to-many with roles)
CREATE TABLE IF NOT EXISTS user_company (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'seller', 'inventory')),
    invited_by UUID REFERENCES users(id),
    invitation_token VARCHAR(255),
    invitation_expires_at TIMESTAMP WITH TIME ZONE,
    invitation_code_used VARCHAR(12),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Refresh tokens table - For JWT refresh token management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Invitations table - For company onboarding with invitation codes
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(12) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_is_active ON invitations(is_active);
-- Composite index for efficient queries on active non-expired invitations
CREATE INDEX IF NOT EXISTS idx_invitations_active_not_expired ON invitations(is_active, expires_at);

-- Categories table for products - Now supports hierarchical categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Products table - Inventory management
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    image_url TEXT,
    barcode VARCHAR(255),
    condition VARCHAR(50) CHECK (condition IN ('new', 'used', 'open_box')) DEFAULT 'new',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, sku)
);

-- Suppliers table for purchases
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    ruc VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Purchases table - Inventory entries
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100),
    supplier_name VARCHAR(255), -- In case supplier is not in suppliers table
    products JSONB NOT NULL, -- Array of {product_id, quantity, unit_price, cost_per_unit, sell_price_per_unit, profit_per_unit}
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_amount DECIMAL(10,2) DEFAULT 0, -- Total cost of purchase
    sell_amount DECIMAL(10,2) DEFAULT 0, -- Potential revenue if all items sold at recorded price
    profit_amount DECIMAL(10,2) DEFAULT 0, -- Calculated profit (sell_amount - cost_amount)
    profit_margin_percent DECIMAL(5,2) DEFAULT 0, -- Profit margin percentage
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table - Main sales records
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    products JSONB NOT NULL, -- Array of {product_id, quantity, unit_price, discount}
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    serial_number VARCHAR(255), -- Extracted from OCR
    serial_image_url TEXT, -- Original image URL from Firebase
    warranty_months INTEGER DEFAULT 12,
    payment_method VARCHAR(100),
    sales_platform VARCHAR(50) DEFAULT 'direct' CHECK (sales_platform IN ('direct', 'amazon', 'ebay', 'shopify', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'marketplace', 'otros')),
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warranties table - Generated from sales
CREATE TABLE IF NOT EXISTS warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    warranty_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    expires_at DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    invoice_number VARCHAR(50), -- 🔧 NUEVO: Número de factura/invoice
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table - Recibos/Facturas generados desde ventas (v1.3.0)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL, -- Format: INV-2025-00001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    invoice_sequence INTEGER NOT NULL, -- Secuencia numerada por año
    
    -- Datos del cliente
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_id_type VARCHAR(50),
    customer_id_number VARCHAR(50),
    
    -- Datos de la empresa
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_phone VARCHAR(50),
    company_email VARCHAR(255),
    company_rtc VARCHAR(100),
    company_logo_url TEXT,
    
    -- Totales
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 12,
    additional_items_total DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Pago
    payment_method VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Términos
    terms_conditions TEXT,
    notes TEXT,
    
    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Control
    is_draft BOOLEAN DEFAULT true,
    is_cancelled BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, invoice_number),
    UNIQUE(company_id, invoice_year, invoice_sequence),
    CONSTRAINT invoice_total_check CHECK (total_amount >= 0)
);

-- Invoice line items - Items adicionales y flexibles en el recibo
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    item_type VARCHAR(50) NOT NULL, -- product, shipping, commission, discount, other
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    is_taxable BOOLEAN DEFAULT false,
    line_order INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT line_item_total_check CHECK (line_total >= 0)
);

-- Service histories table - Technical service records
CREATE TABLE IF NOT EXISTS service_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warranty_id UUID REFERENCES warranties(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('received', 'in_repair', 'waiting_parts', 'ready', 'delivered', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    reason TEXT NOT NULL,
    diagnosis TEXT,
    solution TEXT,
    observations TEXT,
    internal_notes TEXT,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    photos JSONB DEFAULT '[]', -- Array of Firebase URLs
    technician_id UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product attributes table - Dynamic product properties
CREATE TABLE IF NOT EXISTS product_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,           -- Attribute name (e.g., "Capacity", "Speed", "Color", "Size")
    value TEXT NOT NULL,                  -- Attribute value (e.g., "1TB", "7000MB/s", "Red", "XL")
    order_index INTEGER DEFAULT 0,        -- Order for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attribute templates table - Templates for category attributes
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

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Company indexes
CREATE INDEX IF NOT EXISTS idx_companies_ruc ON companies(ruc);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- User-Company indexes
CREATE INDEX IF NOT EXISTS idx_user_company_user_id ON user_company(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_company_id ON user_company(company_id);
CREATE INDEX IF NOT EXISTS idx_user_company_role ON user_company(role);
CREATE INDEX IF NOT EXISTS idx_user_company_invitation_code ON user_company(invitation_code_used);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_hierarchy ON categories(company_id, parent_id);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(company_id, brand);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_serial_number ON sales(serial_number);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_company_id ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_cost_amount ON purchases(cost_amount);
CREATE INDEX IF NOT EXISTS idx_purchases_profit_amount ON purchases(profit_amount);
CREATE INDEX IF NOT EXISTS idx_purchases_profit_margin ON purchases(profit_margin_percent);
CREATE INDEX IF NOT EXISTS idx_purchases_updated_at ON purchases(updated_at);

-- Warranties indexes
CREATE INDEX IF NOT EXISTS idx_warranties_company_id ON warranties(company_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_expires ON warranties(expires_at);
CREATE INDEX IF NOT EXISTS idx_warranties_active ON warranties(is_active);

-- Invoices indexes (v1.3.0)
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(company_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(company_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_is_draft ON invoices(is_draft);
CREATE INDEX IF NOT EXISTS idx_invoices_year_sequence ON invoices(company_id, invoice_year, invoice_sequence);

-- Invoice line items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_company_id ON invoice_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_product_id ON invoice_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items(item_type);

-- Service histories indexes
CREATE INDEX IF NOT EXISTS idx_service_histories_company_id ON service_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_serial ON service_histories(serial_number);
CREATE INDEX IF NOT EXISTS idx_service_histories_status ON service_histories(status);
CREATE INDEX IF NOT EXISTS idx_service_histories_entry_date ON service_histories(entry_date);

-- Product attributes indexes
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_name ON product_attributes(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attributes_unique ON product_attributes(product_id, name);

-- Attribute templates indexes
CREATE INDEX IF NOT EXISTS idx_attribute_templates_category_id ON attribute_templates(category_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_histories_updated_at BEFORE UPDATE ON service_histories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for invoices (v1.3.0)
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate purchase profit and margin
CREATE OR REPLACE FUNCTION calculate_purchase_profit()
RETURNS TRIGGER AS $$
BEGIN
    -- If cost_amount and sell_amount are both set, calculate profit
    IF NEW.cost_amount > 0 AND NEW.sell_amount > 0 THEN
        NEW.profit_amount := NEW.sell_amount - NEW.cost_amount;
        -- Profit margin = (profit / sell_amount) * 100
        -- Example: cost=70, sell=100, profit=30 → margin = (30/100)*100 = 30%
        NEW.profit_margin_percent := (NEW.profit_amount / NEW.sell_amount) * 100;
    ELSIF NEW.cost_amount > 0 THEN
        NEW.profit_amount := 0;
        NEW.profit_margin_percent := 0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for purchase profit calculation
CREATE TRIGGER trigger_calculate_purchase_profit
BEFORE INSERT OR UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION calculate_purchase_profit();

-- Trigger for product attributes updated_at
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

-- Trigger for attribute templates updated_at
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

-- Trigger for calculating invoice line item totals (v1.3.0)
CREATE OR REPLACE FUNCTION calculate_invoice_line_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.line_total = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_line_total
BEFORE INSERT OR UPDATE ON invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_line_total();

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(12) AS $$
DECLARE
    new_code VARCHAR(12);
    exists_count INT;
BEGIN
    LOOP
        new_code := UPPER(
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1)
        );
        
        SELECT COUNT(*) INTO exists_count FROM invitations i WHERE i.code = new_code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitations updated_at
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_invitations_updated_at();

-- Function to validate invitation
CREATE OR REPLACE FUNCTION validate_invitation(p_code VARCHAR)
RETURNS TABLE(
    invitation_id UUID,
    company_id UUID,
    company_name VARCHAR,
    role VARCHAR,
    is_valid BOOLEAN,
    error_message VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.company_id,
        c.name,
        i.role,
        CASE 
            WHEN i.id IS NULL THEN FALSE
            WHEN i.expires_at < NOW() THEN FALSE
            WHEN i.is_active = FALSE THEN FALSE
            ELSE TRUE
        END as is_valid,
        CASE 
            WHEN i.id IS NULL THEN 'Invitation code not found'::VARCHAR
            WHEN i.expires_at < NOW() THEN 'Invitation code has expired'::VARCHAR
            WHEN i.is_active = FALSE THEN 'Invitation code has been deactivated'::VARCHAR
            ELSE NULL::VARCHAR
        END as error_message
    FROM invitations i
    LEFT JOIN companies c ON i.company_id = c.id
    WHERE i.code = p_code;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS TABLE(cleaned_count INT) AS $$
DECLARE
    count INT;
BEGIN
    UPDATE invitations 
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;
    GET DIAGNOSTICS count = ROW_COUNT;
    RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate warranty expiration date
CREATE OR REPLACE FUNCTION calculate_warranty_expiry(months INTEGER, start_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN (start_date + (months || ' months')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_warranty_expiry IS 
'Calcula la fecha de expiración de garantía sumando meses a la fecha de inicio';

-- Function to generate next invoice number (v1.3.0)
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TABLE(
    invoice_number VARCHAR,
    sequence_number INTEGER,
    invoice_year INTEGER
) AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_invoice_number VARCHAR;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    
    v_sequence := COALESCE(
        (SELECT MAX(invoice_sequence) 
         FROM invoices 
         WHERE company_id = p_company_id AND invoice_year = v_year),
        0
    ) + 1;
    
    v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN QUERY SELECT v_invoice_number::VARCHAR, v_sequence, v_year;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Sample company
INSERT INTO companies (id, name, ruc, address, phone, email) VALUES
(uuid_generate_v4(), 'Empresa Demo', '12345678901', 'Calle Principal 123, Ciudad Demo', '+502 1234 5678', 'contacto@empresademo.com');

-- Sample user (password: Demo123!)
INSERT INTO users (id, email, password_hash, name, phone) VALUES
(uuid_generate_v4(), 'owner@demo.com', '$2b$10$rEuVtN.q7vUVqV8xV8xVeOQ7z9Z6Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'Propietario Demo', '+502 9876 5432');

-- Link user to company as owner
INSERT INTO user_company (user_id, company_id, role)
SELECT u.id, c.id, 'owner'
FROM users u, companies c
WHERE u.email = 'owner@demo.com' AND c.name = 'Empresa Demo';

-- Sample categories
INSERT INTO categories (company_id, name, description)
SELECT c.id, cat.name, cat.description
FROM companies c
CROSS JOIN (VALUES
    ('Electrónicos', 'Productos electrónicos y computadoras'),
    ('Hogar', 'Artículos para el hogar'),
    ('Oficina', 'Suministros de oficina')
) AS cat(name, description)
WHERE c.name = 'Empresa Demo';

-- Sample products
INSERT INTO products (company_id, category_id, sku, name, price, stock, description)
SELECT c.id, cat.id, p.sku, p.name, p.price, p.stock, p.description
FROM companies c
CROSS JOIN categories cat
CROSS JOIN (VALUES
    ('TV001', 'Televisor LED 42"', 2500.00, 10, 'Televisor LED de 42 pulgadas Full HD'),
    ('LAP001', 'Laptop Office', 3500.00, 5, 'Laptop para oficina con procesador i5'),
    ('PHN001', 'Smartphone Básico', 1200.00, 15, 'Smartphone Android 6.1"')
) AS p(sku, name, price, stock, description)
WHERE c.name = 'Empresa Demo' AND cat.name = 'Electrónicos';

-- Sample suppliers
INSERT INTO suppliers (company_id, name, contact_person, email, phone)
SELECT c.id, s.name, s.contact_person, s.email, s.phone
FROM companies c
CROSS JOIN (VALUES
    ('Proveedor Tech', 'Carlos Ramírez', 'carlos@proveedortech.com', '+502 5555 1234'),
    ('Distribuidora XYZ', 'María González', 'maria@distribuidoraxyz.com', '+502 5555 5678')
) AS s(name, contact_person, email, phone)
WHERE c.name = 'Empresa Demo';

-- Sample purchase
INSERT INTO purchases (company_id, user_id, supplier_id, products, total_amount, purchase_date)
SELECT c.id, u.id, sup.id,
    '[{"product_id": "' || p.id::text || '", "quantity": 5, "unit_price": 2000.00}]',
    10000.00, CURRENT_DATE - INTERVAL '7 days'
FROM companies c, users u, suppliers sup, products p
WHERE c.name = 'Empresa Demo'
  AND u.email = 'owner@demo.com'
  AND sup.name = 'Proveedor Tech'
  AND p.name = 'Televisor LED 42"';

-- Sample sale with serial number
INSERT INTO sales (company_id, user_id, customer_name, customer_email, customer_phone,
                  products, subtotal, total_amount, serial_number, warranty_months)
SELECT c.id, u.id, 'Cliente Demo', 'cliente@demo.com', '+502 5555 9999',
    '[{"product_id": "' || p.id::text || '", "quantity": 1, "unit_price": 2500.00, "discount": 0}]',
    2500.00, 2500.00, 'SN123456789', 12
FROM companies c, users u, products p
WHERE c.name = 'Empresa Demo'
  AND u.email = 'owner@demo.com'
  AND p.name = 'Televisor LED 42"';

-- Sample warranty
INSERT INTO warranties (sale_id, company_id, serial_number, product_name, customer_name,
                       customer_email, warranty_months, start_date, expires_at)
SELECT s.id, s.company_id, s.serial_number, p.name, s.customer_name, s.customer_email,
       s.warranty_months, s.sale_date::date, calculate_warranty_expiry(s.warranty_months, s.sale_date::date)
FROM sales s, products p
WHERE s.serial_number = 'SN123456789' AND p.name = 'Televisor LED 42"';

-- Sample service history
INSERT INTO service_histories (warranty_id, company_id, serial_number, product_name, customer_name,
                              customer_email, status, reason, created_by, estimated_cost)
SELECT w.id, w.company_id, w.serial_number, w.product_name, w.customer_name, w.customer_email,
       'received', 'No enciende después de una semana de uso', u.id, 150.00
FROM warranties w, users u
WHERE w.serial_number = 'SN123456789' AND u.email = 'owner@demo.com';

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Category hierarchy view
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

-- Products with attributes view
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

-- Active warranties view
CREATE OR REPLACE VIEW active_warranties AS
SELECT
    w.*,
    c.name as company_name,
    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_to_expiry
FROM warranties w
JOIN companies c ON w.company_id = c.id
WHERE w.is_active = true AND w.expires_at > CURRENT_DATE;

-- Low stock products view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
    p.*,
    c.name as company_name,
    cat.name as category_name,
    (p.stock - p.min_stock) as stock_deficit
FROM products p
JOIN companies c ON p.company_id = c.id
LEFT JOIN categories cat ON p.category_id = cat.id
WHERE p.stock <= p.min_stock AND p.is_active = true;

-- Service history summary view
CREATE OR REPLACE VIEW service_history_summary AS
SELECT
    sh.*,
    c.name as company_name,
    w.product_name,
    w.customer_name,
    CASE
        WHEN sh.status = 'delivered' AND sh.actual_delivery_date IS NOT NULL
        THEN sh.actual_delivery_date - sh.entry_date
        ELSE NULL
    END as repair_days
FROM service_histories sh
JOIN companies c ON sh.company_id = c.id
LEFT JOIN warranties w ON sh.warranty_id = w.id;

-- Purchase profit analysis view
CREATE OR REPLACE VIEW purchase_profit_analysis AS
SELECT
    p.id,
    p.company_id,
    p.user_id,
    p.supplier_id,
    p.supplier_name,
    p.invoice_number,
    p.cost_amount,
    p.sell_amount,
    p.profit_amount,
    p.profit_margin_percent,
    p.total_amount,
    p.purchase_date,
    p.created_at,
    u.name as buyer_name,
    u.email as buyer_email,
    s.name as supplier_full_name,
    c.name as company_name,
    EXTRACT(DAYS FROM (NOW() - p.purchase_date)) as days_since_purchase,
    CASE 
        WHEN p.profit_margin_percent > 30 THEN 'Excellent'
        WHEN p.profit_margin_percent > 15 THEN 'Good'
        WHEN p.profit_margin_percent > 0 THEN 'Fair'
        ELSE 'Poor or No Profit'
    END as profit_status
FROM purchases p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.purchase_date DESC;

-- Monthly purchase profit summary view
CREATE OR REPLACE VIEW monthly_purchase_profit_summary AS
SELECT
    p.company_id,
    DATE_TRUNC('month', p.purchase_date)::DATE as month,
    COUNT(p.id) as total_purchases,
    SUM(p.cost_amount) as total_cost,
    SUM(p.sell_amount) as total_sell_value,
    SUM(p.profit_amount) as total_profit,
    AVG(p.profit_margin_percent) as avg_profit_margin,
    MAX(p.profit_amount) as max_profit_purchase,
    MIN(p.profit_amount) as min_profit_purchase
FROM purchases p
GROUP BY p.company_id, DATE_TRUNC('month', p.purchase_date)
ORDER BY month DESC;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their company data)
-- These are basic policies - you might want to make them more sophisticated

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view company data" ON companies FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_company WHERE company_id = companies.id AND user_id = auth.uid())
);
CREATE POLICY "Users can view products in their companies" ON products FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_company WHERE company_id = products.company_id AND user_id = auth.uid())
);

-- Invitations RLS Policies
CREATE POLICY "Company owners can view invitations" ON invitations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Only owners can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    );

CREATE POLICY "Only owners can update invitations" ON invitations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    );


-- Create trigger function for auto warranty creation
CREATE OR REPLACE FUNCTION create_warranty_from_sale()
RETURNS TRIGGER AS $$
DECLARE
    product_record JSONB;
    product_name_value VARCHAR(255);
    v_invoice_number VARCHAR;
BEGIN
    -- Solo crear garantía si:
    -- 1. Se especificaron meses de garantía (> 0)
    -- 2. Existe número de serie
    IF NEW.warranty_months IS NOT NULL 
       AND NEW.warranty_months > 0 
       AND NEW.serial_number IS NOT NULL 
       AND NEW.serial_number != '' THEN
        
        -- 🔧 Generar invoice_number usando la función
        SELECT invoice_number INTO v_invoice_number
        FROM generate_invoice_number(NEW.company_id)
        LIMIT 1;
        
        -- Iterar sobre cada producto en el array de productos
        FOR product_record IN SELECT * FROM jsonb_array_elements(NEW.products)
        LOOP
            -- Extraer nombre del producto (intentar diferentes nombres de campo)
            product_name_value := COALESCE(
                product_record->>'product_name',
                product_record->>'name',
                'Producto sin nombre'
            );
            
            -- Insertar garantía para este producto
            INSERT INTO warranties (
                sale_id,
                company_id,
                serial_number,
                product_name,
                customer_name,
                customer_email,
                customer_phone,
                warranty_months,
                start_date,
                expires_at,
                is_active,
                invoice_number
            ) VALUES (
                NEW.id,
                NEW.company_id,
                NEW.serial_number,
                product_name_value,
                NEW.customer_name,
                NEW.customer_email,
                NEW.customer_phone,
                NEW.warranty_months,
                NEW.sale_date::date,
                calculate_warranty_expiry(NEW.warranty_months, NEW.sale_date::date),
                TRUE,
                v_invoice_number  -- ✅ USAR INVOICE_NUMBER GENERADO
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_warranty_from_sale IS 
'Trigger que crea automáticamente registros de garantía cuando se inserta una venta con datos de garantía';

-- Create trigger to auto-create warranty on sale
DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;
CREATE TRIGGER tr_create_warranty_from_sale
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION create_warranty_from_sale();

COMMENT ON TRIGGER tr_create_warranty_from_sale ON sales IS 
'Dispara la creación automática de garantías al insertar ventas';

-- Create view for active warranties with remaining days
CREATE OR REPLACE VIEW active_warranties_view AS
SELECT 
    w.*,
    (w.expires_at - CURRENT_DATE) as days_remaining,
    CASE 
        WHEN w.expires_at < CURRENT_DATE THEN 'expired'::TEXT
        WHEN (w.expires_at - CURRENT_DATE) <= 30 THEN 'expiring_soon'::TEXT
        ELSE 'active'::TEXT
    END as warranty_status,
    (
        SELECT COUNT(*)::INTEGER
        FROM service_histories sh
        WHERE sh.warranty_id = w.id
    ) as service_count
FROM warranties w
WHERE w.is_active = true;

COMMENT ON VIEW active_warranties_view IS 
'Vista que muestra garantías activas con días restantes, estado y conteo de servicios';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
-- Índices para mejorar el rendimiento de consultas en garantías

CREATE INDEX IF NOT EXISTS idx_warranties_company_id ON warranties(company_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial_number ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_expires_at ON warranties(expires_at);
CREATE INDEX IF NOT EXISTS idx_warranties_is_active ON warranties(is_active);
CREATE INDEX IF NOT EXISTS idx_warranties_sale_id ON warranties(sale_id);

-- Índices para service_histories
CREATE INDEX IF NOT EXISTS idx_service_histories_warranty_id ON service_histories(warranty_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_company_id ON service_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_status ON service_histories(status);


-- Add similar policies for other tables...

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Main user authentication table';
COMMENT ON TABLE companies IS 'Multi-tenant companies for SaaS architecture';
COMMENT ON TABLE user_company IS 'User-Company relationship with role-based access';
COMMENT ON TABLE products IS 'Product inventory with stock management';
COMMENT ON TABLE sales IS 'Sales records with serial number tracking';
COMMENT ON TABLE warranties IS 'Warranty tracking with expiration dates';
COMMENT ON TABLE service_histories IS 'Technical service and repair tracking';
COMMENT ON TABLE purchases IS 'Purchase orders and inventory entries';
COMMENT ON TABLE product_attributes IS 'Stores dynamic product attributes (e.g., color, size, capacity, speed)';
COMMENT ON TABLE attribute_templates IS 'Template for attributes required in a category';
COMMENT ON COLUMN product_attributes.name IS 'Attribute name (e.g., "Capacity", "Speed", "Color", "Size")';
COMMENT ON COLUMN product_attributes.value IS 'Attribute value (e.g., "1TB", "7000MB/s", "Red", "XL")';
COMMENT ON COLUMN attribute_templates.name IS 'Attribute name that should be set for products in this category';
COMMENT ON COLUMN attribute_templates.is_required IS 'Whether this attribute is mandatory for products in this category';
COMMENT ON COLUMN categories.parent_id IS 'References parent category for hierarchical structure (NULL for root categories)';
COMMENT ON COLUMN products.condition IS 'Product condition: new, used, or open_box';






-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Stockly database schema created successfully!';
    RAISE NOTICE 'Sample data has been inserted for development.';
    RAISE NOTICE 'Remember to configure Row Level Security policies for production.';
END $$;