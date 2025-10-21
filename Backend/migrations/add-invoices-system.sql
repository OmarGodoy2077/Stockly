-- =====================================================
-- INVOICES SYSTEM - Migration v1.3.0
-- =====================================================
-- 
-- Agrega capacidad de generar recibos/invoices desde ventas
-- Permite items adicionales flexibles (envío, comisión COD, etc)
-- Compatible con Supabase PostgreSQL
-- 
-- Ejecutar en: SQL Editor de Supabase
-- Tiempo estimado: < 1 minuto
-- =====================================================

-- =====================================================
-- TABLA INVOICES - Almacena metadata de recibos/facturas
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL, -- Numeración: INV-2025-00001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    invoice_sequence INTEGER NOT NULL, -- Para secuencia por año
    
    -- Datos del cliente (copia de venta para historial)
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_id_type VARCHAR(50), -- DPI, RTC, NIT, etc (opcional)
    customer_id_number VARCHAR(50), -- Número de cédula/RTC
    
    -- Datos del emprendedor/empresa
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_phone VARCHAR(50),
    company_email VARCHAR(255),
    company_rtc VARCHAR(100), -- RTC o equivalente fiscal
    company_logo_url TEXT, -- Logo para el PDF
    
    -- Totales
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 12, -- IVA default 12%
    additional_items_total DECIMAL(10,2) DEFAULT 0, -- Items adicionales
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Metadatos de pago
    payment_method VARCHAR(100), -- transferencia, efectivo, tarjeta, COD
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, partial
    
    -- Términos y notas
    terms_conditions TEXT, -- Términos y condiciones del recibo
    notes TEXT, -- Notas adicionales
    
    -- PDF almacenado
    pdf_url TEXT, -- URL del PDF generado en Cloudinary
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Control
    is_draft BOOLEAN DEFAULT true, -- true = borrador, false = finalizado
    is_cancelled BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, invoice_number),
    UNIQUE(company_id, invoice_year, invoice_sequence),
    CONSTRAINT invoice_total_check CHECK (total_amount >= 0)
);

-- =====================================================
-- TABLA INVOICE_LINE_ITEMS - Items flexibles en invoice
-- =====================================================
-- Permite agregar items que no están en la venta original:
-- - Costo de envío
-- - Comisión COD (Contra Entrega)
-- - Comisión de plataforma
-- - Descuentos especiales
-- - Otros cargos/créditos
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Tipo y descripción
    item_type VARCHAR(50) NOT NULL, -- product, shipping, commission, discount, other
    item_name VARCHAR(255) NOT NULL, -- "Envío a domicilio", "Comisión COD", etc
    item_description TEXT, -- Descripción detallada
    
    -- Si es producto de la BD
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Valores
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0, -- quantity * unit_price
    
    -- Aplicar impuesto a este item?
    is_taxable BOOLEAN DEFAULT false,
    
    -- Orden de visualización
    line_order INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT line_item_total_check CHECK (line_total >= 0)
);

-- =====================================================
-- INDEXES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(company_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(company_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_is_draft ON invoices(is_draft);
CREATE INDEX IF NOT EXISTS idx_invoices_year_sequence ON invoices(company_id, invoice_year, invoice_sequence);

-- Índices para line items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_company_id ON invoice_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_product_id ON invoice_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items(item_type);

-- =====================================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- =====================================================

-- Trigger: Actualizar updated_at en invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_updated_at();

-- Trigger: Actualizar updated_at en invoice_line_items
CREATE OR REPLACE FUNCTION update_invoice_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoice_line_items_updated_at
BEFORE UPDATE ON invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_line_items_updated_at();

-- Trigger: Calcular line_total automáticamente
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

-- =====================================================
-- FUNCIONES RPC PARA LÓGICA DE NEGOCIO
-- =====================================================

-- Función: Generar próximo número de invoice
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
    
    -- Obtener próximo número de secuencia para este año
    v_sequence := COALESCE(
        (SELECT MAX(invoice_sequence) 
         FROM invoices 
         WHERE company_id = p_company_id AND invoice_year = v_year),
        0
    ) + 1;
    
    -- Generar número: INV-2025-00001
    v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    RETURN QUERY SELECT v_invoice_number::VARCHAR, v_sequence, v_year;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular totales de invoice incluyendo items adicionales
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id UUID)
RETURNS TABLE(
    subtotal DECIMAL,
    tax_amount DECIMAL,
    additional_items_total DECIMAL,
    discount_amount DECIMAL,
    total_amount DECIMAL
) AS $$
DECLARE
    v_subtotal DECIMAL(10,2) := 0;
    v_tax_amount DECIMAL(10,2) := 0;
    v_additional_items_total DECIMAL(10,2) := 0;
    v_discount_amount DECIMAL(10,2) := 0;
    v_total_amount DECIMAL(10,2) := 0;
    v_tax_percentage DECIMAL(5,2);
BEGIN
    -- Obtener impuesto del invoice
    SELECT tax_percentage INTO v_tax_percentage
    FROM invoices WHERE id = p_invoice_id;
    
    -- Calcular total de items
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_additional_items_total
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id;
    
    -- El subtotal de la venta más items adicionales
    SELECT COALESCE(i.subtotal, 0) + v_additional_items_total,
           COALESCE(i.discount_amount, 0)
    INTO v_subtotal, v_discount_amount
    FROM invoices i
    WHERE i.id = p_invoice_id;
    
    -- Calcular impuesto solo sobre items gravables
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_tax_amount
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id AND is_taxable = true;
    
    v_tax_amount := v_tax_amount * (v_tax_percentage / 100);
    
    -- Total final
    v_total_amount := v_subtotal + v_tax_amount - v_discount_amount;
    
    RETURN QUERY SELECT v_subtotal, v_tax_amount, v_additional_items_total, v_discount_amount, v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Invoices con detalles de cliente y empresa
CREATE OR REPLACE VIEW invoices_with_details AS
SELECT
    i.id,
    i.company_id,
    i.sale_id,
    i.invoice_number,
    i.invoice_date,
    i.customer_name,
    i.customer_email,
    i.customer_phone,
    i.company_name,
    i.total_amount,
    i.payment_status,
    i.is_draft,
    i.is_cancelled,
    i.pdf_url,
    i.created_at,
    COUNT(ili.id) as line_items_count
FROM invoices i
LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
WHERE i.is_cancelled = false
GROUP BY i.id, i.company_id, i.sale_id, i.invoice_number, i.invoice_date,
         i.customer_name, i.customer_email, i.customer_phone, i.company_name,
         i.total_amount, i.payment_status, i.is_draft, i.is_cancelled,
         i.pdf_url, i.created_at;

-- Vista: Items de invoice desglosados
CREATE OR REPLACE VIEW invoice_line_items_detail AS
SELECT
    ili.id,
    ili.invoice_id,
    ili.item_type,
    ili.item_name,
    ili.item_description,
    ili.quantity,
    ili.unit_price,
    ili.line_total,
    ili.is_taxable,
    ili.line_order,
    p.sku,
    p.name as product_name
FROM invoice_line_items ili
LEFT JOIN products p ON ili.product_id = p.id
ORDER BY ili.line_order ASC;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
-- Las tablas están listas para usar.
-- Próximo paso: Crear modelos y controllers en Backend
-- =====================================================
