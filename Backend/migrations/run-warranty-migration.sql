-- ============================================================================
-- IMPORTANTE: INSTRUCCIONES DE EJECUCIÓN
-- ============================================================================
-- Este script debe ejecutarse en orden. Si hay errores, ejecutar por secciones.
-- 
-- PASOS:
-- 1. Primero ejecutar SOLO la sección "CLEANUP"
-- 2. Luego ejecutar las secciones "FUNCTIONS" y "TRIGGER"
-- 3. Finalmente ejecutar "VIEWS" e "INDEXES"
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: CLEANUP (Ejecutar primero)
-- ============================================================================
-- Eliminar triggers y funciones existentes
DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;
DROP FUNCTION IF EXISTS create_warranty_from_sale();
DROP FUNCTION IF EXISTS calculate_warranty_expiry(INTEGER, DATE);
DROP VIEW IF EXISTS active_warranties_view;

-- ============================================================================
-- SECCIÓN 2: FUNCTIONS (Ejecutar después del cleanup)
-- ============================================================================

-- Función para calcular fecha de expiración de garantía
CREATE FUNCTION calculate_warranty_expiry(months INTEGER, start_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN (start_date + (months || ' months')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_warranty_expiry IS 
'Calcula la fecha de expiración de garantía sumando meses a la fecha de inicio';

-- ============================================================================
-- SECCIÓN 3: TRIGGER FUNCTION (Ejecutar después de functions)
-- ============================================================================

-- Función del trigger para crear garantías automáticamente
CREATE FUNCTION create_warranty_from_sale()
RETURNS TRIGGER AS $$
DECLARE
    product_record JSONB;
    product_name_value VARCHAR(255);
BEGIN
    -- Solo crear garantía si:
    -- 1. Se especificaron meses de garantía (> 0)
    -- 2. Existe número de serie
    IF NEW.warranty_months IS NOT NULL 
       AND NEW.warranty_months > 0 
       AND NEW.serial_number IS NOT NULL 
       AND NEW.serial_number != '' THEN
        
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

COMMENT ON FUNCTION create_warranty_from_sale IS 
'Trigger que crea automáticamente registros de garantía cuando se inserta una venta con datos de garantía';

-- ============================================================================
-- SECCIÓN 4: TRIGGER (Ejecutar después de trigger function)
-- ============================================================================

-- Crear trigger en la tabla sales
CREATE TRIGGER tr_create_warranty_from_sale
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION create_warranty_from_sale();

COMMENT ON TRIGGER tr_create_warranty_from_sale ON sales IS 
'Dispara la creación automática de garantías al insertar ventas';

-- ============================================================================
-- SECCIÓN 5: VIEWS (Ejecutar después del trigger)
-- ============================================================================

-- Vista para garantías activas con días restantes calculados
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

COMMENT ON VIEW active_warranties_view IS 
'Vista que muestra garantías activas con días restantes, estado y conteo de servicios';

-- ============================================================================
-- SECCIÓN 6: INDEXES (Ejecutar al final, opcional pero recomendado)
-- ============================================================================

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_warranties_company_id ON warranties(company_id);
CREATE INDEX IF NOT EXISTS idx_warranties_serial_number ON warranties(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranties_expires_at ON warranties(expires_at);
CREATE INDEX IF NOT EXISTS idx_warranties_is_active ON warranties(is_active);
CREATE INDEX IF NOT EXISTS idx_warranties_sale_id ON warranties(sale_id);

CREATE INDEX IF NOT EXISTS idx_service_histories_warranty_id ON service_histories(warranty_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_company_id ON service_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_service_histories_status ON service_histories(status);

-- ============================================================================
-- VERIFICACIÓN (Ejecutar para confirmar que todo está correcto)
-- ============================================================================

-- Verificar que las funciones fueron creadas
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN ('calculate_warranty_expiry', 'create_warranty_from_sale')
ORDER BY routine_name;

-- Verificar que el trigger fue creado
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'tr_create_warranty_from_sale';

-- Verificar que la vista fue creada
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'active_warranties_view';

-- Verificar índices creados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_warranties_%' OR indexname LIKE 'idx_service_histories_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- PRUEBA RÁPIDA (Opcional - para verificar funcionamiento)
-- ============================================================================

-- Esta consulta muestra las garantías activas con su estado
-- SELECT * FROM active_warranties_view LIMIT 5;

-- Esta consulta muestra cuántas garantías por estado hay
-- SELECT 
--     warranty_status,
--     COUNT(*) as count
-- FROM active_warranties_view
-- GROUP BY warranty_status;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
