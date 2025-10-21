# 📡 Referencia de API - Stockly Backend

**Versión:** 1.3.0 (Actualizado Oct 2025)  
**Base URL:** `http://localhost:3001/api/v1`  
**Producción:** `https://tu-dominio.com/api/v1`

---

## 📋 Índice

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Empresas](#empresas)
4. [Invitaciones](#invitaciones)
5. [Productos](#productos)
6. [Atributos de Productos](#atributos-de-productos)
7. [Categorías](#categorías)
8. [Compras](#compras)
9. [Proveedores](#proveedores)
10. [Ventas](#ventas)
11. [Invoices/Recibos](#invoicesrecibos) ⭐ NUEVO v1.3
12. [Garantías](#garantías)
13. [Servicio Técnico](#servicio-técnico)
14. [Reportes](#reportes)
15. [Nuevas Rutas v1.2 (Destacadas)](#-nuevas-rutas-v12---destacadas) 

---

## 🔐 Autenticación

Todos los endpoints (excepto login, register y validate invitation) requieren header:
```
Authorization: Bearer {access_token}
```

### POST `/auth/register`
Registrar nuevo usuario y crear empresa O unirse a empresa existente.

**Body (Crear empresa):**
```json
{
  "email": "admin@example.com",
  "password": "Password123!",
  "name": "Juan Pérez",
  "phone": "+51987654321",
  "companyName": "Mi Tienda",
  "companyAddress": "Av. Principal 123",
  "companyPhone": "+51987654322",
  "companyEmail": "contacto@mitienda.com"
}
```

**Body (Unirse con código):**
```json
{
  "email": "vendedor@example.com",
  "password": "Password123!",
  "name": "María García",
  "invitationCode": "ABC12345"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Juan Pérez"
  },
  "company": {
    "id": "uuid",
    "name": "Mi Tienda",
    "role": "owner"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
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

**Respuesta (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Juan Pérez"
  },
  "company": {
    "id": "uuid",
    "name": "Mi Tienda",
    "role": "owner"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

### POST `/auth/refresh`
Renovar access token.

**Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "accessToken": "nuevo-token",
  "expiresIn": "15m"
}
```

### POST `/auth/logout`
Cerrar sesión (invalida refresh token).

**Headers:** `Authorization: Bearer {token}`

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/auth/me`
Obtener información del usuario autenticado.

**Headers:** `Authorization: Bearer {token}`

**Respuesta (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Juan Pérez",
    "phone": "+51987654321",
    "isActive": true
  },
  "company": {
    "id": "uuid",
    "name": "Mi Tienda",
    "role": "owner"
  }
}
```

### POST `/auth/change-password`
Cambiar contraseña.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

---

## 👤 Usuarios

### GET `/users/profile`
Ver perfil del usuario autenticado.

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Juan Pérez",
    "phone": "+51987654321",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### PUT `/users/profile`
Actualizar perfil.

**Body:**
```json
{
  "name": "Juan Carlos Pérez",
  "phone": "+51999888777"
}
```

### GET `/users/companies`
Listar empresas del usuario.

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "companyId": "uuid-1",
      "companyName": "Mi Tienda",
      "role": "owner",
      "joinedAt": "2025-01-15T10:30:00Z"
    },
    {
      "companyId": "uuid-2",
      "companyName": "Otra Empresa",
      "role": "seller",
      "joinedAt": "2025-02-01T14:20:00Z"
    }
  ]
}
```

### POST `/users/switch-company/:companyId`
Cambiar de empresa activa.

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Company switched successfully",
  "newToken": "eyJhbGc...",
  "company": {
    "id": "uuid",
    "name": "Otra Empresa",
    "role": "seller"
  }
}
```

---

## 🏢 Empresas

### POST `/companies`
Crear nueva empresa.

**Body:**
```json
{
  "name": "Nueva Empresa",
  "ruc": "20123456789",
  "address": "Av. Comercio 456",
  "phone": "+51987654321",
  "email": "info@nuevaempresa.com"
}
```

### GET `/companies/:companyId`
Ver detalles de empresa.

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mi Tienda",
    "ruc": "20123456789",
    "address": "Av. Principal 123",
    "phone": "+51987654321",
    "email": "contacto@mitienda.com",
    "isActive": true,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### PUT `/companies/:companyId`
Actualizar empresa (solo owner).

**Body:**
```json
{
  "name": "Mi Tienda Actualizada",
  "address": "Nueva dirección 789"
}
```

### GET `/companies/:companyId/members`
Listar miembros de la empresa.

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid-1",
      "name": "Juan Pérez",
      "email": "admin@example.com",
      "role": "owner",
      "joinedAt": "2025-01-15T10:30:00Z"
    },
    {
      "userId": "uuid-2",
      "name": "María García",
      "email": "vendedora@example.com",
      "role": "seller",
      "joinedAt": "2025-02-01T14:20:00Z"
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
  "companyId": "uuid-de-empresa",
  "role": "seller"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Invitation code created successfully",
  "data": {
    "code": "ABC12345",
    "role": "seller",
    "expiresAt": "2025-10-21T14:30:00Z",
    "createdAt": "2025-10-20T14:30:00Z"
  }
}
```

### GET `/invitations`
Listar códigos activos de la empresa (solo owner).

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "ABC12345",
      "role": "seller",
      "createdBy": "Juan Pérez",
      "createdAt": "2025-10-20T14:30:00Z",
      "expiresAt": "2025-10-21T14:30:00Z",
      "isActive": true
    }
  ]
}
```

### GET `/invitations/validate/:code`
Validar código de invitación (público, sin auth).

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "companyId": "uuid",
    "companyName": "Mi Tienda",
    "role": "seller",
    "expiresAt": "2025-10-21T14:30:00Z"
  }
}
```

**Respuesta (404) - Código inválido o expirado:**
```json
{
  "success": false,
  "error": "Invalid or expired invitation code"
}
```

### DELETE `/invitations/:code`
Desactivar código de invitación (solo owner).

---

## 📦 Productos

### GET `/products`
Listar productos con filtros y paginación.

**Query params:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `category_id` (uuid)
- `condition` (`new` | `used` | `open_box`)
- `search` (buscar en nombre/sku)
- `min_price` (decimal)
- `max_price` (decimal)
- `in_stock` (boolean)
- `sort_by` (`name` | `price` | `stock` | `created_at`)
- `sort_order` (`ASC` | `DESC`)

**Ejemplo:**
```
GET /products?page=1&limit=10&condition=new&in_stock=true&sort_by=price&sort_order=ASC
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "PROD001",
      "name": "Laptop Gaming",
      "description": "Laptop de alto rendimiento",
      "price": 1500.00,
      "stock": 5,
      "minStock": 2,
      "condition": "new",
      "imageUrl": "https://cloudinary.com/...",
      "category": {
        "id": "uuid",
        "name": "Electrónica"
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### POST `/products`
Crear producto.

**Body:**
```json
{
  "categoryId": "uuid",
  "sku": "PROD001",
  "name": "Laptop Gaming",
  "description": "Laptop de alto rendimiento",
  "price": 1500.00,
  "stock": 5,
  "minStock": 2,
  "condition": "new",
  "barcode": "7501234567890"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "sku": "PROD001",
    "name": "Laptop Gaming",
    "price": 1500.00,
    "stock": 5,
    "condition": "new"
  }
}
```

### GET `/products/:productId`
Ver detalles de producto (incluye atributos).

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "PROD001",
    "name": "Laptop Gaming",
    "description": "Laptop de alto rendimiento",
    "price": 1500.00,
    "stock": 5,
    "minStock": 2,
    "condition": "new",
    "imageUrl": "https://cloudinary.com/...",
    "barcode": "7501234567890",
    "category": {
      "id": "uuid",
      "name": "Electrónica",
      "parentId": null
    },
    "attributes": [
      {
        "id": "uuid",
        "name": "Procesador",
        "value": "Intel i7-12700H",
        "orderIndex": 0
      },
      {
        "id": "uuid",
        "name": "RAM",
        "value": "16GB DDR5",
        "orderIndex": 1
      },
      {
        "id": "uuid",
        "name": "Almacenamiento",
        "value": "512GB SSD NVMe",
        "orderIndex": 2
      }
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T15:45:00Z"
  }
}
```

### PUT `/products/:productId`
Actualizar producto.

**Body:**
```json
{
  "name": "Laptop Gaming Pro",
  "price": 1600.00,
  "condition": "open_box"
}
```

### DELETE `/products/:productId`
Eliminar producto (soft delete).

### PATCH `/products/:productId/stock`
Actualizar stock manualmente.

**Body:**
```json
{
  "stock": 10,
  "reason": "Ajuste de inventario"
}
```

### GET `/products/low-stock`
Productos con stock bajo o agotados.

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "PROD002",
      "name": "Mouse Gamer",
      "stock": 1,
      "minStock": 5,
      "status": "low"
    },
    {
      "id": "uuid",
      "sku": "PROD003",
      "name": "Teclado Mecánico",
      "stock": 0,
      "minStock": 3,
      "status": "out"
    }
  ]
}
```

---

## 🏷️ Atributos de Productos

### POST `/products/:productId/attributes`
Crear atributo individual.

**Body:**
```json
{
  "name": "Procesador",
  "value": "Intel i7-12700H",
  "orderIndex": 0
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Attribute created successfully",
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "name": "Procesador",
    "value": "Intel i7-12700H",
    "orderIndex": 0
  }
}
```

### POST `/products/:productId/attributes/bulk`
Crear múltiples atributos.

**Body:**
```json
{
  "attributes": [
    { "name": "Procesador", "value": "Intel i7-12700H" },
    { "name": "RAM", "value": "16GB DDR5" },
    { "name": "Almacenamiento", "value": "512GB SSD" },
    { "name": "GPU", "value": "NVIDIA RTX 3060" }
  ]
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "4 attributes created successfully",
  "data": [
    {
      "id": "uuid-1",
      "name": "Procesador",
      "value": "Intel i7-12700H",
      "orderIndex": 0
    },
    {
      "id": "uuid-2",
      "name": "RAM",
      "value": "16GB DDR5",
      "orderIndex": 1
    }
    // ...
  ]
}
```

### GET `/products/:productId/attributes`
Listar atributos del producto.

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Procesador",
      "value": "Intel i7-12700H",
      "orderIndex": 0
    }
  ]
}
```

### GET `/products/:productId/attributes/:attributeId`
Ver atributo específico.

### PUT `/products/:productId/attributes/:attributeId`
Actualizar atributo.

**Body:**
```json
{
  "value": "Intel i9-12900H",
  "orderIndex": 0
}
```

### DELETE `/products/:productId/attributes/:attributeId`
Eliminar atributo.

---

## 📁 Categorías

### GET `/categories`
Listar categorías (incluye jerarquía).

**Query params:**
- `include_hierarchy` (boolean) - Incluir subcategorías anidadas

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Electrónica",
      "description": "Categoría principal",
      "parentId": null,
      "productsCount": 45,
      "children": [
        {
          "id": "uuid-2",
          "name": "Componentes PC",
          "parentId": "uuid-1",
          "productsCount": 20,
          "children": [
            {
              "id": "uuid-3",
              "name": "Memorias RAM",
              "parentId": "uuid-2",
              "productsCount": 8,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### POST `/categories`
Crear categoría o subcategoría.

**Body (Categoría principal):**
```json
{
  "name": "Electrónica",
  "description": "Productos electrónicos"
}
```

**Body (Subcategoría):**
```json
{
  "name": "Componentes PC",
  "description": "Componentes de computadora",
  "parentId": "uuid-de-categoria-padre"
}
```

### GET `/categories/:categoryId`
Ver detalles de categoría.

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Memorias RAM",
    "description": "Memorias RAM de diversos tipos",
    "parentId": "uuid-padre",
    "parent": {
      "id": "uuid-padre",
      "name": "Componentes PC"
    },
    "productsCount": 8,
    "lowStockCount": 2,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### PUT `/categories/:categoryId`
Actualizar categoría.

**Body:**
```json
{
  "name": "Memorias RAM DDR4/DDR5",
  "description": "Memorias RAM de última generación",
  "parentId": "otro-uuid-padre"
}
```

### DELETE `/categories/:categoryId`
Eliminar categoría (soft delete).

### GET `/categories/:categoryId/products`
Listar productos de la categoría.

---

## 🛒 Compras

### GET `/purchases`
Listar compras con filtros.

**Query params:**
- `page`, `limit`
- `supplier_id` (uuid)
- `supplier_name` (string)
- `start_date` (YYYY-MM-DD)
- `end_date` (YYYY-MM-DD)
- `sort_by` (`purchase_date` | `total_amount`)
- `sort_order` (`ASC` | `DESC`)

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "supplierName": "Proveedor Tech S.A.",
      "invoiceNumber": "INV-2025-001",
      "totalAmount": 5000.00,
      "purchaseDate": "2025-10-15",
      "products": [
        {
          "productId": "uuid",
          "productName": "Laptop HP",
          "quantity": 3,
          "unitPrice": 1500.00,
          "subtotal": 4500.00
        },
        {
          "productId": "uuid",
          "productName": "Mouse Logitech",
          "quantity": 10,
          "unitPrice": 50.00,
          "subtotal": 500.00
        }
      ],
      "notes": "Compra de inventario mensual",
      "createdBy": "Juan Pérez",
      "createdAt": "2025-10-15T09:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### POST `/purchases`
Registrar nueva compra (actualiza stock automáticamente).

**Body:**
```json
{
  "supplierId": "uuid",
  "supplierName": "Proveedor Alternativo",
  "invoiceNumber": "INV-2025-002",
  "products": [
    {
      "productId": "uuid-1",
      "quantity": 5,
      "unitPrice": 1500.00
    },
    {
      "productId": "uuid-2",
      "quantity": 10,
      "unitPrice": 50.00
    }
  ],
  "purchaseDate": "2025-10-20",
  "notes": "Compra urgente"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Purchase created successfully",
  "data": {
    "id": "uuid",
    "totalAmount": 8000.00,
    "productsCount": 2,
    "stockUpdated": true
  }
}
```

### GET `/purchases/:purchaseId`
Ver detalles de compra.

### PUT `/purchases/:purchaseId`
Actualizar compra.

### DELETE `/purchases/:purchaseId`
Eliminar compra.

### GET `/purchases/statistics`
Estadísticas de compras.

**Query params:**
- `start_date`, `end_date`

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "totalPurchases": 45,
    "totalAmount": 125000.00,
    "averageAmount": 2777.78,
    "topSuppliers": [
      {
        "supplierName": "Proveedor Tech",
        "totalPurchases": 15,
        "totalAmount": 45000.00
      }
    ]
  }
}
```

---

## 🏪 Proveedores

### GET `/suppliers`
Listar proveedores.

### POST `/suppliers`
Crear proveedor.

**Body:**
```json
{
  "name": "Proveedor Tech S.A.",
  "contactName": "Carlos Ramírez",
  "email": "carlos@proveedortech.com",
  "phone": "+51987654321",
  "address": "Av. Industrial 456",
  "ruc": "20567891234"
}
```

### GET `/suppliers/:supplierId`
Ver detalles de proveedor.

### PUT `/suppliers/:supplierId`
Actualizar proveedor.

### DELETE `/suppliers/:supplierId`
Eliminar proveedor.

---

## 💰 Ventas

### GET `/sales`
Listar ventas con filtros.

**Query params:**
- `page`, `limit`
- `start_date`, `end_date`
- `customer_name`
- `serial_number`
- `has_warranty` (boolean)

### POST `/sales`
Registrar venta (reduce stock, crea garantía si aplica).

**Body:**
```json
{
  "products": [
    {
      "productId": "uuid",
      "quantity": 1,
      "unitPrice": 1500.00
    }
  ],
  "customerName": "Cliente Ejemplo",
  "customerEmail": "cliente@example.com",
  "customerPhone": "+51987654321",
  "customerAddress": "Calle 123",
  "serialNumber": "SN123456789",
  "warrantyMonths": 12,
  "paymentMethod": "cash",
  "notes": "Venta con garantía"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "id": "uuid",
    "totalAmount": 1500.00,
    "warrantyId": "uuid",
    "warrantyExpiresAt": "2026-10-20"
  }
}
```

### GET `/sales/:saleId`
Ver detalles de venta.

### GET `/sales/serial/:serialNumber`
Buscar venta por número de serie.

### GET `/sales/customer/:customerName`
Buscar ventas por cliente.

---

## � Invoices/Recibos

⭐ **NUEVO en v1.3.0** - Sistema completo de generación de recibos/facturas con PDF.

Genera recibos profesionales en PDF desde ventas, permite agregar items adicionales (envío, comisiones, etc), y personaliza con datos de la empresa.

### POST `/invoices`
Crear nuevo recibo desde una venta.

**Body:**
```json
{
  "sale_id": "uuid-de-la-venta",
  "additional_items": [
    {
      "item_type": "shipping|commission|discount|other",
      "item_name": "Envío a domicilio",
      "item_description": "Descripción opcional",
      "quantity": 1,
      "unit_price": 50.00,
      "is_taxable": false
    },
    {
      "item_type": "commission",
      "item_name": "Comisión COD Entrega",
      "quantity": 1,
      "unit_price": 25.00,
      "is_taxable": false
    }
  ],
  "payment_method": "cash|transfer|card|cod",
  "payment_status": "pending|paid|partial",
  "terms_conditions": "Gracias por su compra...",
  "notes": "Notas adicionales",
  "company_data": {
    "name": "Mi Empresa",
    "address": "Calle Principal 123",
    "phone": "+502 1234 5678",
    "email": "contacto@miempresa.com",
    "rtc": "RTC123456",
    "logo_url": "https://..."
  }
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2025-00001",
    "invoice_date": "2025-10-21",
    "customer_name": "Cliente Premium",
    "total_amount": 2500.00,
    "is_draft": true,
    "payment_status": "pending"
  }
}
```

### GET `/invoices`
Listar recibos con filtros.

**Query params:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD
- `invoice_number`: string (search)
- `payment_status`: pending|paid|partial
- `is_draft`: true|false
- `sort_by`: invoice_date|total_amount|created_at
- `sort_order`: ASC|DESC

### GET `/invoices/:id`
Obtener recibo con detalles y líneas.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2025-00001",
    "invoice_date": "2025-10-21",
    "customer_name": "Cliente Premium",
    "customer_email": "cliente@example.com",
    "customer_address": "Calle 123",
    "company_name": "Mi Empresa",
    "company_address": "Calle Principal 123",
    "subtotal": 2500.00,
    "tax_amount": 300.00,
    "additional_items_total": 75.00,
    "discount_amount": 0,
    "total_amount": 2875.00,
    "payment_method": "transfer",
    "is_draft": true,
    "pdf_url": "https://...",
    "line_items": [
      {
        "id": "uuid",
        "item_type": "product",
        "item_name": "Televisor LED 42\"",
        "quantity": 1,
        "unit_price": 2500.00,
        "line_total": 2500.00,
        "is_taxable": true
      },
      {
        "id": "uuid",
        "item_type": "shipping",
        "item_name": "Envío a domicilio",
        "quantity": 1,
        "unit_price": 50.00,
        "line_total": 50.00,
        "is_taxable": false
      },
      {
        "id": "uuid",
        "item_type": "commission",
        "item_name": "Comisión COD Entrega",
        "quantity": 1,
        "unit_price": 25.00,
        "line_total": 25.00,
        "is_taxable": false
      }
    ]
  }
}
```

### POST `/invoices/:id/line-items`
Agregar item adicional a recibo (solo si está en borrador).

**Body:**
```json
{
  "item_type": "shipping|commission|discount|other",
  "item_name": "Embalaje especial",
  "item_description": "Embalaje con protección",
  "quantity": 1,
  "unit_price": 15.00,
  "is_taxable": false
}
```

### DELETE `/invoices/:id/line-items/:itemId`
Eliminar item del recibo (solo si está en borrador).

### POST `/invoices/:id/generate-pdf`
Generar PDF del recibo y almacenar en Cloudinary.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "invoice_id": "uuid",
    "invoice_number": "INV-2025-00001",
    "pdf_url": "https://res.cloudinary.com/...",
    "message": "PDF generated and stored successfully"
  }
}
```

### GET `/invoices/:id/download-pdf`
Descargar PDF del recibo. Redirige a la URL de Cloudinary.

### PATCH `/invoices/:id/finalize`
Finalizar recibo (marcar como no borrador). Una vez finalizado, no puede ser editado.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2025-00001",
    "is_draft": false,
    "finalized_at": "2025-10-21T15:30:00Z"
  }
}
```

### PUT `/invoices/:id`
Actualizar recibo (solo si está en borrador).

**Body (todos opcionales):**
```json
{
  "payment_method": "cash|transfer|card|cod",
  "payment_status": "pending|paid|partial",
  "terms_conditions": "Nuevo texto",
  "notes": "Nuevas notas"
}
```

### GET `/invoices/statistics`
Estadísticas de recibos.

**Query params:**
- `start_date`: YYYY-MM-DD (opcional)
- `end_date`: YYYY-MM-DD (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_invoices": 45,
    "draft_count": 3,
    "paid_count": 35,
    "pending_count": 7,
    "total_revenue": 125000.00,
    "avg_invoice_amount": 2777.78
  }
}
```

