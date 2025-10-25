-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO Y SOLUCIÓN RÁPIDA
-- ============================================================================
-- Ejecuta TODAS estas queries en orden en Supabase SQL Editor
-- ============================================================================

-- 1. DIAGNÓSTICO: ¿Hay ventas?
SELECT 
    COUNT(*) as total_sales,
    COUNT(CASE WHEN warranty_months > 0 THEN 1 END) as con_warranty,
    COUNT(CASE WHEN serial_number IS NOT NULL THEN 1 END) as con_serie
FROM sales;

-- RESULTADO ESPERADO:
-- Si total_sales = 0 → No hay ventas, problema: no creaste ninguna desde el frontend
-- Si total_sales > 0 pero con_warranty = 0 → Las ventas no tienen warranty_months
-- Si total_sales > 0 y con_warranty > 0 pero con_serie = 0 → Las ventas sin serial_number

-- ============================================================================

-- 2. DIAGNÓSTICO: ¿Hay garantías?
SELECT 
    COUNT(*) as total_warranties
FROM warranties;

-- RESULTADO ESPERADO:
-- Si = 0 → El trigger no creó garantías
-- Si > 0 → Las garantías se crearon, el problema es otro

-- ============================================================================

-- 3. DIAGNOSTIC: Ver la relación
SELECT 
    s.id as sale_id,
    s.customer_name,
    s.warranty_months,
    s.serial_number,
    COUNT(w.id) as warranty_count
FROM sales s
LEFT JOIN warranties w ON s.id = w.sale_id
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT 5;

-- ============================================================================
-- SI LLEGASTE AQUÍ Y NO HAY GARANTÍAS, EJECUTA ESTO:
-- ============================================================================

-- Opción A: CREAR DATOS DE PRUEBA COMPLETOS (si la tabla está vacía)
-- Descomenta y ejecuta solo si sales table está vacía

/*
-- Primero, obtener company_id y user_id de ejemplo
WITH user_company AS (
    SELECT uc.company_id, uc.user_id
    FROM user_company uc
    LIMIT 1
)
INSERT INTO sales (
    company_id,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    products,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    serial_number,
    warranty_months,
    payment_method,
    sales_platform,
    sale_date
)
SELECT
    uc.company_id,
    uc.user_id,
    'Cliente de Prueba',
    'cliente@test.com',
    '1234567890',
    '[{"product_id":"' || p.id || '","product_name":"' || p.name || '","quantity":1,"unit_price":' || p.sell_price || '}]'::jsonb,
    1000.00,
    0,
    0,
    1000.00,
    'SN-TEST-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
    12,
    'cash',
    'direct',
    CURRENT_DATE
FROM user_company uc
CROSS JOIN (SELECT id, name, sell_price FROM products LIMIT 1) p;

-- Verificar que se creó la venta
SELECT COUNT(*) FROM sales;
SELECT COUNT(*) FROM warranties;
*/

-- ============================================================================
-- Opción B: CREAR GARANTÍAS MANUALMENTE DE VENTAS EXISTENTES
-- ============================================================================

-- Si ya tienes ventas, ejecuta esto para crear garantías:
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
    s.id,
    s.company_id,
    s.serial_number,
    COALESCE((s.products->>0)::jsonb->>'product_name', (s.products->>0)::jsonb->>'name', 'Producto Vendido'),
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    s.warranty_months,
    s.sale_date::date,
    calculate_warranty_expiry(s.warranty_months, s.sale_date::date),
    true
FROM sales s
WHERE s.warranty_months > 0
  AND s.serial_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM warranties w WHERE w.sale_id = s.id
  );

-- Verificar cuántas se crearon
SELECT 'Garantías creadas:' as status, COUNT(*) as total FROM warranties;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver las garantías creadas
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
    END as status,
    w.is_active
FROM warranties w
ORDER BY w.created_at DESC
LIMIT 10;
