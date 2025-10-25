# 🔧 GUÍA COMPLETA - Solucionar Problema de Garantías No Cargadas

## 🎯 Objetivo
Cargar todas las ventas con garantía y mostrarlas en el módulo de Garantías.

---

## ✅ PASO 1: Verificar Estado de los Datos en BD

### 1.1 Abre Supabase SQL Editor
1. Ve a https://supabase.com
2. Abre tu proyecto "Stockly"
3. Ve a SQL Editor (menú izquierdo)
4. Crea una nueva query

### 1.2 Ejecuta estas queries UNA POR UNA

#### Query A: Contar ventas con garantía
```sql
SELECT 
    COUNT(*) as total_sales,
    COUNT(CASE WHEN warranty_months > 0 THEN 1 END) as sales_with_warranty,
    COUNT(CASE WHEN serial_number IS NOT NULL THEN 1 END) as sales_with_serial,
    COUNT(CASE WHEN warranty_months > 0 AND serial_number IS NOT NULL THEN 1 END) as sales_with_warranty_and_serial
FROM sales;
```

**Qué esperar:**
- Si `sales_with_warranty > 0` ✅ Hay ventas con garantía
- Si `sales_with_warranty = 0` ❌ No hay ventas con garantía (crea una desde el frontend)

#### Query B: Ver ventas con garantía
```sql
SELECT 
    id,
    customer_name,
    warranty_months,
    serial_number,
    total_amount,
    sale_date
FROM sales
WHERE warranty_months > 0 AND serial_number IS NOT NULL
ORDER BY sale_date DESC
LIMIT 5;
```

**Qué esperar:**
- Debe listar las ventas que tienen garantía y serie

#### Query C: Contar garantías creadas
```sql
SELECT 
    COUNT(*) as total_warranties
FROM warranties;
```

**Qué esperar:**
- `total_warranties > 0` ✅ El trigger creó garantías automáticamente
- `total_warranties = 0` ❌ PROBLEMA: El trigger no funciona

### 1.3 Diagnóstico Basado en Resultados

**Caso A: Hay ventas con garantía PERO no hay garantías en BD**
```
PROBLEMA: El trigger no se ejecutó
SOLUCIÓN: Ejecutar Script de Migración nuevamente
```

**Caso B: No hay ventas con garantía**
```
PROBLEMA: No hay datos de prueba
SOLUCIÓN: Crear una venta desde el frontend con warranty_months > 0 y serial_number
```

---

## ✅ PASO 2: Recrear Garantías si es Necesario

Si descubriste que no hay garantías en la BD pero hay ventas, ejecuta esto en Supabase:

```sql
-- IMPORTANTE: Ejecutar en Supabase SQL Editor

-- Primero, limpiar (opcional, si hay garantías mal creadas):
DELETE FROM warranties WHERE created_at > CURRENT_DATE - INTERVAL '1 day';

-- Luego, crear garantías a partir de las ventas existentes:
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
    s.serial_number,
    'Producto Vendido' as product_name,  -- O extrae de products JSONB
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    s.warranty_months,
    s.sale_date::date as start_date,
    calculate_warranty_expiry(s.warranty_months, s.sale_date::date) as expires_at,
    true as is_active
FROM sales s
WHERE s.warranty_months > 0 
  AND s.serial_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM warranties w WHERE w.sale_id = s.id
  );

-- Verificar que se crearon:
SELECT COUNT(*) as warranties_created FROM warranties;
```

---

## ✅ PASO 3: Verificar Backend

### 3.1 Asegúrate de que el Backend está actualizado

```bash
# En terminal, ve a carpeta Backend
cd Backend

# Verifica que warranty.model.js tiene los cambios
grep "sale_products" src/models/warranty.model.js
# Debe retornar varias líneas

# Verifica que warranty.controller.js tiene el nuevo método
grep "getDiagnostic" src/controllers/warranty.controller.js
# Debe retornar 1 línea
```

### 3.2 Reinicia el Backend

```bash
# En terminal Backend
npm run dev

# Debe ver:
# ✓ Servidor iniciado en puerto 3000
# ✓ Sin errores
```

---

## ✅ PASO 4: Probar Endpoint de Diagnóstico

### 4.1 Obtén tu Token

```bash
# En terminal, ejecuta login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email@example.com","password":"tu_contraseña"}'

# Copia el "token" del resultado
```

### 4.2 Llama al Endpoint de Diagnóstico

```bash
# Reemplaza TOKEN con el token del paso anterior
curl -X GET http://localhost:3000/api/v1/warranties/diagnostic \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-10-24T14:30:00Z",
    "company_id": "uuid-xxx",
    "warranty_system": {
      "total_warranties": 5,
      "warranties": [
        {
          "id": "uuid-xxx",
          "serial_number": "SN-12345",
          "product_name": "Laptop",
          "customer_name": "Juan",
          "warranty_status": "active",
          "days_remaining": 45,
          "sale_products_count": 1,
          "sale_products": [
            {
              "product_id": "uuid-xxx",
              "quantity": 1,
              "unit_price": 999
            }
          ]
        }
      ],
      "sample_warranty": { ... }
    }
  }
}
```

**Si ves:**
- `total_warranties: 0` ❌ Las garantías no se crearon
- `total_warranties > 0` pero `sale_products_count: 0` ❌ Los productos no se deserializan
- `total_warranties > 0` y `sale_products_count > 0` ✅ TODO CORRECTO

---

## ✅ PASO 5: Probar Endpoint Normal de Garantías

