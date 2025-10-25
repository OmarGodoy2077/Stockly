# ✅ Checklist de Verificación - Carga de Garantías

## 🔍 Verificación de Cambios en el Código

### Backend - warranty.model.js

- [ ] **Método `getByCompany()`** - Línea ~103
  - ✅ Usa `todayDate` en formato YYYY-MM-DD
  - ✅ Compara con `expires_at` correctamente
  - ✅ Deserializa `sale_products` del JSONB
  - ✅ Calcula `daysRemaining` en formato DATE

- [ ] **Método `findById()`** - Línea ~57
  - ✅ Usa formato DATE para comparaciones
  - ✅ Incluye `sale_products` en el retorno

- [ ] **Método `findBySerialNumber()`** - Línea ~237
  - ✅ Usa formato DATE para comparaciones
  - ✅ Incluye `sale_products` en el retorno

- [ ] **Método `getExpiring()`** - Línea ~384
  - ✅ Usa `todayDate` y `thresholdDate` en formato DATE
  - ✅ Cálculo correcto de `days_remaining`

- [ ] **Método `getStatistics()`** - Línea ~408
  - ✅ Usa comparaciones directas de strings DATE
  - ✅ No usa `new Date()` en comparaciones

---

### Base de Datos - init.sql

- [ ] **Función `calculate_warranty_expiry()`** - Línea ~630
  - ✅ Firma: `calculate_warranty_expiry(months INTEGER, start_date DATE)`
  - ✅ Sin parámetro `DEFAULT`
  - ✅ Sintaxis: `(start_date + (months || ' months')::INTERVAL)::DATE`
  - ✅ Atributo: `IMMUTABLE`

- [ ] **Función `create_warranty_from_sale()`** - Línea ~965
  - ✅ Usa `DECLARE` para variables
  - ✅ Loop: `FOR product_record IN SELECT * FROM jsonb_array_elements(NEW.products)`
  - ✅ Extrae nombre con `COALESCE(product_record->>'product_name', product_record->>'name', ...)`
  - ✅ Valida `NEW.serial_number IS NOT NULL`

- [ ] **Vista `active_warranties_view`** - Línea ~1037
  - ✅ Calcula: `(w.expires_at - CURRENT_DATE) as days_remaining`
  - ✅ Sin `EXTRACT` (usa DATE math directamente)
  - ✅ Incluye `service_count` del subquery
  - ✅ Filtro: `WHERE w.is_active = true`

- [ ] **Índices** - Línea ~1053
  - ✅ `idx_warranties_company_id`
  - ✅ `idx_warranties_serial_number`
  - ✅ `idx_warranties_expires_at`
  - ✅ `idx_warranties_is_active`
  - ✅ `idx_warranties_sale_id`
  - ✅ `idx_service_histories_warranty_id`
  - ✅ `idx_service_histories_company_id`
  - ✅ `idx_service_histories_status`

---

## 🧪 Testing en Backend

### 1. Verificar que no hay errores de sintaxis
```bash
cd Backend
npm run build
# Debe compilar sin errores
```

### 2. Iniciar servidor en desarrollo
```bash
npm run dev
# Debe iniciar sin errores
```

### 3. Probar endpoint en Postman/Thunder Client
```
GET http://localhost:3000/api/v1/warranties?status=all&page=1&limit=20

Headers:
- Authorization: Bearer <TOKEN>
- Content-Type: application/json

Response esperada:
{
  "success": true,
  "data": {
    "warranties": [
      {
        "id": "...",
        "sale_id": "...",
        "company_id": "...",
        "serial_number": "SN-12345",
        "product_name": "Producto",
        "customer_name": "Cliente",
        "warranty_months": 12,
        "start_date": "2024-10-24",
        "expires_at": "2025-10-24",
        "is_active": true,
        "sales": {
          "id": "...",
          "products": [...],  // JSONB array
          "total_amount": 999,
          "sale_date": "2024-10-24"
        },
        "sale_products": [...],  // ✅ DEBE ESTAR
        "days_remaining": 365,   // ✅ DEBE ESTAR
        "warranty_status": "active",  // ✅ DEBE ESTAR
        "service_count": 0      // ✅ DEBE ESTAR
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 4. Casos de Prueba por Status

#### a) Status = all
```
GET /api/v1/warranties?status=all
Esperado: Todas las garantías (activas, expiradas, por vencer)
```

#### b) Status = active
```
GET /api/v1/warranties?status=active
Esperado: Solo garantías donde expires_at >= TODAY AND is_active = true
```

#### c) Status = expired
```
GET /api/v1/warranties?status=expired
Esperado: Solo garantías donde expires_at < TODAY
```

#### d) Status = expiring_soon
```
GET /api/v1/warranties?status=expiring_soon
Esperado: Garantías donde TODAY <= expires_at <= TODAY+30 días AND is_active = true
```

### 5. Búsquedas
```
GET /api/v1/warranties?serial_number=SN-12345
Esperado: Garantías que contengan "SN-12345"

