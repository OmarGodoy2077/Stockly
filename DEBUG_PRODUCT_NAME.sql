-- ============================================
-- DEBUG: Qué se está guardando en BD
-- ============================================

-- 1. Ver EXACTAMENTE qué hay en las ventas
SELECT 
    id as sale_id,
    customer_name,
    serial_number,
    warranty_months,
    products as products_jsonb,
    jsonb_typeof(products) as products_type,
    products::jsonb->0 as first_product_obj,
    products::jsonb->0->>'product_name' as extracted_product_name,
    products::jsonb->0->>'name' as extracted_name_alt
FROM sales
WHERE serial_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver garantías vs productos almacenados
SELECT 
    w.id as warranty_id,
    w.sale_id,
    w.product_name as warranty_product_name,
    w.invoice_number,
    w.serial_number,
    s.products::jsonb->0->>'product_name' as stored_product_name,
    s.products::jsonb->0->>'name' as stored_name_alt,
    (s.products::jsonb->0) as full_first_product
FROM warranties w
LEFT JOIN sales s ON w.sale_id = s.id
WHERE w.serial_number IS NOT NULL
ORDER BY w.created_at DESC
LIMIT 5;

-- 3. Ver si hay datos en la tabla products (para comparar nombres)
SELECT 
    p.id,
    p.name as db_product_name,
    (SELECT COUNT(*) FROM sales s, jsonb_array_elements(s.products) AS prod 
     WHERE prod->>'product_id' = p.id::text AND s.serial_number IS NOT NULL) as used_in_sales
FROM products
LIMIT 10;