### 5.1 Llama al endpoint GET

```bash
# Reemplaza TOKEN
curl -X GET "http://localhost:3000/api/v1/warranties?status=all&page=1&limit=20" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

**Qué buscar:**
- ✅ `warranties: []` no vacío
- ✅ Cada garantía tiene `sale_products`
- ✅ `days_remaining` es un número
- ✅ `warranty_status` es "active", "expired" o "expiring_soon"

### 5.2 Buscar por Status

```bash
# Activas
curl -X GET "http://localhost:3000/api/v1/warranties?status=active" \
  -H "Authorization: Bearer TOKEN"

# Expiradas
curl -X GET "http://localhost:3000/api/v1/warranties?status=expired" \
  -H "Authorization: Bearer TOKEN"

# Por vencer
curl -X GET "http://localhost:3000/api/v1/warranties?status=expiring_soon" \
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ PASO 6: Prueba en Frontend

### 6.1 Abre el navegador

```
http://localhost:5173/garantias
```

### 6.2 Verifica que aparecen las garantías

- [ ] Se muestra la tabla
- [ ] No hay errores en la consola (F12)
- [ ] Aparecen filas con datos
- [ ] Cada fila muestra:
  - Nombre del producto
  - Número de serie
  - Nombre del cliente
  - Estado (Activa/Expirada/Por vencer)
  - Días restantes
  - Número de servicios

### 6.3 Prueba filtros

- [ ] Filtro por status funciona
- [ ] Búsqueda por serie funciona
- [ ] Búsqueda por cliente funciona
- [ ] Paginación funciona

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### PROBLEMA 1: "No se encontraron garantías"

**Causa:** No hay garantías en la BD

**Solución:**
1. Ejecuta Query A de PASO 2 (Crear garantías)
2. Verifica que `warranties_created > 0`
3. Recarga la página

### PROBLEMA 2: "sale_products está vacío"

**Causa:** Los productos JSONB no se deserializan

**Solución:**
1. En Supabase, ejecuta:
```sql
SELECT id, products FROM sales LIMIT 1;
```
2. Verifica la estructura del JSONB
3. En `warranty.model.js`, la deserialización debe hacer:
```javascript
const saleProducts = warranty.sales?.products 
    ? (Array.isArray(warranty.sales.products) 
        ? warranty.sales.products 
        : JSON.parse(warranty.sales.products || '[]'))
    : [];
```

### PROBLEMA 3: "days_remaining es NaN o negativo"

**Causa:** Error en cálculo de fechas

**Solución:**
1. Verifica que `expires_at` es tipo DATE (YYYY-MM-DD)
2. Verifica el código en `warranty.model.js`:
```javascript
const todayDate = new Date().toISOString().split('T')[0];
const expiresAtDate = warranty.expires_at;
const expiresAt = new Date(expiresAtDate + 'T00:00:00Z');
const today = new Date(todayDate + 'T00:00:00Z');
const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));
```

### PROBLEMA 4: "Endpoint retorna error 500"

**Causa:** Error en el backend

**Solución:**
1. Ve a la terminal donde corre Backend
2. Busca el mensaje de error
3. Si es de BD, ejecuta en Supabase:
```sql
SELECT * FROM warranties LIMIT 1;
SELECT * FROM active_warranties_view LIMIT 1;
```
4. Si las vistas no existen, ejecuta `run-warranty-migration.sql`

### PROBLEMA 5: "Frontend blanco sin datos"

**Causa:** Posible error de CORS o token inválido

**Solución:**
1. Abre DevTools (F12)
2. Ve a pestaña Console
3. Busca errores rojos
4. Si dice "401 Unauthorized" → Token expirado, vuelve a login
5. Si dice "403 Forbidden" → Permisos incorrectos
6. Si dice "Network error" → Backend no corre

---

## 📋 CHECKLIST FINAL

Marca cada paso cuando lo completes:

- [ ] Ejecuté Query A en Supabase (hay ventas con garantía)
- [ ] Ejecuté Query C en Supabase (hay garantías creadas)
- [ ] Si no había garantías, las creé con el script de PASO 2
- [ ] Backend está actualizado (grep de sale_products retorna)
- [ ] Backend está corriendo (`npm run dev` sin errores)
- [ ] Llamé a endpoint /diagnostic y retorna datos
- [ ] warranty_count > 0 en endpoint /diagnostic
- [ ] sale_products no está vacío en endpoint /diagnostic
- [ ] Frontend carga /garantias sin errores
- [ ] Frontend muestra tabla con garantías
- [ ] Filtros funcionan
- [ ] Console del frontend sin errores rojos

---

## 🎉 Si Todo Funciona

Una vez que todo esté funcionando:

1. **Documenta:**
   - Crea una venta con warranty_months > 0
   - Verifica que la garantía aparece en /garantias
   - Screenshot para documentación

2. **Commit:**
   ```bash
   git add .
   git commit -m "fix: correción completa sistema de garantías
   
   - Ajustes en comparación de fechas (DATE vs TIMESTAMP)
   - Deserialización correcta de sale_products
   - Cálculo correcto de days_remaining
   - Actualización de init.sql con cambios finales
   - Agregado endpoint de diagnóstico
   - Testing completo"
   git push
   ```

3. **Notifica:**
   - Garantías cargadas correctamente ✅
   - Sistema de warranties operacional ✅

---

**Versión:** v1.3.0
**Fecha:** 24 Octubre 2025
**Status:** Documentación Completa
