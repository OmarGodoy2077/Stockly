# 🚀 Guía de Despliegue - Sistema de Invoices v1.3.0

**Última Actualización:** 21 de Octubre, 2025

---

## ✅ Checklist Pre-Despliegue

### Backend API
- [ ] Todos los archivos creados (3 nuevos)
- [ ] Todos los archivos actualizados (6 modificados)
- [ ] Dependencies instaladas (jsPDF, jspdf-autotable ya incluidas)
- [ ] Variables de entorno configuradas
- [ ] Cloudinary API credentials disponibles

### Base de Datos
- [ ] Si es BD NUEVA: Ejecutar `init.sql` completo
- [ ] Si es BD EXISTENTE: Ejecutar migración `add-invoices-system.sql`
- [ ] Verificar tablas creadas
- [ ] Verificar triggers y funciones

---

## 📋 Pasos de Despliegue

### Paso 1: Verificar Estructura de Archivos

Asegúrate que los siguientes archivos existan:

```
Backend/
├── src/
│   ├── models/
│   │   └── invoice.model.js ✅ NUEVO
│   ├── controllers/
│   │   └── invoice.controller.js ✅ NUEVO
│   ├── routes/
│   │   └── invoice.routes.js ✅ NUEVO
│   └── server.js ✅ ACTUALIZADO
├── database/
│   ├── init.sql ✅ ACTUALIZADO
│   └── migrations/
│       └── add-invoices-system.sql ✅ NUEVO
├── docs/
│   ├── ARCHITECTURE.md ✅ ACTUALIZADO
│   ├── API_REFERENCE.md ✅ ACTUALIZADO
│   └── IMPLEMENTATION_SUMMARY_v1.3.0.md ✅ NUEVO
└── package.json (sin cambios)
```

### Paso 2: Actualizar Base de Datos

#### OPCIÓN A: Nueva Instalación (init.sql)
1. Ve a Supabase → SQL Editor
2. Crea una nueva query
3. Copia TODO el contenido de `Backend/database/init.sql`
4. Ejecuta
5. Verifica que se crean ~17 tablas (incluidas invoices)

#### OPCIÓN B: BD Existente (migración)
1. Ve a Supabase → SQL Editor
2. Crea una nueva query
3. Copia TODO el contenido de `Backend/migrations/add-invoices-system.sql`
4. Ejecuta
5. Verifica que se crean las 2 nuevas tablas:
   - `invoices`
   - `invoice_line_items`

### Paso 3: Verificar Base de Datos

Ejecuta en SQL Editor de Supabase:

```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_line_items');

-- Debe retornar 2 filas
```

```sql
-- Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('invoices', 'invoice_line_items');

-- Debe retornar ~12 índices
```

```sql
-- Verificar función de generación de números
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'generate_invoice_number';

-- Debe retornar 1 fila
```

### Paso 4: Verificar Variables de Entorno

Tu archivo `.env` debe tener (ya debe existir):

```env
# Estos deberían estar ya configurados
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Paso 5: Reiniciar Backend

```bash
cd Backend

# Detener servidor si está corriendo (Ctrl + C)

# Reiniciar
npm run dev      # Desarrollo
npm start        # Producción
```

### Paso 6: Verificar Endpoints

```bash
# Test 1: Health check (no requiere auth)
curl http://localhost:3001/api/v1/health

# Test 2: Crear invoice (requiere token JWT)
# Primero crea una venta, luego:
curl -X POST http://localhost:3001/api/v1/invoices \
  -H "Authorization: Bearer {tu-token-jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": "uuid-de-tu-venta",
    "payment_method": "transfer",
    "company_data": {
      "name": "Mi Tienda"
    }
  }'

# Test 3: Listar invoices
curl http://localhost:3001/api/v1/invoices \
  -H "Authorization: Bearer {tu-token-jwt}"

# Deberías obtener:
# { "success": true, "data": { "items": [], "pagination": {...} } }
```

---

## 🔍 Troubleshooting

### ❌ Error: "Tabla invoices no encontrada"
**Causa:** Migración no se ejecutó
**Solución:**
1. Ve a Supabase SQL Editor
2. Copia y ejecuta `migrations/add-invoices-system.sql`
3. Reinicia servidor

### ❌ Error: "generate_invoice_number no existe"
**Causa:** Función SQL no se creó
**Solución:**
1. Ejecuta nuevamente la migración completa
2. Verifica en SQL Editor: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'generate_invoice_number'`

### ❌ Error: "Cannot find module './routes/invoice.routes.js'"
**Causa:** Archivo de rutas no existe
**Solución:**
1. Verifica que `src/routes/invoice.routes.js` existe
2. Verifica que la importación en `server.js` es correcta:
   ```javascript
   import invoiceRoutes from './routes/invoice.routes.js';
   ```

### ❌ Error: "Cloudinary SDK not initialized"
**Causa:** Credenciales de Cloudinary faltando
**Solución:**
1. Verifica `.env`:
   - `CLOUDINARY_CLOUD_NAME` ✅
   - `CLOUDINARY_API_KEY` ✅
   - `CLOUDINARY_API_SECRET` ✅
2. Reinicia servidor

