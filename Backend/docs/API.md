# API Documentation - Stockly Backend

## 📋 Índice

- [Autenticación](#autenticación)
- [Productos](#productos)
- [Ventas](#ventas)
- [Reportes](#reportes)
- [Salud del Sistema](#salud-del-sistema)
- [Códigos de Error](#códigos-de-error)

## 🔐 Autenticación

### Registro de Usuario y Empresa
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "emprendedor@ejemplo.com",
  "password": "Password123!",
  "name": "Juan Pérez",
  "phone": "+502 1234 5678",
  "companyName": "Mi Tienda SA",
  "companyRuc": "12345678901",
  "companyAddress": "Calle Principal 123",
  "companyPhone": "+502 9876 5432",
  "companyEmail": "contacto@mitienda.com"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "emprendedor@ejemplo.com",
      "name": "Juan Pérez",
      "phone": "+502 1234 5678"
    },
    "company": {
      "id": "uuid",
      "name": "Mi Tienda SA",
      "ruc": "12345678901",
      "role": "owner"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": "15m"
  }
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "contraseña",
  "companyId": "uuid_opcional"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@empresa.com",
      "name": "Nombre Usuario",
      "companies": [
        {
          "id": "uuid",
          "name": "Empresa Demo",
          "role": "admin",
          "ruc": "12345678901"
        }
      ]
    },
    "currentCompany": {
      "id": "uuid",
      "name": "Empresa Demo",
      "role": "admin"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": "15m"
  }
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": "15m"
  }
}
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}
```

### Obtener Usuario Actual
```http
GET /api/v1/auth/me
Authorization: Bearer jwt_token
```

### Cambiar Contraseña
```http
POST /api/v1/auth/change-password
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

## 👥 Usuarios

### Obtener Perfil
```http
GET /api/v1/users/profile
Authorization: Bearer jwt_token
```

### Actualizar Perfil
```http
PUT /api/v1/users/profile
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "phone": "+502 1111 2222"
}
```

### Obtener Empresas del Usuario
```http
GET /api/v1/users/companies
Authorization: Bearer jwt_token
```

### Cambiar de Empresa
```http
POST /api/v1/users/switch-company/{companyId}
Authorization: Bearer jwt_token
```

### Listar Usuarios de la Empresa (Admin)
```http
GET /api/v1/users?page=1&limit=20&role=seller&search=juan
Authorization: Bearer jwt_token
```

## 🏢 Empresas

### Crear Nueva Empresa
```http
POST /api/v1/companies
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "name": "Nueva Empresa SA",
  "ruc": "98765432101",
  "address": "Calle Secundaria 456",
  "phone": "+502 3333 4444",
  "email": "info@nuevaempresa.com"
}
```

### Obtener Detalles de Empresa
```http
GET /api/v1/companies/{companyId}
Authorization: Bearer jwt_token
```

### Actualizar Empresa
```http
PUT /api/v1/companies/{companyId}
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "name": "Empresa Actualizada SA",
  "address": "Nueva dirección"
}
```

### Obtener Estadísticas de Empresa
```http
GET /api/v1/companies/{companyId}/statistics
Authorization: Bearer jwt_token
```

### Listar Miembros de la Empresa
```http
GET /api/v1/companies/{companyId}/members
Authorization: Bearer jwt_token
```

### Invitar Usuario a la Empresa (Admin)
```http
POST /api/v1/companies/{companyId}/invite
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "email": "nuevo@empleado.com",
  "role": "seller",
  "name": "Nuevo Empleado",
  "phone": "+502 5555 6666",
  "password": "TempPassword123!"
}
```

**Roles disponibles:**
- `admin`: Puede gestionar usuarios y configuración
- `seller`: Puede registrar ventas y ver inventario
- `inventory`: Puede gestionar inventario y compras

### Actualizar Rol de Miembro (Owner)
```http
PATCH /api/v1/companies/{companyId}/members/{userId}/role
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "role": "admin"
}
```

### Eliminar Miembro de la Empresa (Admin)
```http
DELETE /api/v1/companies/{companyId}/members/{userId}
Authorization: Bearer jwt_token
```

## 📦 Productos

### Listar productos
```http
GET /api/v1/products?page=1&limit=20&category=uuid&search=producto&stock_status=low
Authorization: Bearer jwt_token
```

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (1-100, default: 20)
- `category`: Filtrar por ID de categoría
- `search`: Buscar en nombre, SKU o descripción
- `stock_status`: Filtrar por estado de stock (`low`, `out`, `available`)
- `sort_by`: Campo para ordenar (`name`, `sku`, `price`, `stock`, `created_at`)
- `sort_order`: Orden (`ASC`, `DESC`)

### Crear producto
```http
POST /api/v1/products
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "sku": "TV001",
  "name": "Televisor LED 42\"",
  "description": "Televisor LED de 42 pulgadas Full HD",
  "price": 2500.00,
  "stock": 10,
  "min_stock": 5,
  "category_id": "uuid",
  "image_url": "https://ejemplo.com/imagen.jpg",
  "barcode": "123456789"
}
```

### Obtener producto por ID
```http
GET /api/v1/products/{id}
Authorization: Bearer jwt_token
```

### Actualizar producto
```http
PUT /api/v1/products/{id}
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "name": "Televisor LED 42\" Updated",
  "price": 2600.00,
  "min_stock": 3
}
```

### Actualizar stock
```http
PATCH /api/v1/products/{id}/stock
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "stock": 15,
  "operation": "set"
}
```

### Eliminar producto
```http
DELETE /api/v1/products/{id}
Authorization: Bearer jwt_token
```

### Productos con stock bajo
```http
GET /api/v1/products/low-stock
Authorization: Bearer jwt_token
```

### Estadísticas de productos
```http
GET /api/v1/products/statistics
Authorization: Bearer jwt_token
```

## 💰 Ventas

### Listar ventas
```http
GET /api/v1/sales?page=1&limit=20&start_date=2024-01-01&end_date=2024-12-31&customer_name=Juan
Authorization: Bearer jwt_token
```

**Parámetros de consulta:**
- `page`, `limit`: Paginación
- `start_date`, `end_date`: Rango de fechas (YYYY-MM-DD)
- `customer_name`: Filtrar por nombre del cliente
- `serial_number`: Filtrar por número de serie
- `payment_method`: Método de pago

### Crear venta con OCR
```http
POST /api/v1/sales
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "customer_name": "Juan Pérez",
  "customer_email": "juan@email.com",
  "customer_phone": "+502 1234 5678",
  "products": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "unit_price": 2500.00,
      "discount": 0
    }
  ],
  "payment_method": "efectivo",
  "warranty_months": 12,
  "serial_image": "base64_image_data"
}
```

### Buscar venta por número de serie
```http
GET /api/v1/sales/search/serial/{serialNumber}
Authorization: Bearer jwt_token
```

### Estadísticas de ventas
```http
GET /api/v1/sales/statistics?period=month
Authorization: Bearer jwt_token
```

## 📊 Reportes

### Tipos de reportes disponibles
```http
GET /api/v1/reports/types
Authorization: Bearer jwt_token
```

### Reporte de inventario (Excel/PDF/CSV)
```http
GET /api/v1/reports/inventory?format=excel&category=uuid&stock_status=low
Authorization: Bearer jwt_token
```

**Parámetros:**
- `format`: `excel`, `pdf`, `csv`
- `category`: Filtrar por categoría
- `stock_status`: Estado de stock
- `include_company_info`: Incluir información de empresa

### Reporte de ventas
```http
GET /api/v1/reports/sales?format=pdf&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer jwt_token
```

### Reporte de garantías
```http
GET /api/v1/reports/warranties?format=excel&status=expiring&expiring_days=30
Authorization: Bearer jwt_token
```

### Reporte de servicio técnico
```http
GET /api/v1/reports/services?format=csv&status=in_repair&start_date=2024-01-01
Authorization: Bearer jwt_token
```

## 🏥 Salud del Sistema

### Health Check básico
```http
GET /api/health
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "response_time": "150ms",
    "services": {
      "database": { "status": "healthy" },
      "firebase": { "status": "healthy" },
      "ocr": { "status": "healthy" }
    }
  }
}
```

### Health Check detallado
```http
GET /api/health/detailed
```

### Readiness Check (Kubernetes)
```http
GET /api/health/ready
```

### Liveness Check (Kubernetes)
```http
GET /api/health/live
```

## 🚨 Códigos de Error

| Código | Descripción | Solución típica |
|--------|-------------|-----------------|
| 400 | Solicitud inválida | Verificar parámetros y formato de datos |
| 401 | No autenticado | Incluir token JWT válido en Authorization header |
| 403 | No autorizado | Verificar permisos de usuario/rol |
| 404 | Recurso no encontrado | Verificar ID del recurso |
| 409 | Conflicto (duplicado) | El recurso ya existe |
| 422 | Datos inválidos | Verificar formato y tipos de datos |
| 429 | Demasiadas solicitudes | Esperar antes de intentar nuevamente |
| 500 | Error interno del servidor | Contactar soporte técnico |
| 503 | Servicio no disponible | Verificar estado del sistema |

## 📝 Formatos de Respuesta

### Respuesta exitosa estándar
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Respuesta con paginación
```json
{
  "success": true,
  "message": "Datos obtenidos exitosamente",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Respuesta de error
```json
{
  "success": false,
  "error": "Mensaje de error descriptivo",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": { } // Solo en desarrollo
}
```

## 🔒 Seguridad

- Todas las rutas (excepto health checks) requieren autenticación JWT
- Los permisos se verifican por empresa y rol de usuario
- Rate limiting aplicado para prevenir abuso
- CORS configurado para entornos específicos
- Validación estricta de todos los datos de entrada

## 📊 Límites y Restricciones

- **Paginación**: Máximo 100 elementos por página
- **Búsqueda**: Máximo 100 caracteres
- **Archivos**: Máximo 10MB por archivo
- **Rate limiting**: 100 requests por 15 minutos por IP
- **Reportes**: Máximo 10,000 registros por reporte

## 🚀 Próximas Características

- [ ] Notificaciones por email
- [ ] Dashboard con métricas en tiempo real
- [ ] API de configuración avanzada
- [ ] Sistema de backup automático
- [ ] Tests automatizados completos
- [ ] Caché Redis para mejor rendimiento

---

**Stockly Backend v1.0.0** - Sistema SaaS para gestión de inventario en LATAM