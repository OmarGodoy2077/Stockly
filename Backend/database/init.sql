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

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Categories table for products
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Products table - Inventory management
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    image_url TEXT,
    barcode VARCHAR(255),
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
    products JSONB NOT NULL, -- Array of {product_id, quantity, unit_price}
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_serial_number ON sales(serial_number);

-- Warranties indexes
CREATE INDEX IF NOT EXISTS idx_warranties_company_id ON warranties(company_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_expires ON warranties(expires_at);
CREATE INDEX IF NOT EXISTS idx_warranties_active ON warranties(is_active);

-- Service histories indexes
CREATE INDEX IF NOT EXISTS idx_service_histories_company_id ON service_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_serial ON service_histories(serial_number);
CREATE INDEX IF NOT EXISTS idx_service_histories_status ON service_histories(status);
CREATE INDEX IF NOT EXISTS idx_service_histories_entry_date ON service_histories(entry_date);

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
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_histories_updated_at BEFORE UPDATE ON service_histories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate warranty expiration date
CREATE OR REPLACE FUNCTION calculate_warranty_expiry(months INTEGER, start_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN start_date + INTERVAL '1 month' * months;
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

-- Basic RLS policies (users can only access their company data)
-- These are basic policies - you might want to make them more sophisticated

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view company data" ON companies FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_company WHERE company_id = companies.id AND user_id = auth.uid())
);
CREATE POLICY "Users can view products in their companies" ON products FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_company WHERE company_id = products.company_id AND user_id = auth.uid())
);

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

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Stockly database schema created successfully!';
    RAISE NOTICE 'Sample data has been inserted for development.';
    RAISE NOTICE 'Remember to configure Row Level Security policies for production.';
END $$;