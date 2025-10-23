# 📡 Referencia de API - Stockly v1.3.0

**Base URL:** `http://localhost:3001/api/v1`  
**Producción:** `https://api.stockly.app/v1`  
**Versión:** 1.3.0 - Oct 22, 2025

---

## 📋 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Empresas](#empresas)
4. [Invitaciones](#invitaciones)
5. [Categorías](#categorías)
6. [Productos](#productos)
7. [Atributos](#atributos)
8. [Compras](#compras)
9. [Ventas](#ventas)
10. [Invoices](#invoices-⭐-nuevo)
11. [Garantías](#garantías)
12. [Servicio Técnico](#servicio-técnico)
13. [Reportes](#reportes)

---

## 🔐 Autenticación

**Header requerido (excepto register, login, validate):**
```
Authorization: Bearer {access_token}
```

### POST `/auth/register`
Registrar usuario y crear empresa O unirse a existente.

**Body - Crear empresa:**
```json
{
  "email": "admin@example.com",
  "password": "Password123!",
  "name": "Admin User",
  "companyName": "Mi Tienda",
  "companyEmail": "contacto@mitienda.com"
}
```

**Body - Unirse con código:**
```json
{
  "email": "vendedor@example.com",
  "password": "Password123!",
  "name": "Vendedor",
  "invitationCode": "ABC12345"
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "company_id": "uuid"
  }
}
```

### POST `/auth/login`
Iniciar sesión.

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user_id": "uuid",
    "company_id": "uuid"
  }
}
```

### POST `/auth/refresh`
Renovar access token usando refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "expiresIn": "15m"
  }
}
```

### POST `/auth/logout`
Cerrar sesión e invalidar refresh token.

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/auth/me`
Obtener información del usuario autenticado.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "phone": "+51999888777",
    "created_at": "2025-10-22T10:00:00Z"
  }
}
```

### POST `/auth/change-password`
Cambiar contraseña.

**Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 👤 Usuarios

### GET `/users/profile`
Obtener perfil del usuario autenticado.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "phone": "+51999888777",
    "created_at": "2025-10-20T10:00:00Z"
  }
}
```

### PUT `/users/profile`
Actualizar perfil del usuario.

**Body:**
```json
{
  "name": "New Name",
  "phone": "+51999888888"
}
```

### GET `/users/companies`
Listar todas las empresas del usuario.

**Respuesta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mi Tienda",
      "ruc": "20123456789",
      "role": "owner",
      "address": "Av. Principal 123",
      "created_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

### POST `/users/switch-company/:companyId`
Cambiar empresa activa del usuario.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "company_name": "Mi Tienda",
    "role": "owner"
  }
}
```

---

## 🏢 Empresas

### POST `/companies`
Crear nueva empresa (solo owner).

**Body:**
```json
{
  "name": "Nueva Empresa",
  "ruc": "20123456789",
  "address": "Av. Nueva 456",
  "email": "info@nuevaempresa.com"
}
```

### GET `/companies/:companyId`
Obtener detalles de empresa.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mi Tienda",
    "ruc": "20123456789",
    "address": "Av. Principal 123",
    "email": "contacto@mitienda.com",
    "phone": "+51999888777",
    "created_at": "2025-10-20T10:00:00Z"
  }
}
```

### PUT `/companies/:companyId`
Actualizar empresa (solo owner).

**Body:**
```json
{
  "name": "Mi Tienda Actualizada",
  "address": "Av. Nueva 789",
  "phone": "+51999888999"
}
```

### GET `/companies/:companyId/members`
Listar miembros de la empresa.

**Respuesta 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin",
      "joined_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

### PATCH `/companies/:companyId/members/:userId/role`
Cambiar rol de miembro (solo owner).

**Body:**
```json
{
  "role": "admin"
}
```

**Roles disponibles:** `owner`, `admin`, `seller`, `inventory`

### DELETE `/companies/:companyId/members/:userId`
Remover miembro de empresa (solo owner).

---

## 🎫 Invitaciones

### POST `/invitations`
Crear código de invitación (solo owner).

**Body:**
```json
{
  "companyId": "uuid",
  "role": "seller"
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "code": "ABC12345",
    "role": "seller",
    "expires_at": "2025-10-23T10:00:00Z",
    "created_at": "2025-10-22T10:00:00Z"
  }
}
```

### GET `/invitations`
Listar códigos activos (solo owner).

**Respuesta 200:**
```json
{
  "success": true,
  "data": [
    {
      "code": "ABC12345",
      "role": "seller",
      "created_by": "uuid",
      "expires_at": "2025-10-23T10:00:00Z",
      "used": false
    }
  ]
}
```

### GET `/invitations/validate/:code`
Validar código de invitación (público, sin auth).

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "company_name": "Mi Tienda",
    "role": "seller"
  }
}
```

**Respuesta 404:**
```json
{
  "success": false,
  "error": "Invalid or expired invitation code"
}
```

### DELETE `/invitations/:code`
Desactivar código de invitación (solo owner).

---

## 📂 Categorías

### GET `/categories`
Listar todas las categorías.

**Query params:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `search` (string)
- `parent_id` (uuid, optional)

**Respuesta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electrónica",
      "parent_id": null,
      "description": "Productos electrónicos",
      "created_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

### GET `/categories/tree`
Obtener categorías en estructura jerárquica.

**Respuesta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electrónica",
      "children": [
        {
          "id": "uuid",
          "name": "Laptops",
          "children": []
        }
      ]
    }
  ]
}
```

### POST `/categories`
Crear categoría.

**Body:**
```json
{
  "name": "Electrónica",
  "parent_id": null,
  "description": "Productos electrónicos"
}
```

### PUT `/categories/:id`
Actualizar categoría.

**Body:**
```json
{
  "name": "Electrónica Actualizada",
  "description": "Nueva descripción"
}
```

### DELETE `/categories/:id`
Eliminar categoría.

---

## 📦 Productos

### GET `/products`
Listar productos con filtros.

**Query params:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `category_id` (uuid)
- `condition` (new|used|open_box)
- `search` (buscar nombre/sku)
- `min_price`, `max_price` (decimal)
- `in_stock` (boolean)
- `sort_by` (name|price|stock|created_at)
- `sort_order` (ASC|DESC)

**Ejemplo:**
```
GET /products?page=1&limit=10&condition=new&in_stock=true&sort_by=price
```

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "sku": "PROD-001",
        "name": "Laptop Gaming",
        "price": 1500.00,
        "stock": 5,
        "condition": "new",
        "category_id": "uuid",
        "created_at": "2025-10-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### GET `/products/stock/complete`
Resumen consolidado de stock.

**Query params:**
- `category_id` (uuid, optional)
- `search` (string, optional)
- `min_stock_only` (boolean, default: false)

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_items": 150,
      "total_value": 45000.00,
      "low_stock_count": 5
    },
    "products": [
      {
        "id": "uuid",
        "name": "Laptop Gaming",
        "sku": "PROD-001",
        "quantity": 5,
        "price": 1500.00,
        "total_value": 7500.00,
        "condition": "new"
      }
    ]
  }
}
```