### 📋 Características de Invoices v1.3:
- ✅ Numeración automática por año (INV-2025-00001)
- ✅ Items flexibles: productos, envío, comisiones, descuentos
- ✅ Generación de PDF profesional con datos de empresa
- ✅ Almacenamiento de PDFs en Cloudinary
- ✅ Borrador → Finalizado (una vez finalizado no se puede editar)
- ✅ Gestión completa: crear, editar, finalizar, cancelar
- ✅ Estadísticas de ingresos por recibos
- ✅ Descarga directa de PDFs

---

## �🛡️ Garantías

### GET `/warranties`
Listar garantías con filtros.

**Query params:**
- `status` (`active` | `expired` | `expiring_soon`)
- `serial_number`

### GET `/warranties/:warrantyId`
Ver detalles de garantía.

### GET `/warranties/serial/:serialNumber`
Buscar garantía por serial.

### GET `/warranties/expiring/:days`
Garantías que vencen en X días.

**Ejemplo:** `GET /warranties/expiring/30`

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serialNumber": "SN123456789",
      "customerName": "Cliente Ejemplo",
      "productName": "Laptop Gaming",
      "expiresAt": "2025-11-15",
      "daysRemaining": 26
    }
  ]
}
```

---

## 🔧 Servicio Técnico

### GET `/services`
Listar servicios.

**Query params:**
- `status` (`received` | `in_repair` | `waiting_parts` | `ready` | `delivered` | `cancelled`)
- `priority` (`low` | `normal` | `high` | `urgent`)
- `serial_number`

### POST `/services`
Crear servicio técnico.

**Body:**
```json
{
  "warrantyId": "uuid",
  "serialNumber": "SN123456789",
  "reason": "No enciende",
  "observations": "Cliente reporta que no enciende después de caída",
  "priority": "high",
  "estimatedCost": 200.00
}
```

### PATCH `/services/:serviceId/status`
Actualizar estado del servicio.

**Body:**
```json
{
  "status": "in_repair",
  "notes": "Se identificó problema en placa madre"
}
```

---

## 📊 Reportes

### GET `/reports/dashboard`
Dashboard general con métricas.

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "sales": {
      "today": 5,
      "week": 32,
      "month": 145,
      "revenue": {
        "today": 7500.00,
        "week": 48000.00,
        "month": 215000.00
      }
    },
    "products": {
      "total": 450,
      "lowStock": 12,
      "outOfStock": 3
    },
    "warranties": {
      "active": 89,
      "expiring": 15
    },
    "services": {
      "pending": 8,
      "inRepair": 12
    }
  }
}
```

