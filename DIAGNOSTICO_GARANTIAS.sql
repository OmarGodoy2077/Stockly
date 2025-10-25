-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO - GARANTÍAS Y VENTAS
-- ============================================================================
-- Ejecuta este script en Supabase SQL Editor para diagnosticar el problema
-- Copia y pega cada sección y ejecuta
-- ============================================================================

-- ============================================================================
-- 1. CONTAR VENTAS CON WARRANTY
-- ============================================================================
-- Verificar cuántas ventas tienen configurada garantía

SELECT 
    COUNT(*) as total_sales,
    COUNT(CASE WHEN warranty_months > 0 THEN 1 END) as sales_with_warranty,
    COUNT(CASE WHEN serial_number IS NOT NULL THEN 1 END) as sales_with_serial,
    COUNT(CASE WHEN warranty_months > 0 AND serial_number IS NOT NULL THEN 1 END) as sales_with_warranty_and_serial
FROM sales;

-- Resultado esperado:
-- Debería haber sales_with_warranty > 0


-- ============================================================================
-- 2. VER DETALLES DE VENTAS CON WARRANTY
-- ============================================================================
-- Ver las ventas que deberían generar garantías

SELECT 
    id,
    customer_name,
    warranty_months,
    serial_number,
    total_amount,
    sale_date,
    products
FROM sales
WHERE warranty_months > 0 
  AND serial_number IS NOT NULL
LIMIT 5;

-- Resultado esperado:
-- Debería listar ventas con warranty_months > 0 y serial_number


-- ============================================================================
-- 3. CONTAR GARANTÍAS CREADAS
-- ============================================================================
-- Verificar cuántas garantías se crearon

SELECT 
    COUNT(*) as total_warranties,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_warranties,
    COUNT(CASE WHEN expires_at >= CURRENT_DATE THEN 1 END) as not_expired,
    COUNT(CASE WHEN expires_at < CURRENT_DATE THEN 1 END) as expired
FROM warranties;

-- Resultado esperado:
-- Debería haber warranties > 0


-- ============================================================================
-- 4. VER TODAS LAS GARANTÍAS
-- ============================================================================
-- Ver todas las garantías creadas

SELECT 
    w.id,
    w.serial_number,
    w.product_name,
    w.customer_name,
    w.warranty_months,
    w.start_date,
    w.expires_at,
    w.is_active,
    (w.expires_at - CURRENT_DATE) as days_remaining,
    w.created_at
FROM warranties w
ORDER BY w.created_at DESC
LIMIT 10;

-- Resultado esperado:
-- Si no hay filas = PROBLEMA: El trigger no crea garantías


-- ============================================================================
-- 5. VERIFICAR RELACIÓN VENTA-GARANTÍA
-- ============================================================================
-- Verificar que las garantías están vinculadas a ventas

SELECT 
    s.id as sale_id,
    s.customer_name,
    s.warranty_months,
    s.serial_number,
    w.id as warranty_id,
    w.product_name,
    COUNT(w.id) as warranty_count
FROM sales s
LEFT JOIN warranties w ON s.id = w.sale_id
WHERE s.warranty_months > 0 AND s.serial_number IS NOT NULL
GROUP BY s.id, w.id
ORDER BY s.created_at DESC
LIMIT 10;

-- Resultado esperado:
-- warranty_count debería ser > 0 para cada venta con warranty


-- ============================================================================
-- 6. COMPROBAR TRIGGER
-- ============================================================================
-- Verificar que el trigger existe y está activo

SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'tr_create_warranty_from_sale';

-- Resultado esperado:
-- Debe retornar 1 fila


-- ============================================================================
-- 7. COMPROBAR FUNCIÓN
-- ============================================================================
-- Verificar que la función existe

SELECT 
    routine_name,
    routine_type,
    data_type,
    language_name
FROM information_schema.routines
WHERE routine_name IN ('calculate_warranty_expiry', 'create_warranty_from_sale');

-- Resultado esperado:
-- Debe retornar 2 filas


-- ============================================================================
-- 8. VER ESTRUCTURA DE PRODUCTOS EN VENTA
-- ============================================================================
-- Verificar qué estructura tienen los productos en el JSONB

SELECT 
    id as sale_id,
    products,
    jsonb_array_length(products) as num_products,
    products->>0 as first_product_raw
FROM sales
WHERE warranty_months > 0 AND serial_number IS NOT NULL
LIMIT 3;

-- Resultado esperado:
-- Debe mostrar la estructura JSONB de los productos
-- Verificar si tienen campo "name", "product_name", "product_id", etc.


