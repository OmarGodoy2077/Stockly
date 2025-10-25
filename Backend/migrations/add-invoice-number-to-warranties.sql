-- Migration: Add invoice_number to warranties table
-- Date: 2025-01-24
-- Description: Agregar número de factura a garantías para referencia cruzada

ALTER TABLE warranties ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Actualizar garantías existentes desde sales si existe relación
UPDATE warranties w
SET invoice_number = s.id::text
FROM sales s
WHERE w.sale_id = s.id AND w.invoice_number IS NULL;

-- Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_warranties_invoice_number ON warranties(invoice_number);