### ❌ Error: "PDF generation failed"
**Causa:** Alguno de los datos está vacío o inválido
**Solución:**
1. Verifica que la venta tiene todos los datos
2. Verifica que `company_data` está completo en el request
3. Revisa logs del servidor

---

## 📊 Post-Despliegue: Testing Manual

### Test 1: Flujo Completo de Invoice

```bash
# 1. Crear venta
curl -X POST http://localhost:3001/api/v1/sales \
  -H "Authorization: Bearer {token}" \
  -d '{...}'

# 2. Crear invoice desde esa venta
curl -X POST http://localhost:3001/api/v1/invoices \
  -H "Authorization: Bearer {token}" \
  -d '{...}'

# 3. Agregar item adicional (envío)
curl -X POST http://localhost:3001/api/v1/invoices/{id}/line-items \
  -H "Authorization: Bearer {token}" \
  -d '{...}'

# 4. Generar PDF
curl -X POST http://localhost:3001/api/v1/invoices/{id}/generate-pdf \
  -H "Authorization: Bearer {token}"

# 5. Finalizar
curl -X PATCH http://localhost:3001/api/v1/invoices/{id}/finalize \
  -H "Authorization: Bearer {token}"

# 6. Listar invoices
curl http://localhost:3001/api/v1/invoices \
  -H "Authorization: Bearer {token}"
```

### Test 2: Validaciones

```bash
# Intentar crear invoice sin sale_id (debe fallar)
curl -X POST http://localhost:3001/api/v1/invoices \
  -H "Authorization: Bearer {token}" \
  -d '{"payment_method": "cash"}'

# Respuesta esperada: 400 error

# Intentar editar invoice finalizado (debe fallar)
curl -X PUT http://localhost:3001/api/v1/invoices/{id} \
  -H "Authorization: Bearer {token}" \
  -d '{"notes": "nuevo"}'

# Respuesta esperada: 400 error si ya está finalizado
```

### Test 3: Estadísticas

```bash
curl http://localhost:3001/api/v1/invoices/statistics \
  -H "Authorization: Bearer {token}"

# Respuesta esperada:
# {
#   "success": true,
#   "data": {
#     "total_invoices": 1,
#     "draft_count": 0,
#     "paid_count": 0,
#     "pending_count": 1,
#     "total_revenue": 2500.00,
#     "avg_invoice_amount": 2500.00
#   }
# }
```

---

## 🎯 Checkpoints de Verificación

Después del despliegue, verifica:

✅ **Base de Datos**
- [ ] Tablas `invoices` e `invoice_line_items` existen
- [ ] Función `generate_invoice_number()` existe
- [ ] Triggers se disparan automáticamente
- [ ] Índices creados

✅ **API**
- [ ] Endpoint POST /invoices funciona
- [ ] Endpoint GET /invoices funciona
- [ ] Endpoint POST /invoices/{id}/generate-pdf funciona
- [ ] Endpoint PATCH /invoices/{id}/finalize funciona

✅ **Funcionalidad**
- [ ] Se crea invoice correctamente
- [ ] Se agregan items adicionales
- [ ] PDF se genera sin errores
- [ ] PDF se almacena en Cloudinary
- [ ] Numeración es secuencial (INV-2025-00001, etc)

✅ **Seguridad**
- [ ] Requiere autenticación JWT
- [ ] Aislamiento por empresa
- [ ] Solo owner/admin puede crear
- [ ] No se puede editar invoice finalizado

---

## 🔄 Rollback (Si es necesario)

Si algo sale mal y necesitas deshacer:

### Opción 1: Rollback de BD (si usaste migración)

```sql
-- Ejecutar en SQL Editor
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number;
DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS trigger_calculate_invoice_line_total ON invoice_line_items;
DROP FUNCTION IF EXISTS calculate_invoice_line_total;
```

### Opción 2: Rollback de código

1. Revert archivos creados:
   - Eliminar `src/models/invoice.model.js`
   - Eliminar `src/controllers/invoice.controller.js`
   - Eliminar `src/routes/invoice.routes.js`

2. Revert cambios en `src/server.js`:
   - Eliminar: `import invoiceRoutes from './routes/invoice.routes.js'`
   - Eliminar: `this.app.use('/api/v1/invoices', invoiceRoutes)`

3. Revert cambios en `src/services/cloudinaryStorage.service.js`:
   - Eliminar método `uploadInvoicePdf()`

4. Reiniciar servidor

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs del servidor:**
   ```bash
   npm run dev    # Verás los logs en consola
   ```

2. **Verifica Supabase:**
   - Logs: Project → Logs
   - SQL: Project → SQL Editor para testing

3. **Verifica Cloudinary:**
   - Verifica que la carpeta `stockly/invoices` se crea
   - Verifica PDFs se suben correctamente

4. **Documentación:**
   - [API_REFERENCE.md](API_REFERENCE.md) - Endpoints
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Diseño
   - [IMPLEMENTATION_SUMMARY_v1.3.0.md](IMPLEMENTATION_SUMMARY_v1.3.0.md) - Cambios

---

**Estado:** ✅ Listo para despliegue  
**Versión:** 1.3.0  
**Fecha:** 21 de Octubre, 2025
