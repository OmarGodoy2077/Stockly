# Guía de Testing - Fixes Aplicados

## 1️⃣ Problema 1: Error 400 en PDF de Recibos

### Paso 1: Crear una venta de prueba

```bash
# Via cURL o Postman
POST /api/v1/sales
Content-Type: application/json

{
  "customer_name": "Cliente Test PDF",
  "customer_email": "test@example.com",
  "customer_phone": "1234567890",
  "customer_address": "Dirección Test",
  "products": [
    {
      "product_id": "uuid-del-producto-1",
      "quantity": 2,
      "unit_price": 50.00,
      "discount": 0
    }
  ],
  "payment_method": "cash",
  "warranty_months": 12,
  "notes": "Venta de prueba"
}
```

### Paso 2: Generar PDF del recibo

```bash
# Via cURL
curl -X GET "http://localhost:3001/api/v1/sales/{sale_id}/receipt-pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o receipt.pdf

# En el navegador
http://localhost:3001/api/v1/sales/{sale_id}/receipt-pdf
```

### ✅ Resultado Esperado
- Status: **200 OK**
- Content-Type: `application/pdf`
- Se descarga un archivo PDF con el recibo

### ❌ Si falla:
- Status: **400 Bad Request**
- Verificar logs: `docker logs backend` o archivo de logs
- Buscar mensajes como "Sale has no products" o "Invalid product data"

---

## 2️⃣ Problema 2: Dashboard No Muestra Ventas de Hoy

### Paso 1: Crear una venta HOY

```bash
POST /api/v1/sales
{
  "customer_name": "Dashboard Test",
  "products": [
    {
      "product_id": "uuid-del-producto",
      "quantity": 1,
      "unit_price": 100.00,
      "discount": 0
    }
  ],
  "payment_method": "credit_card"
}
```

Nota: La venta se creará con la fecha de hoy en Guatemala (America/Guatemala)

### Paso 2: Verificar Dashboard

```bash
# Via cURL
curl -X GET "http://localhost:3001/api/v1/reports/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Respuesta esperada:
{
  "sales": {
    "today": 100.00,        # ← Debe mostrar 100.00
    "week": 200.00,
    "month": 300.00,
    "revenue": {
      "today": 100.00,
      "week": 200.00,
      "month": 300.00
    }
  },
  "products": {...},
  "warranties": {...},
  "services": {...}
}
```

### ✅ Resultado Esperado
- `sales.today` > 0 (debería mostrar la venta que acabas de crear)
- `sales.revenue.today` > 0

### ❌ Si falta:
- Verificar que la venta se creó con fecha de hoy
- Revisar logs: "salesToday query result"
- Confirmar que `sale_date` en BD está correctamente guardado

---

## 3️⃣ Problema 3: Número de Serie

### Opción A: Serial Number Manual (MÁS FÁCIL PARA TESTING)

```bash
POST /api/v1/sales
{
  "customer_name": "Serial Test Manual",
  "serial_number": "SN-ABC-123456",
  "products": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "unit_price": 50.00
    }
  ],
  "payment_method": "cash"
}
```

### Paso 2: Verificar que se guardó

```bash
GET /api/v1/sales/{sale_id}

# Respuesta esperada:
{
  "id": "sale-uuid",
  "customer_name": "Serial Test Manual",
  "serial_number": "SNABC123456",  # ← Limpiado de espacios/guiones
  "products": [...],
  "created_at": "2025-10-23T..."
}
```

### ✅ Resultado Esperado
- `serial_number` en la respuesta contiene el número ingresado

---

### Opción B: Serial Number con OCR (MÁS COMPLEJO)

#### Paso 1: Preparar imagen

1. Tomar foto de etiqueta con serial number
2. O usar imagen de prueba con texto legible
3. Convertir a base64

#### Paso 2: Enviar con OCR

```bash
POST /api/v1/sales
{
  "customer_name": "Serial Test OCR",
  "serial_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "serial_number": "SN-FALLBACK-123",  # Opcional, por si OCR falla
  "products": [...],
  "payment_method": "cash"
}
```

#### Paso 3: Revisar Logs

```bash
# Ver intentos de OCR
docker logs backend | grep "ocr_attempt"

# Debería mostrar algo como:
{
  "saleCustomer": "Serial Test OCR",
  "ocrSuccess": true,
  "confidence": 0.85,
  "serialNumber": "ABC123456",
  "candidates": 2
}
```

### ✅ Resultado Esperado (OCR exitoso)
- `ocrSuccess: true`
- `confidence >= 0.5`
- Serial number extraído correctamente

### 🔄 Resultado Alternativo (OCR falla, usa fallback)
- `ocrSuccess: false`
- Se usa `serial_number` del payload como fallback
- O queda `null` si no se proporciona fallback

