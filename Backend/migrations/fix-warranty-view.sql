-- ============================================================================
-- FIX: Recrear vista con sintaxis correcta
-- ============================================================================
-- Este script corrige el error de la vista active_warranties_view
-- Ejecutar si obtuviste el error: "function pg_catalog.extract(unknown, integer) does not exist"
-- ============================================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS active_warranties_view;

-- Recrear vista con sintaxis correcta (DATE - DATE devuelve INTEGER directamente)
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

-- Verificar que la vista fue creada correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'active_warranties_view';

-- Probar la vista
SELECT * FROM active_warranties_view LIMIT 5;
