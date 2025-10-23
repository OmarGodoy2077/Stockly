# 🏗️ Arquitectura - Stockly Backend v1.3.0

**Versión:** 1.3.0 | **Última Actualización:** 22 de Octubre, 2025

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura de Componentes](#arquitectura-de-componentes)
4. [Modelo de Datos](#modelo-de-datos)
5. [Flujos de Datos](#flujos-de-datos)
6. [Seguridad](#seguridad)
7. [Performance](#performance)
8. [Escalabilidad](#escalabilidad)

---

## 🎯 Visión General

Stockly es un sistema **multi-tenant SaaS** con arquitectura en capas:

```
┌─────────────────────────────────────────────────┐
│         Frontend (React/TypeScript)             │
└─────────────────────────────────────────────────┘
                    ↓ HTTP/REST
┌─────────────────────────────────────────────────┐
│        Express.js Backend (Node.js)             │
│  ┌─────────────────────────────────────────┐   │
│  │ Controllers → Models → Database         │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                    ↓ SQL
┌─────────────────────────────────────────────────┐
│   PostgreSQL (Supabase Cloud Hosting)           │
└─────────────────────────────────────────────────┘
                    ↓ APIs
┌──────────────────────────────────────────────────────┐
│ Cloudinary | Tesseract.js | jsPDF | Winston         │
└──────────────────────────────────────────────────────┘
```

---

## 🔧 Stack Tecnológico

### Backend Core
| Componente | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| Runtime | Node.js | 20+ | Motor de ejecución |
| Framework | Express.js | 4.19+ | Servidor HTTP/REST |
| Lenguaje | JavaScript (ES6+) | - | Lógica empresarial |

### Base de Datos
| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| RDBMS | PostgreSQL | 14+ |
| Hosting | Supabase | Cloud hosting, auth opcional |
| Client | pg (node-postgres) | Driver nativo SQL |
| ORM | SQL puro (prepared statements) | Máxima seguridad |

### Seguridad & Autenticación
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Autenticación | JWT (jsonwebtoken) | 9.0.2 |
| Hash Contraseñas | bcrypt | 5.1.1 |
| Validación | Zod | 3.23.8 |
| Seguridad HTTP | Helmet | 8.0.0 |
| Rate Limiting | express-rate-limit | 7.4.1 |
| CORS | cors | 2.8.5 |

### Almacenamiento & Archivos
| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Imágenes/PDFs | Cloudinary | CDN + almacenamiento |
| OCR | Tesseract.js | Extracción de texto de imágenes |
| PDF Generation | jsPDF + jsPDF-autoTable | Generación de recibos |
| Excel Export | ExcelJS | 4.4.0 | Reportes Excel |

### Logging & Monitoreo
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Logging | Winston | 3.15.0 |
| Niveles | debug, info, warn, error | - |
| Destinos | Console, archivo | - |

### Tareas Programadas
| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Scheduling | node-cron | 3.0.3 | Tareas periódicas |

---

## 🏛️ Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                   REQUEST PIPELINE                           │
│                                                               │
│  Client  →  [Request Logger]  →  [CORS Handler]            │
│                         ↓                                     │
│              [Rate Limiter]  →  [Body Parser]               │
│                         ↓                                     │
│         [Auth Middleware]  →  [Role Validator]              │
│                         ↓                                     │
│          [Validation Middleware]  (Zod)                     │
│                         ↓                                     │
│    ┌───────────────────────────────────────────┐            │
│    │         CONTROLLERS LAYER                 │            │
│    ├───────────────────────────────────────────┤            │
│    │ AuthController    ProductController       │            │
│    │ UserController    SaleController          │            │
│    │ CompanyController InvoiceController       │            │
│    │ CategoryController PurchaseController     │            │
│    │ WarrantyController ReportController       │            │
│    └───────────────────────────────────────────┘            │
│                         ↓                                     │
│    ┌───────────────────────────────────────────┐            │
│    │       BUSINESS LOGIC / SERVICES           │            │
│    ├───────────────────────────────────────────┤            │
│    │ - Validaciones complejas                  │            │
│    │ - Cálculos (profit, totales)              │            │
│    │ - Orquestación de operaciones             │            │
│    └───────────────────────────────────────────┘            │
│                         ↓                                     │
│    ┌───────────────────────────────────────────┐            │
│    │         MODELS LAYER (Data Access)        │            │
│    ├───────────────────────────────────────────┤            │
│    │ UserModel       InvoiceModel              │            │
│    │ ProductModel    PurchaseModel             │            │
│    │ SaleModel       CategoryModel             │            │
│    │ WarrantyModel   ReportModel               │            │
│    └───────────────────────────────────────────┘            │
│                         ↓                                     │
│    ┌───────────────────────────────────────────┐            │
│    │      EXTERNAL SERVICES & UTILITIES        │            │
│    ├───────────────────────────────────────────┤            │
│    │ Cloudinary | Tesseract.js | jsPDF        │            │
│    │ JWT Generator | Bcrypt | Logger          │            │
│    └───────────────────────────────────────────┘            │
│                         ↓                                     │
│    ┌───────────────────────────────────────────┐            │
│    │        DATABASE LAYER                     │            │
│    │   PostgreSQL (Supabase)                   │            │
│    └───────────────────────────────────────────┘            │
│                         ↓                                     │
│              [Error Handler Middleware]                      │
│                         ↓                                     │
│                  JSON Response  →  Client                   │
└─────────────────────────────────────────────────────────────┘
```

### Carpeta Estructura

```
Backend/
├── src/
│   ├── server.js                 # Entrada principal
│   ├── config/
│   │   ├── database.js          # Pool conexiones PostgreSQL
│   │   ├── jwt.js               # Configuración JWT
│   │   ├── logger.js            # Winston logger
│   │   ├── cloudinary.js        # SDK Cloudinary
│   │   └── tesseract.js         # OCR Tesseract
│   │
│   ├── controllers/              # Lógica de endpoints
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── sale.controller.js
│   │   ├── invoice.controller.js
│   │   ├── purchase.controller.js
│   │   └── [otros controllers]
│   │
│   ├── models/                   # Data access layer
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   ├── sale.model.js
│   │   ├── invoice.model.js
│   │   └── [otros models]
│   │
│   ├── routes/                   # Definición de rutas
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   ├── sale.routes.js
│   │   ├── invoice.routes.js
│   │   └── [otros routes]
│   │
│   ├── middlewares/              # Middleware Express
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── request.middleware.js
│   │   ├── role.middleware.js
│   │   └── validation.middleware.js
│   │
│   ├── utils/                    # Utilidades
│   │   ├── validators.js
│   │   ├── pdf-generator.js
│   │   └── transformers.js
│   │
│   └── validations/              # Esquemas Zod
│       └── schemas.js
│
├── database/
│   ├── init.sql                 # Schema inicial completo
│   └── migrations/
│       ├── add-invoices-system.sql
│       ├── add-product-improvements.sql
│       └── [otras migraciones]
│
├── docs/
│   ├── README.md
│   ├── SETUP.md
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md (este)
│   ├── UML_ANALYSIS.md
│   └── DEPLOYMENT_GUIDE.md
│
└── package.json
```

---

## 💾 Modelo de Datos

### 18 Tablas Principales

#### Core Multi-Tenant
- **users** - Autenticación central
- **companies** - Tenants (empresas)
- **user_company** - Relación N:M con roles

#### Inventario
- **categories** - Jerarquía multinivel
- **products** - Catálogo de productos
- **product_attributes** - Atributos dinámicos por producto

#### Transacciones
- **sales** - Ventas registradas
- **purchases** - Compras con profit tracking
- **invoices** - Recibos/facturas generadas
- **invoice_line_items** - Items desglosados de invoices

#### Post-Venta
- **warranties** - Garantías automáticas
- **service_histories** - Registro de reparaciones

#### Configuración
- **suppliers** - Proveedores
- **invitations** - Códigos de invitación

### 6 Vistas Materializadas

```sql
-- Listado
SELECT * FROM category_hierarchy;          -- Árbol de categorías
SELECT * FROM products_with_attributes;    -- Productos + atributos JSON
SELECT * FROM invoices_with_details;       -- Invoices con totales

-- Análisis
SELECT * FROM purchase_profit_analysis;    -- Rentabilidad por compra
SELECT * FROM monthly_purchase_profit_summary; -- Resumen mensual
SELECT * FROM low_stock_products;          -- Productos bajo stock
```

### Índices Clave (50+)

```sql
-- PK
CREATE UNIQUE INDEX ... ON users(email);
CREATE UNIQUE INDEX ... ON companies;
CREATE UNIQUE INDEX ... ON invoices(company_id, invoice_number);

-- FK
CREATE INDEX ... ON products(company_id);
CREATE INDEX ... ON sales(company_id);
CREATE INDEX ... ON invoices(sale_id);

-- Búsqueda
CREATE INDEX ... ON products(name);
CREATE INDEX ... ON sales(customer_email);
CREATE INDEX ... ON invoices(invoice_number);

-- Performance
CREATE INDEX ... ON purchases(profit_amount);
CREATE INDEX ... ON warranty(expires_at);
```

### Triggers Automáticos (5)

```sql
-- Timestamps
trigger_users_updated_at
trigger_products_updated_at
trigger_invoices_updated_at

-- Cálculos
trigger_calculate_invoice_line_total    -- unit_price × quantity
trigger_calculate_purchase_profit       -- sell - cost, margen

-- Secuencias
trigger_generate_invoice_number         -- INV-YYYY-NNNNN
```

---

## 🔄 Flujos de Datos

### Flujo 1: Autenticación → Token JWT

```
POST /auth/login
  ↓
1. Validar credenciales (email + password)
2. Hash contraseña con bcrypt (verificar)
3. Generar JWT tokens (access + refresh)
4. Almacenar refresh token en BD (opcional)
5. Retornar tokens al cliente
  ↓
Cliente almacena en localStorage/cookies
```

### Flujo 2: Creación de Venta con OCR

```
POST /sales { serial_image: base64 }
  ↓
1. Validar datos de venta
2. Si serial_image:
   a. Llamar a Tesseract.js OCR
   b. Extraer número de serie
   c. Si falla → continuar sin serie
3. Crear venta en BD
4. Subir imagen a Cloudinary (si existe)
5. Crear garantía automática
6. Retornar sale_id
  ↓
Garantía disponible para servicio técnico
```

### Flujo 3: Generación de Invoice

```
POST /invoices { sale_id, company_data }
  ↓
1. Obtener venta + cliente desde BD
2. Generar número secuencial (INV-YYYY-NNNNN)
3. Crear invoice en estado DRAFT
4. Completar con datos de empresa
  ↓
POST /invoices/:id/line-items (opcional)
  ↓
5. Agregar items adicionales (envío, impuestos, descuentos)
  ↓
POST /invoices/:id/generate-pdf
  ↓
6. Compilar datos en jsPDF
7. Generar PDF profesional
8. Subir a Cloudinary
9. Guardar URL en BD
  ↓
PATCH /invoices/:id/finalize
  ↓
10. Marcar como PENDING (no editable)
11. Estado de venta → INVOICED
  ↓
PDF disponible para descargar
```

### Flujo 4: Cálculo de Profit en Compras

```
POST /purchases { products: [...] }
  ↓
1. Para cada producto:
   a. cost_amount += cost_per_unit × quantity
   b. sell_amount += sell_price_per_unit × quantity
2. Trigger automático:
   a. profit_amount = sell_amount - cost_amount
   b. profit_margin_percent = (profit_amount / sell_amount) × 100
  ↓
Almacenar en BD automáticamente
  ↓
Disponible en reportes y análisis
```

---

## 🔐 Seguridad

### Autenticación

**JWT Strategy:**
- Access token: 15 minutos
- Refresh token: 7 días
- Payload: { user_id, company_id, role, email }

```javascript
// Generación
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

// Validación
const decoded = jwt.verify(token, JWT_SECRET);
```

### Autorización (RBAC)

**4 Roles por empresa:**
```
owner       → Control total + invitaciones
admin       → Acceso a todo (excepto invitaciones)
seller      → Crear ventas, ver inventario
inventory   → Ver/actualizar stock
```

### Validación de Entrada

```javascript
// Zod Schema
const createProductSchema = z.object({
  name: z.string().min(3).max(255),
  price: z.number().min(0),
  stock: z.number().int().min(0)
});
```

### SQL Injection Prevention

```javascript
// ✅ Seguro - Prepared statements
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);

// ❌ Inseguro - String interpolation (NO USAR)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### Hashing de Contraseñas

```javascript
// Generar
const hash = await bcrypt.hash(password, 12);

// Validar
const isValid = await bcrypt.compare(password, hash);
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutos
  max: 100,                     // 100 requests
  message: 'Too many requests'
});
```

---

## ⚡ Performance

### Optimizaciones de Base de Datos

**Índices:** 50+ índices estratégicos en tablas clave  
**Vistas materializadas:** Para queries complejas  
**Prepared statements:** Evitan reparseo de SQL  
**Connection pooling:** Via Supabase (óptimo)

### Caching Estratégico

```javascript
// Cachear categorías (no cambian frecuentemente)
const categories = await redis.get('categories');
if (!categories) {
  categories = await db.query('SELECT * FROM categories');
  await redis.set('categories', categories, 3600);
}
```

### Lazy Loading

```javascript
// Solo traer atributos si se solicita
GET /products/:id           // Sin atributos
GET /products/:id?details=true  // Con atributos
```

### Paginación

```javascript
// Siempre paginar resultados largos
GET /products?page=1&limit=20
GET /sales?page=2&limit=50
```

---

## 📈 Escalabilidad

### Horizontal Scaling

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Backend  │  │ Backend  │  │ Backend  │
│ Instance │  │ Instance │  │ Instance │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
          ┌────────▼────────┐
          │ Load Balancer   │
          │ (Railway/Render)│
          └─────────────────┘
```

### Base de Datos

```
┌─────────────────────────────────────┐
│ PostgreSQL Primary (Supabase)       │
│ - Lecturas + Escrituras             │
│ - Backups automáticos               │
└─────────────────────────────────────┘
          │ Replicación
          ▼
┌─────────────────────────────────────┐
│ PostgreSQL Read Replicas (opcional) │
│ - Análisis y reportes               │
└─────────────────────────────────────┘
```

### Multi-Tenancy

```
┌─────────────────────────────────────┐
│ Mismo Backend, Múltiples Empresas   │
│                                     │
│ WHERE company_id = $1  (en queries) │
│                                     │
│ Aislamiento automático de datos     │
└─────────────────────────────────────┘
```

---

## 📊 Monitoreo

### Logs con Winston

```javascript
logger.info('User login', { user_id, company_id });
logger.error('Database error', { error, query });
logger.warn('High profit margin', { purchase_id, margin: 95% });
```

### Métricas Clave

- Requests/segundo
- Tiempo promedio respuesta
- Errores por tipo
- Uso de BD (conexiones activas)
- Espacio almacenamiento Cloudinary

---

## 🚀 Deployment

**Recomendado:** Railway, Render, Heroku  
**BD:** Supabase (hosted PostgreSQL)  
**CDN:** Cloudinary (archivos)

---

**Última actualización:** 22 Octubre 2025 | v1.3.0