### GET `/reports/sales`
Reporte detallado de ventas.

**Query params:**
- `start_date`, `end_date`
- `group_by` (`day` | `week` | `month`)

### GET `/reports/inventory`
Reporte de inventario.

### GET `/reports/products-by-category`
Productos por categoría.

---

## 🎯 Ejemplos de Uso Completos

### Ejemplo 1: Crear producto con atributos

```bash
# 1. Crear producto
curl -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "uuid-categoria",
    "sku": "RAM-DDR4-001",
    "name": "Memoria RAM Corsair Vengeance 16GB",
    "price": 120.00,
    "stock": 10,
    "condition": "new"
  }'

# Respuesta: { "data": { "id": "uuid-producto" } }

# 2. Agregar atributos
curl -X POST http://localhost:3001/api/v1/products/uuid-producto/attributes/bulk \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": [
      { "name": "Tipo", "value": "DDR4" },
      { "name": "Capacidad", "value": "16GB" },
      { "name": "Velocidad", "value": "3200MHz" },
      { "name": "Marca", "value": "Corsair" },
      { "name": "Latencia", "value": "16-18-18-36" }
    ]
  }'
```

### Ejemplo 2: Flujo completo de invitación

```bash
# 1. Owner crea código
curl -X POST http://localhost:3001/api/v1/invitations \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{"companyId": "uuid", "role": "seller"}'

# Respuesta: { "data": { "code": "ABC12345" } }

# 2. Nuevo usuario valida código (sin auth)
curl http://localhost:3001/api/v1/invitations/validate/ABC12345

# 3. Nuevo usuario se registra con código
curl -X POST http://localhost:3001/api/v1/auth/register \
  -d '{
    "email": "nuevo@example.com",
    "password": "Pass123!",
    "name": "Nuevo Usuario",
    "invitationCode": "ABC12345"
  }'
```

