-- Migration: Add warranty triggers and views
-- Description: Auto-create warranties from sales and create views for warranty status
-- 
-- NOTA: Si hay problemas al ejecutar, usar run-warranty-migration.sql
--       que tiene instrucciones detalladas paso a paso

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;
DROP FUNCTION IF EXISTS create_warranty_from_sale();
DROP FUNCTION IF EXISTS calculate_warranty_expiry(INTEGER, DATE);
DROP VIEW IF EXISTS active_warranties_view;

-- Create function to calculate warranty expiry date
CREATE FUNCTION calculate_warranty_expiry(months INTEGER, start_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN (start_date + (months || ' months')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function for auto warranty creation
CREATE FUNCTION create_warranty_from_sale()
RETURNS TRIGGER AS $$
DECLARE
    product_record JSONB;
    product_name_value VARCHAR(255);
BEGIN
    -- Only create warranty if warranty months are specified and greater than 0
    -- AND if serial number exists
    IF NEW.warranty_months IS NOT NULL 
       AND NEW.warranty_months > 0 
       AND NEW.serial_number IS NOT NULL 
       AND NEW.serial_number != '' THEN
        
        -- Loop through each product in the products array
        FOR product_record IN SELECT * FROM jsonb_array_elements(NEW.products)
        LOOP
            -- Extract product name (try different possible field names)
            product_name_value := COALESCE(
                product_record->>'product_name',
                product_record->>'name',
                'Producto sin nombre'
            );
            
            -- Insert warranty for this product
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
                is_active
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
                TRUE
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create warranty on sale
CREATE TRIGGER tr_create_warranty_from_sale
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION create_warranty_from_sale();

-- Create view for active warranties with remaining days
CREATE VIEW active_warranties_view AS
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warranties_company_id ON warranties(company_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial_number ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_expires_at ON warranties(expires_at);
CREATE INDEX IF NOT EXISTS idx_warranties_is_active ON warranties(is_active);
CREATE INDEX IF NOT EXISTS idx_service_histories_warranty_id ON service_histories(warranty_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_company_id ON service_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_status ON service_histories(status);

-- Add comments for documentation
COMMENT ON FUNCTION calculate_warranty_expiry IS 'Calculates warranty expiration date based on months and start date';
COMMENT ON FUNCTION create_warranty_from_sale IS 'Automatically creates warranty entries when a sale with warranty is recorded';
COMMENT ON VIEW active_warranties_view IS 'View showing active warranties with calculated days remaining and status';