---

## 📊 Validación Completa

### Script de Testing Completo

```javascript
// test-fixes.js - Node.js test script
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const TOKEN = 'your-auth-token';

const headers = { 
  Authorization: `Bearer ${TOKEN}`
};

async function testFixes() {
  try {
    console.log('🧪 Testing Fixes...\n');

    // Test 1: Serial Number Manual
    console.log('1️⃣  Testing Serial Number Manual...');
    const saleRes = await axios.post(`${BASE_URL}/sales`, {
      customer_name: 'Test Serial ' + new Date().getTime(),
      serial_number: 'TST-' + Math.random().toString(36).substring(7).toUpperCase(),
      products: [
        {
          product_id: 'your-product-uuid',
          quantity: 1,
          unit_price: 99.99,
          discount: 0
        }
      ],
      payment_method: 'cash'
    }, { headers });

    const saleId = saleRes.data.data.id;
    console.log('✅ Sale created:', saleId);
    console.log('   Serial number:', saleRes.data.data.serial_number);

    // Test 2: PDF Receipt
    console.log('\n2️⃣  Testing PDF Receipt...');
    try {
      const pdfRes = await axios.get(
        `${BASE_URL}/sales/${saleId}/receipt-pdf`,
        { 
          headers,
          responseType: 'blob'
        }
      );
      console.log('✅ PDF generated, size:', pdfRes.data.size, 'bytes');
    } catch (err) {
      console.log('❌ PDF generation failed:', err.response?.status);
    }

    // Test 3: Dashboard
    console.log('\n3️⃣  Testing Dashboard...');
    const dashRes = await axios.get(
      `${BASE_URL}/reports/dashboard`,
      { headers }
    );
    const { sales } = dashRes.data.data;
    console.log('✅ Dashboard loaded');
    console.log('   Sales today: Q' + sales.revenue.today.toFixed(2));
    console.log('   Sales week: Q' + sales.revenue.week.toFixed(2));
    console.log('   Sales month: Q' + sales.revenue.month.toFixed(2));

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testFixes();
```

### Ejecutar script de testing

```bash
# Instalar dependencias
npm install axios

# Ejecutar
node test-fixes.js
```

---

## 🔍 Debugging

### Ver logs del backend

```bash
# Docker
docker logs -f backend

# O buscar archivo de logs
tail -f backend/logs/app.log

# Filtrar por eventos específicos
docker logs backend | grep "ocr_attempt"
docker logs backend | grep "receipt_generated"
docker logs backend | grep "serial_extraction"
```

### Verificar en BD (Supabase)

```sql
-- Ver ventas de hoy
SELECT 
  id,
  customer_name,
  serial_number,
  sale_date,
  total_amount,
  created_at
FROM sales
WHERE company_id = 'your-company-id'
  AND sale_date = CURRENT_DATE AT TIME ZONE 'America/Guatemala'
ORDER BY created_at DESC;

-- Ver productos en venta
SELECT 
  s.id,
  s.customer_name,
  s.serial_number,
  s.products
FROM sales s
WHERE s.id = 'sale-uuid';
```

---

## 📋 Checklist de Validación

- [ ] Serial number manual se guarda correctamente
- [ ] PDF se genera sin errores 400
- [ ] Dashboard muestra ventas de hoy
- [ ] OCR intenta extraer serial number (ver logs)
- [ ] Fallback a serial_number manual funciona si OCR falla
- [ ] Logs registran intentos de OCR con candidatos
- [ ] Recibo PDF contiene todos los productos con nombres
- [ ] Dates en dashboard usan timezone de Guatemala

---

## 🆘 Troubleshooting

### "Sale has no products"
- Verificar que el campo `products` o `items` sea un array no vacío
- Confirmar que cada producto tenga `product_id`, `quantity`, `unit_price`

### Dashboard muestra 0 en "today"
- Crear venta nueva (se guardará con fecha de hoy)
- Verificar que `sale_date` en BD esté en formato DATE (YYYY-MM-DD)
- Confirmar timezone de servidor es correcta: `America/Guatemala`

### Serial number no se extrae del OCR
- Revisar logs: `docker logs backend | grep "ocr_attempt"`
- Ver `candidates` en logs para saber qué patrones detectó
- Probar con `serial_number` manual como fallback
- Mejorar imagen: asegurar que sea legible, bien iluminada

### PDF no se genera
- Verificar que productos tengan `product_name` o que ProductModel retorne datos
- Ver logs: `docker logs backend | grep "generateReceiptPdf"`
- Revisar que sale tenga al menos un producto válido

---

**Última actualización:** 23 de Octubre de 2025