### Ejemplo 3: Registrar compra

```bash
curl -X POST http://localhost:3001/api/v1/purchases \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "uuid-proveedor",
    "invoiceNumber": "FAC-2025-100",
    "products": [
      {
        "productId": "uuid-prod-1",
        "quantity": 5,
        "unitPrice": 1500.00
      },
      {
        "productId": "uuid-prod-2",
        "quantity": 10,
        "unitPrice": 120.00
      }
    ],
    "purchaseDate": "2025-10-20",
    "notes": "Compra mensual"
  }'

# Stock se actualiza automáticamente
```

---

## ✨ Nuevas Rutas v1.2 - Destacadas

### 1️⃣ Categorías Jerárquicas

#### GET `/categories/tree`
Obtener estructura jerárquica de categorías (árbol).

**Parámetros:** Ninguno

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "tree": [
      {
        "id": "uuid-cat-1",
        "name": "Electrónica",
        "description": "Productos electrónicos",
        "parent_id": null,
        "is_active": true,
        "created_at": "2025-10-20T10:00:00Z",
        "children": [
          {
            "id": "uuid-cat-2",
            "name": "Computadoras",
            "parent_id": "uuid-cat-1",
            "children": [
              {
                "id": "uuid-cat-3",
                "name": "Laptops",
                "parent_id": "uuid-cat-2",
                "children": []
              }
            ]
          }
        ]
      }
    ],
    "total": 5
  }
}
```

**Ejemplo curl:**
```bash
curl -X GET http://localhost:3001/api/v1/categories/tree \
  -H "Authorization: Bearer {token}"
