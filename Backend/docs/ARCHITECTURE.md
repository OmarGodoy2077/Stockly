# Arquitectura del Sistema - Stockly Backend

## 🎯 Visión General

Stockly Backend es una aplicación SaaS multi-tenant diseñada para la gestión integral de inventario, ventas y servicio técnico para emprendedores en LATAM. El sistema utiliza una arquitectura modular y escalable basada en Node.js con Express.

## 🏗️ Arquitectura General

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente Web   │───▶│   Railway       │───▶│   PostgreSQL    │
│   (Next.js)     │    │   (Node.js)     │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Firebase       │
                       │  Storage        │
                       └─────────────────┘
```

### Tecnologías Principales

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| Runtime | Node.js | 20+ | Motor de ejecución |
| Framework | Express.js | 4.19+ | Servidor web |
| Base de Datos | PostgreSQL | 14+ | Almacenamiento de datos |
| Autenticación | JWT + bcrypt | - | Seguridad |
| Validación | Zod | 3+ | Validación de datos |
| Logging | Winston | 3+ | Registro de eventos |
| OCR | Tesseract.js | 5+ | Extracción de números de serie |
| Almacenamiento | Firebase Storage | 12+ | Archivos e imágenes |

## 🏢 Modelo de Datos

### Diagrama Completo de Base de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    STOCKLY DATABASE v1.1.0                       │
│                   Multi-Tenant Architecture                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   USERS      │  Autenticación principal
│──────────────│
│ id (PK)      │
│ email ◄──────┼── UNIQUE
│ password     │
│ name         │
│ phone        │
│ is_active    │
│ created_at   │
└──────────────┘
       │
       │ 1:N
       ├──────────────────────┐
       │                      │
┌──────▼──────┐      N:M      ├─► ┌─────────────────┐
│ COMPANIES   │◄───────────────┼──►│  USER_COMPANY   │
│─────────────│                │   │─────────────────│
│ id (PK)     │                │   │ id (PK)         │
│ name        │                │   │ user_id (FK)    │
│ ruc         │                │   │ company_id (FK) │
│ address     │                │   │ role ◄───────────── owner|admin|seller|inventory
│ is_active   │                │   │ invitation_code │
└─────────────┘                │   └─────────────────┘
       │                       │
       │ 1:N (Aislamiento)     │
       ├───────────────────────┼─► ┌──────────────────────┐
       │                       │   │    INVITATIONS       │  ✨ NUEVO v1.1
       │                       │   │──────────────────────│
       │                       │   │ id (PK)              │
       │                       └──►│ company_id (FK)      │
       │                           │ code ◄───────────────── ABC12345 (8 chars)
       │                           │ role                 │
       │                           │ created_by (FK)      │
       │                           │ expires_at           │  24 horas
       │                           │ is_active            │
       │                           └──────────────────────┘
       │
       ├─► ┌──────────────────────┐
       │   │    CATEGORIES        │  ✨ JERÁRQUICO v1.1
       │   │──────────────────────│
       │   │ id (PK)              │
       │   │ company_id (FK)      │
       │   │ name                 │
       │   │ parent_id (FK) ◄─┐   │  Self-join
       │   │ is_active        └───┼── Permite N niveles
       │   └──────────────────────┘
       │            │
       │            │ 1:N
       ├─► ┌────────▼──────────────────┐
       │   │      PRODUCTS             │  ✨ +condition v1.1
       │   │───────────────────────────│
       │   │ id (PK)                   │
       │   │ company_id (FK)           │
       │   │ category_id (FK)          │
       │   │ sku                       │
       │   │ name                      │
       │   │ price                     │
       │   │ stock                     │
       │   │ condition ◄───────────────── new|used|open_box
       │   │ barcode                   │
       │   │ image_url                 │
       │   └───────────────────────────┘
       │            │
       │            │ 1:N
       │            └─► ┌─────────────────────────┐
       │                │ PRODUCT_ATTRIBUTES      │  ✨ NUEVO v1.1
       │                │─────────────────────────│
       │                │ id (PK)                 │
       │                │ product_id (FK)         │
       │                │ name                    │  Flexible
       │                │ value                   │  Sin límite
       │                │ order_index             │
       │                └─────────────────────────┘
       │
       ├─► ┌──────────────────────┐
       │   │    SUPPLIERS         │
       │   │──────────────────────│
       │   │ id (PK)              │
       │   │ company_id (FK)      │
       │   │ name                 │
       │   │ contact_name         │
       │   │ email, phone         │
       │   └──────────────────────┘
       │            │
       │            │ 1:N
       ├─► ┌────────▼──────────────────┐
       │   │      PURCHASES            │  ✨ +profit tracking v1.2
       │   │───────────────────────────│
       │   │ id (PK)                   │
       │   │ company_id (FK)           │
       │   │ supplier_id (FK)          │
       │   │ invoice_number            │
       │   │ products (JSONB)          │  Array flexible
       │   │ total_amount              │
       │   │ cost_amount ◄─────────────── Costo total de compra
       │   │ sell_amount ◄──────────────  Ingresos potenciales
       │   │ profit_amount ◄────────────  Ganancia calculada
       │   │ profit_margin_percent     │  % margen
       │   │ purchase_date             │
       │   └───────────────────────────┘
       │
       ├─► ┌───────────────────────────┐
       │   │        SALES              │
       │   │───────────────────────────│
       │   │ id (PK)                   │
       │   │ company_id (FK)           │
       │   │ user_id (FK)              │
       │   │ customer_name             │
       │   │ serial_number ◄───────────── OCR extraído
       │   │ total                     │
       │   │ warranty_months           │
       │   └───────────────────────────┘
       │                │
       │                │ 1:1
       │                └─► ┌───────────────────────┐
       │                    │    WARRANTIES         │
       │                    │───────────────────────│
       │                    │ id (PK)               │
       │                    │ sale_id (FK)          │
       │                    │ serial_number         │
       │                    │ expires_at            │
       │                    │ is_active             │
       │                    └───────────────────────┘
       │                            │
       │                            │ 1:N
       └─► ┌───────────────────────▼───┐
           │  SERVICE_HISTORIES        │
           │───────────────────────────│
           │ id (PK)                   │
           │ warranty_id (FK)          │
           │ serial_number             │
           │ status ◄──────────────────── received|in_repair|delivered
           │ reason                    │
           │ observations              │
           │ photos (JSONB)            │
           │ entry_date                │
           └───────────────────────────┘

ÍNDICES CLAVE:
- idx_categories_hierarchy (company_id, parent_id)
- idx_products_condition (condition)
- idx_products_sku (sku) UNIQUE
- idx_product_attributes_product_id (product_id)
- idx_invitations_code (code) UNIQUE
- idx_purchases_profit_amount (profit_amount)
- idx_purchases_profit_margin (profit_margin_percent)

VISTAS MATERIALIZADAS:
- category_hierarchy: Árbol completo de categorías
- products_with_attributes: Productos + atributos en JSON
- low_stock_products: Productos bajo stock mínimo
- expiring_warranties: Garantías próximas a vencer
- purchase_profit_analysis: Análisis de rentabilidad por compra
- monthly_purchase_profit_summary: Resumen mensual de ganancias
```