### POST `/products`
Crear producto.

**Body:**
```json
{
  "categoryId": "uuid",
  "name": "Laptop Gaming Pro",
  "description": "Laptop de alta gama",
  "sku": "PROD-001",
  "price": 1500.00,
  "stock": 5,
  "condition": "new",
  "barcode": "7501234567890"
}
```

**Nota:** `price` es opcional (default: 0)

### GET `/products/:id`
Obtener detalles de producto con atributos.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "PROD-001",
    "name": "Laptop Gaming",
    "price": 1500.00,
    "stock": 5,
    "condition": "new",
    "category": { "id": "uuid", "name": "Electrónica" },
    "attributes": [
      { "id": "uuid", "name": "RAM", "value": "16GB" },
      { "id": "uuid", "name": "SSD", "value": "512GB" }
    ],
    "created_at": "2025-10-20T10:00:00Z"
  }
}
```

### PUT `/products/:id`
Actualizar producto.

**Body:**
```json
{
  "name": "Laptop Gaming Pro",
  "price": 1600.00,
  "stock": 4,
  "condition": "open_box"
}
```

### DELETE `/products/:id`
Eliminar producto (soft delete).

### PATCH `/products/:id/stock`
Actualizar stock manualmente.

**Body:**
```json
{
  "stock": 10,
  "reason": "Ajuste de inventario"
}
```

---

## 🏷️ Atributos

### POST `/products/:id/attributes`
Agregar atributo a producto.

**Body:**
```json
{
  "attribute_name": "RAM",
  "attribute_value": "16GB"
}
```

### GET `/products/:id/attributes`
Obtener atributos de producto.

### POST `/products/:id/attributes/bulk`
Crear múltiples atributos.

**Body:**
```json
{
  "attributes": [
    { "name": "RAM", "value": "16GB" },
    { "name": "SSD", "value": "512GB" }
  ]
}
```

### PUT `/products/:id/attributes/:attrId`
Actualizar atributo.

**Body:**
```json
{
  "attribute_value": "32GB"
}
```

### DELETE `/products/:id/attributes/:attrId`
Eliminar atributo.

---

## 🛒 Compras

### POST `/purchases`
Crear compra con tracking automático de profit.

**Body:**
```json
{
  "supplier": "Supplier Name",
  "products": [
    {
      "product_id": "uuid",
      "quantity": 10,
      "cost_per_unit": 50.00,
      "sell_price_per_unit": 80.00
    }
  ]
}
```

**Cálculos automáticos:**
- `cost_amount` = sum(cost_per_unit × quantity)
- `sell_amount` = sum(sell_price_per_unit × quantity)
- `profit_amount` = sell_amount - cost_amount
- `profit_margin_percent` = (profit_amount / sell_amount) × 100

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "supplier": "Supplier Name",
    "cost_amount": 500.00,
    "sell_amount": 800.00,
    "profit_amount": 300.00,
    "profit_margin_percent": 37.5,
    "created_at": "2025-10-22T10:00:00Z"
  }
}
```