```

---

### 2️⃣ Stock Completo Consolidado

#### GET `/products/stock/complete`
Obtener resumen completo de stock con valores consolidados.

**Parámetros:**
- `category` (uuid, opcional) - Filtrar por categoría
- `search` (string, opcional) - Buscar por nombre o SKU
- `min_stock_only` (boolean, default: false) - Solo productos bajo stock mínimo

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_items": 450,
      "total_value": 125000.00,
      "products_count": 25,
      "low_stock_count": 5,
      "out_of_stock_count": 2
    },
    "products": [
      {
        "id": "uuid-prod-1",
        "sku": "TV001",
        "name": "Televisor LED 42\"",
        "category": "Electrónica",
        "current_stock": 15,
        "min_stock": 5,
        "stock_status": "available",
        "price": 2500.00,
        "stock_value": 37500.00,
        "condition": "new",
        "created_at": "2025-09-15T10:00:00Z"
      }
    ]
  }
}
```

**Ejemplo curl:**
```bash
curl -X GET "http://localhost:3001/api/v1/products/stock/complete?min_stock_only=false" \
  -H "Authorization: Bearer {token}"
```

---

### 3️⃣ Compras con Tracking de Profit

#### POST `/purchases`
Crear compra CON campos de costo y ganancia.

**Body (MEJORADO v1.2):**
```json
{
  "supplier_id": "uuid-supplier",
  "supplier_name": "Proveedor Tech",
  "invoice_number": "INV-2025-001",
  "products": [
    {
      "product_id": "uuid-prod-1",
      "quantity": 10,
      "unit_price": 2000.00,
      "cost_per_unit": 1800.00,
      "sell_price_per_unit": 2500.00
    }
  ],
  "purchase_date": "2025-10-20",
  "notes": "Compra con margen de 27.8%"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-purchase-1",
    "company_id": "uuid-company",
    "invoice_number": "INV-2025-001",
    "total_amount": 20000.00,
    "cost_amount": 18000.00,
    "sell_amount": 25000.00,
    "profit_amount": 7000.00,
    "profit_margin_percent": 38.89,
    "purchase_date": "2025-10-20",
    "products": [
      {
        "product_id": "uuid-prod-1",
        "quantity": 10,
        "unit_price": 2000.00,
        "cost_per_unit": 1800.00,
        "sell_price_per_unit": 2500.00,
        "cost_total": 18000.00,
        "sell_total": 25000.00
      }
    ],
    "created_at": "2025-10-20T10:30:00Z"
  }
}
```