GET /api/v1/warranties?customer_name=Juan
Esperado: Garantías del cliente "Juan"
```

---

## 🎨 Testing en Frontend

### 1. Ir a la página de Garantías
```
URL: http://localhost:5173/garantias
```

### 2. Verificar Carga Inicial
- [ ] La tabla carga sin errores
- [ ] Se muestran las garantías activas por defecto
- [ ] El spinner de carga desaparece

### 3. Verificar Datos Mostrados
En cada fila debe aparecer:
- [ ] Nombre del Producto
- [ ] Número de Serie
- [ ] Nombre del Cliente
- [ ] Estado (badge con color)
- [ ] Días restantes en el estado
- [ ] Número de servicios
- [ ] Fechas (inicio - fin)
- [ ] Botones de acción

### 4. Filtros
- [ ] Cambiar status a "Activas" → actualiza lista
- [ ] Cambiar status a "Expiradas" → muestra expiradas
- [ ] Cambiar status a "Por vencer" → muestra próximas a vencer
- [ ] Buscar por serie → filtra correctamente
- [ ] Buscar por cliente → filtra correctamente

### 5. Paginación
- [ ] Mostrar información de paginación
- [ ] Botones "Anterior/Siguiente" funcionan
- [ ] Al cambiar página, tabla se actualiza

### 6. Verificar en Console
```javascript
// Abrir DevTools (F12)
// Ir a Console
// No debe haber errores de:
// - "sale_products is undefined"
// - "Cannot read property 'products'"
// - "TypeError: warranty.sales is null"
```

---

## 🔎 Verificación de Base de Datos (Supabase)

### 1. Verificar Trigger
```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'tr_create_warranty_from_sale';

-- Debe retornar 1 registro
```

### 2. Verificar Función
```sql
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('calculate_warranty_expiry', 'create_warranty_from_sale');

-- Debe retornar 2 registros
```

### 3. Verificar Vista
```sql
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'active_warranties_view';

-- Debe retornar 1 registro con table_type = 'VIEW'
```

### 4. Verificar Índices
```sql
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename IN ('warranties', 'service_histories')
ORDER BY tablename, indexname;

-- Debe retornar 8 registros
```

### 5. Consultar Garantías Activas
```sql
SELECT 
    id,
    serial_number,
    product_name,
    customer_name,
    expires_at,
    (expires_at - CURRENT_DATE) as days_remaining,
    is_active
FROM warranties
WHERE company_id = '<COMPANY_ID>'
AND is_active = true
LIMIT 5;

-- Verificar que:
-- - Retorna filas
-- - days_remaining es positivo para activas
-- - Todos son is_active = true
```

### 6. Verificar Serialización de Productos
```sql
SELECT 
    s.id,
    s.products,
    jsonb_array_length(s.products) as product_count
FROM sales s
WHERE s.company_id = '<COMPANY_ID>'
LIMIT 3;

-- Verificar que:
-- - products no es NULL
-- - Es un array JSONB válido
-- - product_count > 0
```

---

## ⚡ Checklist Final

### Antes de dar por resuelto:

- [ ] Backend compila sin errores
- [ ] Backend inicia sin errores
- [ ] GET /api/v1/warranties retorna datos
- [ ] sale_products está incluido en respuesta
- [ ] days_remaining es calculado correctamente
- [ ] warranty_status es correcto
- [ ] Filtros funcionan
- [ ] Búsquedas funcionan
- [ ] Paginación funciona
- [ ] Frontend carga sin errores
- [ ] Tabla muestra datos
- [ ] No hay errores en Console
- [ ] Productos se muestran correctamente
- [ ] BD tiene trigger activo
- [ ] BD tiene función correcta
- [ ] BD tiene vista correcta
- [ ] BD tiene índices creados

---

## 📋 Valores Esperados de Ejemplo

Si tienes una venta creada el 2024-10-24 con 12 meses de garantía:

| Campo | Valor Esperado |
|-------|----------------|
| `start_date` | 2024-10-24 |
| `expires_at` | 2025-10-24 |
| `warranty_status` | "active" (si hoy < 2025-10-24) |
| `warranty_status` | "expired" (si hoy > 2025-10-24) |
| `days_remaining` | Positivo si activa, negativo si expirada |
| `sale_products` | Array con productos de la venta |
| `is_active` | true (por defecto) |

---

## 🆘 Troubleshooting

### Problema: "No se encontraron garantías"
- [ ] Verificar que existen ventas con warranty_months > 0
- [ ] Verificar que las ventas tienen serial_number
- [ ] Verificar que el trigger está activo
- [ ] Verificar que la función calculate_warranty_expiry existe

### Problema: "sale_products es undefined"
- [ ] Verificar que sale_products está siendo retornado del backend
- [ ] Ver que warranty.sales.products tiene datos
- [ ] Verificar parsing de JSON.parse()

### Problema: "days_remaining incorrectos"
- [ ] Verificar que se usan formato DATE (YYYY-MM-DD)
- [ ] No mezclar Date objects con strings de fecha
- [ ] Usar UTC timezone para consistencia

### Problema: "Error en BD"
- [ ] Ejecutar migrations en orden correcto
- [ ] Verificar sintaxis SQL en Supabase
- [ ] Ver logs de errores en backend

---

**Última actualización:** 24 de Octubre de 2025
**Versión:** v1.3.0