### GET `/purchases`
Listar compras con filtros y paginación.

**Query params:**
- `page` (int)
- `limit` (int)
- `search` (supplier name)
- `sort_by` (profit_amount|date)

### GET `/purchases/:id`
Obtener detalles de compra.

### PUT `/purchases/:id`
Actualizar compra.

### DELETE `/purchases/:id`
Eliminar compra.

### GET `/purchases/statistics`
Estadísticas de compras.

---

## 🛍️ Ventas

### POST `/sales`
Crear venta con OCR opcional para número de serie.

**Body:**
```json
{
  "customer_name": "Cliente Premium",
  "customer_email": "cliente@example.com",
  "customer_phone": "+51999888777",
  "products": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "price": 1500.00
    }
  ],
  "total": 1500.00,
  "payment_method": "cash",
  "warranty_months": 12,
  "serial_image": "iVBORw0KGgo..." // Base64, opcional
}
```

**Características:**
- OCR extrae número de serie de la imagen automáticamente
- Crea garantía automáticamente
- Si OCR falla, continúa sin serie

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customer_name": "Cliente Premium",
    "total": 1500.00,
    "serial_number": "SN-ABC-123456", // De OCR o manual
    "serial_image_url": "https://cloudinary.com/...",
    "warranty_id": "uuid",
    "created_at": "2025-10-22T10:00:00Z"
  }
}
```

### GET `/sales`
Listar ventas.

**Query params:**
- `page`, `limit`, `search`, `customer_email`, `date_from`, `date_to`

### GET `/sales/:id`
Obtener detalles de venta.

### PUT `/sales/:id`
Actualizar venta.

### DELETE `/sales/:id`
Eliminar venta.

### GET `/sales/statistics`
Estadísticas de ventas.

---

## 📋 Invoices ⭐ NUEVO

### POST `/invoices`
Crear invoice desde una venta.

**Body:**
```json
{
  "sale_id": "uuid",
  "payment_method": "cash",
  "company_data": {
    "name": "Mi Tienda",
    "address": "Av. Principal 123",
    "phone": "+51999888777",
    "email": "contacto@mitienda.com",
    "rtc": "20123456789",
    "logo_url": "https://..."
  }
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2025-00001",
    "sale_id": "uuid",
    "customer_name": "Cliente Premium",
    "subtotal": 1500.00,
    "tax_amount": 180.00,
    "total_amount": 1680.00,
    "payment_status": "pending",
    "is_draft": true,
    "created_at": "2025-10-22T10:00:00Z"
  }
}
```

### GET `/invoices`
Listar invoices.

**Query params:**
- `page`, `limit`, `search`, `payment_status` (pending|paid|cancelled), `date_from`, `date_to`

### GET `/invoices/:id`
Obtener detalles de invoice.

### POST `/invoices/:id/line-items`
Agregar item adicional (envío, comisión, descuento).

**Body:**
```json
{
  "item_type": "shipping",
  "item_name": "Envío Express",
  "quantity": 1,
  "unit_price": 50.00,
  "is_taxable": false
}
```

**item_type:** `product`, `shipping`, `commission`, `discount`, `other`

### DELETE `/invoices/:id/line-items/:itemId`
Eliminar item de invoice.

### POST `/invoices/:id/generate-pdf`
Generar PDF profesional.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "pdf_url": "https://cloudinary.com/.../invoice-INV-2025-00001.pdf",
    "generated_at": "2025-10-22T10:00:00Z"
  }
}
```