### Descripción de Entidades

#### Empresas (companies)
- **Propósito**: Entidad raíz del multi-tenant
- **Campos clave**: `id`, `name`, `ruc`, `address`, `created_at`
- **Relaciones**: Muchos usuarios, productos, ventas, compras

#### Usuarios (users)
- **Propósito**: Autenticación y autorización
- **Campos clave**: `id`, `email`, `password_hash`, `name`, `created_at`
- **Relaciones**: Pertenece a múltiples empresas con diferentes roles

#### Usuarios-Empresa (user_company)
- **Propósito**: Relaciona usuarios con empresas y define roles
- **Campos clave**: `user_id`, `company_id`, `role`, `invited_by`, `created_at`
- **Roles**: `owner`, `admin`, `seller`, `inventory`

#### Productos (products)
- **Propósito**: Gestión de inventario
- **Campos clave**: `id`, `company_id`, `sku`, `name`, `stock`, `price`, `category`
- **Relaciones**: Vendido en ventas, comprado en compras

#### Ventas (sales)
- **Propósito**: Registro de transacciones
- **Campos clave**: `id`, `company_id`, `user_id`, `customer_name`, `customer_email`, `serial_number`, `total`, `warranty_months`
- **Relaciones**: Genera garantía, contiene productos

#### Garantías (warranties)
- **Propósito**: Seguimiento de períodos de garantía
- **Campos clave**: `id`, `sale_id`, `serial_number`, `expires_at`, `is_active`
- **Relaciones**: Puede tener historial de servicio

#### Compras (purchases)
- **Propósito**: Registro de entradas de inventario con análisis de rentabilidad
- **Campos clave**: `id`, `company_id`, `supplier`, `products`, `quantities`, `date`, `cost_amount`, `sell_amount`, `profit_amount`, `profit_margin_percent`
- **Características nuevas v1.2**:
  - Tracking automático de costos y ganancias
  - Cálculo automático de margen de ganancia
  - Vistas de análisis de rentabilidad
  - Campos en productos JSONB: `cost_per_unit`, `sell_price_per_unit`, `profit_per_unit`

#### Historial de Servicio (service_histories)
- **Propósito**: Seguimiento de reparaciones y mantenimiento
- **Campos clave**: `id`, `warranty_id`, `serial_number`, `status`, `reason`, `observations`, `photos`, `entry_date`
- **Estados**: `received`, `in_repair`, `delivered`

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as Servidor
    participant DB as Base de Datos

    C->>S: POST /api/auth/login
    S->>DB: Verificar credenciales
    DB-->>S: Usuario válido
    S->>S: Generar Access Token + Refresh Token
    S-->>C: Tokens + datos del usuario

    C->>S: GET /api/protected (con Access Token)
    S->>S: Verificar JWT
    S-->>C: Datos protegidos

    Note over C,S: Cuando expira Access Token
    C->>S: POST /api/auth/refresh
    S->>S: Verificar Refresh Token
    S-->>C: Nuevo Access Token