-- ============================================================================
-- 9. EXTRAER NOMBRES DE PRODUCTOS CORRECTAMENTE
-- ============================================================================
-- Verificar cómo extraer los nombres de los productos

SELECT 
    id as sale_id,
    customer_name,
    jsonb_array_elements(products)->>'name' as product_name_v1,
    jsonb_array_elements(products)->>'product_name' as product_name_v2,
    jsonb_array_elements(products)->>'product_id' as product_id
FROM sales
WHERE warranty_months > 0 AND serial_number IS NOT NULL
LIMIT 5;

-- Resultado esperado:
-- Ver cuál de product_name_v1 o product_name_v2 tiene datos


-- ============================================================================
-- 10. SIMULAR CREACIÓN DE GARANTÍA MANUALMENTE
-- ============================================================================
-- Crear una garantía manualmente para una venta (CUIDADO: esto inserta datos)

-- PRIMERO, VER CUÁL ES LA VENTA A USAR:
SELECT 
    id,
    customer_name,
    warranty_months,
    serial_number,
    products
FROM sales
WHERE warranty_months > 0 AND serial_number IS NOT NULL
LIMIT 1;

-- LUEGO, copiar el ID de la venta y ejecutar (reemplaza SALE_ID_AQUI):
-- BEGIN;
-- INSERT INTO warranties (
--     sale_id,
--     company_id,
--     serial_number,
--     product_name,
--     customer_name,
--     warranty_months,
--     start_date,
--     expires_at,
--     is_active
-- ) VALUES (
--     'SALE_ID_AQUI',
--     (SELECT company_id FROM sales WHERE id = 'SALE_ID_AQUI'),
--     (SELECT serial_number FROM sales WHERE id = 'SALE_ID_AQUI'),
--     'Producto Test',
--     (SELECT customer_name FROM sales WHERE id = 'SALE_ID_AQUI'),
--     (SELECT warranty_months FROM sales WHERE id = 'SALE_ID_AQUI'),
--     CURRENT_DATE,
--     calculate_warranty_expiry((SELECT warranty_months FROM sales WHERE id = 'SALE_ID_AQUI'), CURRENT_DATE),
--     true
-- );
-- ROLLBACK;  -- Cambiar a COMMIT si funciona


-- ============================================================================
-- 11. VER GARANTÍAS POR ESTADO
-- ============================================================================
-- Verificar garantías por estado (como lo hace el backend)

SELECT 
    'active' as status,
    COUNT(*) as count
FROM warranties
WHERE is_active = true AND expires_at >= CURRENT_DATE
UNION ALL
SELECT 
    'expired' as status,
    COUNT(*)
FROM warranties
WHERE expires_at < CURRENT_DATE
UNION ALL
SELECT 
    'expiring_soon' as status,
    COUNT(*)
FROM warranties
WHERE is_active = true 
  AND expires_at >= CURRENT_DATE 
  AND expires_at <= CURRENT_DATE + INTERVAL '30 days';

-- Resultado esperado:
-- Mostrar conteo por estado


-- ============================================================================
-- 12. VISTA DE GARANTÍAS ACTIVAS
-- ============================================================================
-- Probar la vista que usa el backend

SELECT 
    id,
    serial_number,
    product_name,
    customer_name,
    warranty_months,
    days_remaining,
    warranty_status,
    service_count
FROM active_warranties_view
LIMIT 10;

-- Resultado esperado:
-- Debe retornar garantías activas con todos los campos


-- ============================================================================
-- RESUMEN - CHECKLIST
-- ============================================================================
-- Ejecuta las queries anteriores y verifica:
--
-- [ ] Query 1: sales_with_warranty > 0
-- [ ] Query 3: total_warranties > 0
-- [ ] Query 4: Retorna filas
-- [ ] Query 5: warranty_count > 0 para cada venta
-- [ ] Query 6: Trigger existe
-- [ ] Query 7: 2 funciones existen
-- [ ] Query 8: Muestra estructura JSONB
-- [ ] Query 9: Nombres de productos aparecen
-- [ ] Query 11: Conteos > 0
-- [ ] Query 12: Vista retorna filas
--
-- SI FALLA:
-- - Query 1 falla → No hay ventas con warranty, crear vendas desde frontend
-- - Query 3 falla → El trigger no se ejecutó, revisar logs
-- - Query 6 falla → Ejecutar run-warranty-migration.sql nuevamente
-- - Query 7 falla → Ejecutar run-warranty-migration.sql nuevamente
--
-- ============================================================================