### GET `/invoices/:id/download-pdf`
Descargar PDF del invoice.

### PATCH `/invoices/:id/finalize`
Finalizar invoice (no editable después).

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "is_draft": false,
    "payment_status": "pending",
    "finalized_at": "2025-10-22T10:00:00Z"
  }
}
```

### PUT `/invoices/:id`
Actualizar invoice (solo si es draft).

**Body:**
```json
{
  "payment_method": "transfer",
  "notes": "Envío lunes"
}
```

### GET `/invoices/statistics`
Estadísticas de invoices.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "total_invoices": 45,
    "draft_count": 3,
    "pending_count": 25,
    "paid_count": 17,
    "total_revenue": 85000.00,
    "avg_invoice_amount": 1888.89
  }
}
```

---

## 🛡️ Garantías

### GET `/warranties`
Listar garantías.

### GET `/warranties/:id`
Obtener detalles de garantía.

### GET `/warranties/expiring`
Garantías próximas a expirar.

---

## 🔧 Servicio Técnico

### POST `/services`
Crear registro de servicio técnico.

**Body:**
```json
{
  "warranty_id": "uuid",
  "serial_number": "SN-ABC-123456",
  "reason": "Pantalla rota",
  "photos": ["base64..."],
  "observations": "Daño físico"
}
```

### GET `/services`
Listar servicios técnicos.

### GET `/services/:id`
Obtener detalles de servicio.

### PATCH `/services/:id/status`
Actualizar estado de servicio.

**Body:**
```json
{
  "status": "in_repair"
}
```

**Estados:** `received`, `in_repair`, `delivered`

---

## 📊 Reportes

### GET `/reports/cost-vs-revenue`
Resumen ejecutivo: costo vs facturación.

**Query params:**
- `start_date` (YYYY-MM-DD)
- `end_date` (YYYY-MM-DD)
- `format` (json|excel|pdf) default: json
- `include_monthly_breakdown` (boolean)

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-10-01",
      "end": "2025-10-22",
      "days": 22
    },
    "summary": {
      "total_cost": 15000.00,
      "total_revenue": 25000.00,
      "total_profit": 10000.00,
      "profit_margin": 40.0
    },
    "monthly_breakdown": [
      {
        "month": "2025-10",
        "cost": 15000.00,
        "revenue": 25000.00,
        "profit": 10000.00
      }
    ]
  }
}
```

---

## 🆘 Códigos de Error

| Código | Significado |
|--------|------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validación) |
| 401 | Unauthorized (sin token) |
| 403 | Forbidden (sin permisos) |
| 404 | Not Found |
| 409 | Conflict (duplicado) |
| 500 | Server Error |

---

## 📌 Convenciones

- **Todos los timestamps** en ISO 8601 (UTC)
- **Monetario** en decimales (máx 2 decimales)
- **Paginación default:** page=1, limit=20
- **UUID v4** para todos los IDs
- **Email lowercase** siempre

---

**Última actualización:** 22 Octubre 2025 | v1.3.0