```

### Tokens JWT

- **Access Token**: Vigencia corta (15 minutos)
- **Refresh Token**: Vigencia larga (7 días)
- **Payload**: `user_id`, `company_id`, `role`, `exp`

## 📁 Estructura de Carpetas

```
src/
├── config/           # Configuraciones centralizadas
│   ├── database.js   # Pool de conexiones PostgreSQL
│   ├── jwt.js        # Configuración de tokens
│   ├── logger.js     # Configuración Winston
│   ├── firebase.js   # Firebase Admin SDK
│   └── tesseract.js  # Configuración OCR
├── controllers/      # Lógica de negocio (thin controllers)
├── routes/           # Definición de rutas HTTP
├── middlewares/      # Middlewares reutilizables
├── models/           # Capa de acceso a datos (raw SQL)
├── services/         # Integraciones externas
├── utils/            # Utilidades y helpers
└── validations/      # Esquemas de validación Zod
```

## 🔄 Flujos de Negocio Principales

### 1. Gestión de Inventario

```mermaid
graph TD
    A[Compra de productos] --> B[Registro en purchases]
    B --> C[Actualizar stock en products]
    C --> D[Venta de productos]
    D --> E[Disminuir stock]
    E --> F[Crear registro en sales]
    F --> G[Generar garantía automática]
```

### 2. Proceso de Venta con OCR

```mermaid
graph TD
    A[Cliente sube foto de producto] --> B[Extraer serial number con OCR]
    B --> C[Crear registro de venta]
    C --> D[Generar garantía automática]
    D --> E[Guardar URLs de Firebase Storage]
    E --> F[Actualizar inventario]
```

### 3. Servicio Técnico

```mermaid
graph TD
    A[Producto entra a servicio] --> B[Crear service_history]
    B --> C[Subir fotos a Firebase]
    C --> D[Actualizar estado]
    D --> E[Cliente recoge producto]
    E --> F[Cambiar estado a delivered]
```

## 🚀 Estrategia de Despliegue

### Railway Deployment

1. **Build Stage**:
   - Instalar dependencias con `npm ci`
   - Variables de entorno desde dashboard de Railway

2. **Runtime**:
   - Node.js 20+ runtime
   - Puerto dinámico (process.env.PORT)
   - Conexión a PostgreSQL externa

3. **Configuración de Producción**:
   ```json
   {
     "engines": {
       "node": ">=20.0.0"
     },
     "scripts": {
       "start": "node src/server.js"
     }
   }
   ```

## 🔧 Configuración de Entorno

### Variables de Entorno Críticas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar JWT | `super-secret-jwt-key` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | `super-secret-refresh-key` |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase | `my-project-12345` |
| `FIREBASE_STORAGE_BUCKET` | Bucket de almacenamiento | `my-project.appspot.com` |

## 📊 Monitoreo y Logging

### Winston Configuration

```javascript
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## 🔒 Medidas de Seguridad

1. **Autenticación**:
   - JWT con secretos separados
   - Refresh tokens rotativos
   - Contraseñas hasheadas con bcrypt

2. **Autorización**:
   - Middleware de verificación de roles
   - Validación estricta de datos con Zod
   - Sanitización de entradas

3. **Base de Datos**:
   - Queries parametrizadas (sin SQL injection)
   - Conexiones en pool para eficiencia
   - Configuración SSL en producción

4. **Archivos**:
   - Firebase Admin SDK para uploads seguros
   - Validación de tipos de archivo
   - URLs firmadas para acceso temporal

## 🚀 Escalabilidad

### Estrategias Implementadas

1. **Base de Datos**:
   - Índices en campos consultados frecuentemente
   - Consultas optimizadas con JOINs apropiados
   - Pool de conexiones configurable

2. **Aplicación**:
   - Middlewares reutilizables
   - Validación previa para reducir procesamiento
   - Logging asíncrono para no bloquear requests

3. **Arquitectura**:
   - Separación clara de responsabilidades
   - Configuración externa para deployment
   - Compatibilidad con múltiples entornos

## 🔄 Mantenimiento

### Backups
- Base de datos: Configurar PostgreSQL backups automáticos
- Logs: Rotación automática con Winston
- Configuración: Versionar .env.example

### Monitoring
- Health check endpoint en `/api/health`
- Métricas básicas de uso
- Logs estructurados para análisis

Esta arquitectura proporciona una base sólida para un SaaS escalable, manteniendo la simplicidad necesaria para emprendedores en LATAM mientras asegura la robustez requerida para entornos de producción.