---

### 4️⃣ Ventas Completas con OCR

#### POST `/sales`
Crear venta CON extracción de número de serie (OCR).

**Body:**
```json
{
  "customer_name": "Cliente Premium",
  "customer_email": "cliente@example.com",
  "customer_phone": "+502 7123 4567",
  "products": [
    {
      "product_id": "uuid-prod-1",
      "quantity": 1,
      "unit_price": 2500.00
    }
  ],
  "warranty_months": 24,
  "payment_method": "credit_card",
  "serial_image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "notes": "Venta especial con OCR"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-sale-1",
    "company_id": "uuid-company",
    "customer_name": "Cliente Premium",
    "serial_number": "SN1234567890",
    "serial_image_url": "https://res.cloudinary.com/...",
    "total_amount": 2800.00,
    "warranty_months": 24,
    "sale_date": "2025-10-20T11:00:00Z",
    "warranty": {
      "id": "uuid-warranty-1",
      "serial_number": "SN1234567890",
      "expires_at": "2027-10-20",
      "is_active": true
    }
  }
}
```

**Nota:** El OCR es OPCIONAL. Si no se proporciona `serial_image`, se puede ingresar manualmente.

---

### 5️⃣ Resumen Ejecutivo: Costo vs Facturación

#### GET `/reports/cost-vs-revenue`
Resumen ejecutivo con análisis de costo vs ingresos.

