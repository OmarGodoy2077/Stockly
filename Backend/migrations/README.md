# Migraciones de Base de Datos - Sistema de Garantías

## 📋 Archivos Disponibles

### 1. `add-warranty-triggers.sql`
Script simplificado para ejecutar todo de una vez. **Recomendado para desarrollo**.

### 2. `run-warranty-migration.sql`
Script completo con instrucciones detalladas y secciones separadas. **Recomendado para producción**.

## 🚀 Cómo Ejecutar

### Opción A: Ejecución Rápida (Desarrollo)

```sql
-- Ejecutar todo el archivo add-warranty-triggers.sql
\i add-warranty-triggers.sql
```

### Opción B: Ejecución por Pasos (Producción)

1. **Abrir Supabase SQL Editor** o tu cliente PostgreSQL preferido

2. **Ejecutar SOLO la sección de CLEANUP**:
```sql
DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;
DROP FUNCTION IF EXISTS create_warranty_from_sale();
DROP FUNCTION IF EXISTS calculate_warranty_expiry(INTEGER, DATE);
DROP VIEW IF EXISTS active_warranties_view;
```

3. **Ejecutar la función de cálculo**:
```sql
CREATE FUNCTION calculate_warranty_expiry(months INTEGER, start_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN (start_date + (months || ' months')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

4. **Ejecutar la función del trigger**:
```sql
-- (Ver archivo run-warranty-migration.sql para el código completo)
```

5. **Crear el trigger**:
```sql
CREATE TRIGGER tr_create_warranty_from_sale
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION create_warranty_from_sale();
```

6. **Crear la vista y los índices** (opcional pero recomendado)

## ✅ Verificación

Después de ejecutar la migración, verifica que todo esté correcto:

```sql
-- Verificar funciones
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('calculate_warranty_expiry', 'create_warranty_from_sale');

-- Verificar trigger
SELECT trigger_name, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'tr_create_warranty_from_sale';

-- Verificar vista
SELECT table_name
FROM information_schema.tables 
WHERE table_name = 'active_warranties_view';
```

## 🔧 Qué hace esta migración

### 1. Función `calculate_warranty_expiry`
Calcula la fecha de expiración de una garantía sumando los meses especificados a la fecha de inicio.

**Ejemplo:**
```sql
SELECT calculate_warranty_expiry(12, '2025-01-01'::DATE);
-- Resultado: 2026-01-01
```

### 2. Función `create_warranty_from_sale`
Se ejecuta automáticamente cuando se inserta una venta y:
- Verifica que la venta tenga `warranty_months > 0`
- Verifica que exista un `serial_number`
- Crea un registro de garantía por cada producto en la venta
- Calcula automáticamente la fecha de expiración

### 3. Trigger `tr_create_warranty_from_sale`
Dispara la función anterior cada vez que se inserta una nueva venta.

### 4. Vista `active_warranties_view`
Vista materializada que muestra:
- Todas las garantías activas
- Días restantes de garantía
- Estado de la garantía (active, expiring_soon, expired)
- Cantidad de servicios técnicos asociados

**Ejemplo de uso:**
```sql
-- Ver todas las garantías que están por vencer
SELECT * FROM active_warranties_view 
WHERE warranty_status = 'expiring_soon'
ORDER BY days_remaining ASC;

-- Ver garantías con servicios
SELECT * FROM active_warranties_view 
WHERE service_count > 0;
```

## 🐛 Solución de Problemas

### Error: "cannot remove parameter defaults from existing function"
**Solución:** Ejecutar primero el CLEANUP para eliminar las funciones existentes.

### Error: "trigger already exists"
**Solución:** Ejecutar `DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;`

### Error: "function does not exist"
**Solución:** Asegurarse de crear las funciones en orden:
1. `calculate_warranty_expiry` primero
2. `create_warranty_from_sale` segundo
3. Trigger al final

### Las garantías no se crean automáticamente
**Verificar:**
1. La venta tiene `warranty_months > 0`
2. La venta tiene `serial_number` válido (no NULL, no vacío)
3. El trigger está activo: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'tr_create_warranty_from_sale';`

## 📝 Notas Importantes

1. **Ventas Existentes:** Esta migración NO crea garantías para ventas existentes, solo para ventas nuevas después de ejecutar la migración.

2. **Productos sin Nombre:** Si un producto no tiene nombre en el JSONB, se usará "Producto sin nombre".

3. **Performance:** Los índices creados mejoran significativamente el rendimiento de consultas, especialmente con grandes volúmenes de datos.

4. **Multi-tenant:** El sistema respeta el `company_id`, por lo que cada empresa solo ve sus propias garantías.

## 🔄 Rollback

Si necesitas revertir los cambios:

```sql
-- Eliminar todo
DROP TRIGGER IF EXISTS tr_create_warranty_from_sale ON sales;
DROP FUNCTION IF EXISTS create_warranty_from_sale();
DROP FUNCTION IF EXISTS calculate_warranty_expiry(INTEGER, DATE);
DROP VIEW IF EXISTS active_warranties_view;

-- Eliminar índices (opcional)
DROP INDEX IF EXISTS idx_warranties_company_id;
DROP INDEX IF EXISTS idx_warranties_serial_number;
DROP INDEX IF EXISTS idx_warranties_expires_at;
DROP INDEX IF EXISTS idx_warranties_is_active;
DROP INDEX IF EXISTS idx_warranties_sale_id;
DROP INDEX IF EXISTS idx_service_histories_warranty_id;
DROP INDEX IF EXISTS idx_service_histories_company_id;
DROP INDEX IF EXISTS idx_service_histories_status;
```

## 📧 Soporte

Si encuentras problemas, verifica:
1. Que la estructura de las tablas `sales`, `warranties` y `service_histories` sea correcta
2. Que los tipos de datos coincidan
3. Los logs de PostgreSQL para mensajes de error detallados
