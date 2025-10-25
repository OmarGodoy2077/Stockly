-- ============================================================================
-- SOLUCIÓN INMEDIATA: CREAR GARANTÍAS DE LAS VENTAS EXISTENTES
-- ============================================================================
-- Este script crea las garantías a partir de las ventas que ya tienes

-- PASO 1: Ver las ventas sin serial_number
SELECT 
    id,
    customer_name,
    warranty_months,
    serial_number,
    products
FROM sales
WHERE warranty_months > 0
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- PASO 2: CREAR GARANTÍAS (ejecuta este INSERT)
-- ============================================================================

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
)
SELECT
    s.id as sale_id,
    s.company_id,
    COALESCE(s.serial_number, 'SN-' || SUBSTRING(s.id::text, 1, 8)) as serial_number,
    COALESCE(
        (s.products::jsonb->>0)::jsonb->>'product_name',
        (s.products::jsonb->>0)::jsonb->>'name',
        'Producto Garantizado'
    ) as product_name,
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    s.warranty_months,
    s.sale_date::date as start_date,
    calculate_warranty_expiry(s.warranty_months, s.sale_date::date) as expires_at,
    true as is_active
FROM sales s
WHERE s.warranty_months > 0
  AND NOT EXISTS (
    SELECT 1 FROM warranties w WHERE w.sale_id = s.id
  );

-- ============================================================================
-- PASO 3: VERIFICAR QUE SE CREARON
-- ============================================================================

SELECT 
    'Total de garantías creadas:' as info,
    COUNT(*) as cantidad
FROM warranties;

-- ============================================================================
-- PASO 4: VER LAS GARANTÍAS CREADAS
-- ============================================================================

SELECT 
    w.id,
    w.serial_number,
    w.product_name,
    w.customer_name,
    w.warranty_months,
    w.start_date,
    w.expires_at,
    (w.expires_at - CURRENT_DATE) as days_remaining,
    CASE 
        WHEN w.expires_at < CURRENT_DATE THEN 'expired'
        WHEN (w.expires_at - CURRENT_DATE) <= 30 THEN 'expiring_soon'
        ELSE 'active'
    END as warranty_status,
    w.is_active
FROM warranties w
ORDER BY w.created_at DESC;