**Parámetros:**
- `start_date` (date, opcional) - Filtro desde
- `end_date` (date, opcional) - Filtro hasta
- `include_monthly_breakdown` (boolean, default: true) - Incluir desglose mensual
- `format` (enum: json|excel|pdf, default: json)

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-31"
    },
    "cost_summary": {
      "total_purchase_cost": 85000.00,
      "total_purchases": 12,
      "avg_purchase_cost": 7083.33
    },
    "revenue_summary": {
      "total_actual_revenue": 145000.00,
      "total_sales": 28,
      "avg_sale_amount": 5178.57,
      "total_potential_revenue": 155000.00
    },
    "profit_analysis": {
      "projected_profit": 70000.00,
      "actual_gain": 60000.00,
      "profit_margin_percent": 82.35,
      "avg_profit_margin_percent": 42.15
    },
    "monthly_breakdown": [
      {
        "month": "2025-10-01",
        "cost": 85000.00,
        "revenue": 145000.00,
        "gain": 60000.00,
        "margin_percent": 70.59
      }
    ]
  }
}
```

**Ejemplo curl:**
```bash
curl -X GET "http://localhost:3001/api/v1/reports/cost-vs-revenue?start_date=2025-10-01&end_date=2025-10-31&format=json" \
  -H "Authorization: Bearer {token}"
```

---

## 📝 Códigos de Estado HTTP

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

---

## 🔒 Permisos por Rol

| Acción | owner | admin | seller | inventory |
|--------|-------|-------|--------|-----------|
| Crear invitaciones | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ✅ |
| Crear ventas | ✅ | ✅ | ✅ | ❌ |
| Gestionar inventario | ✅ | ✅ | ❌ | ✅ |
| Crear compras | ✅ | ✅ | ❌ | ✅ |

---

**¿Necesitas más detalles?** Ver [ARCHITECTURE.md](ARCHITECTURE.md) para la estructura técnica completa.
