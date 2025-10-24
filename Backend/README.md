# 📚 Stockly Backend v1.3.0

**Última Actualización:** 23 de Octubre, 2025  
**Estado:** ✅ Listo para Producción  
**Node.js:** 20+ | **Express:** 4.19+ | **PostgreSQL:** 14+ (Supabase)

---

## 🎯 Descripción del Proyecto

Stockly es un **SaaS multi-tenant** completo para gestión integral de inventario, ventas, invoices, garantías y servicio técnico. Diseñado para PYMES en LATAM.

**Stack Completo:** ✅ Node.js + Express | ✅ PostgreSQL + Supabase | ✅ JWT Auth | ✅ OCR + Tesseract | ✅ PDF con jsPDF | ✅ Cloudinary | ✅ Winston Logger

**Características Principales:** ✅ Multi-tenant | ✅ Categorías jerárquicas | ✅ Atributos dinámicos | ✅ OCR para seriales | ✅ Invoices PDF profesionales | ✅ Profit tracking | ✅ Garantías con servicio técnico | ✅ RBAC (4 roles) | ✅ Reportes completos

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar
git clone <repository-url> && cd Backend && npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con Supabase, Cloudinary, JWT

# 3. Inicializar BD (primera vez)
# Ejecutar en Supabase SQL Editor → database/init.sql

# 4. Iniciar
npm run dev

# ✅ Backend en http://localhost:3001
```

**Ya tienes BD existente?** Ejecutar: `migrations/add-invoices-system.sql` en SQL Editor

---

## 📖 Documentación Esencial

Para **desarrolladores frontend y especialistas UML**, aquí está todo lo necesario:

| Archivo | Contenido |
|---------|----------|
| **[SETUP.md](docs/SETUP.md)** | Configuración paso a paso (15 min) |
| **[API_REFERENCE.md](docs/API_REFERENCE.md)** | Todos los endpoints, ejemplos, parámetros |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Stack, BD, modelos de datos |
| **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE_v1.3.0.md)** | Despliegue a producción |
| **[UML_ANALYSIS.md](docs/UML_ANALYSIS.md)** | 🎯 **Diagramas ER, clases, secuencias, UML completo** |

---

## 🌟 Características v1.3.0

### ⭐ Invoices/Recibos - PDF Profesionales
- ✅ Generación de PDFs profesionales con logo y datos empresa
- ✅ Numeración automática secuencial por empresa (INV-YYYY-00001)
- ✅ Items flexibles: productos, envío, comisiones, descuentos
- ✅ Cálculo automático de impuestos (IVA configurable)
- ✅ Almacenamiento en Cloudinary con URL pública
- ✅ Estados: Draft → Pending → Paid/Cancelled
- ✅ Endpoints para generar, actualizar, finalizar, descargar

### 📦 Gestión de Inventario
- **Categorías jerárquicas** - N niveles de subcategorías (sin límite)
- **Productos CRUD completo** - Stock por estado (new, used, open_box)
- **Atributos dinámicos** - Personalizables por producto (color, tamaño, etc)
- **Stock consolidado** - Vista unificada de inventario

### 💰 Ventas y Ganancias
- **Ventas CRUD** - Con cliente, teléfono, email, fecha
- **OCR integrado** - Extrae números de serie automáticamente
- **Garantías automáticas** - Se crean al registrar venta
- **Profit tracking automático** - Calcula margen y rentabilidad

### 🛒 Compras y Proveedores
- **Compras CRUD** - Con proveedor, factura, costos
- **Profit por compra** - Ganancias potenciales por item
- **Gestión de proveedores** - CRUD completo
- **Análisis de rentabilidad** - Por compra y período

### 🛡️ Garantías y Servicio Técnico
- **Sistema de garantías** - Automático desde ventas
- **Servicio técnico completo** - Registro de reparaciones
- **Historial de servicios** - Seguimiento de intervenciones
- **Expiración automática** - Control de fechas

### 📊 Reportes Avanzados
- **Costo vs Ingresos** - Análisis de ganancia por período
- **Análisis de profit** - Detalle por compra y producto
- **Estadísticas** - Ventas, compras, invoices
- **Exportación** - Excel y PDF

### 🔐 Multi-tenant y Seguridad
- **Aislamiento por empresa** - Cada empresa ve solo sus datos
- **RBAC (4 roles)** - owner, admin, seller, inventory
- **JWT + Bcrypt** - Autenticación segura
- **Rate limiting** - Protección contra abuso
- **Validación Zod** - Esquemas de entrada  

---

## 🔧 Stack Tecnológico - Completo

| Componente | Tecnología | Versión | Propósito |
|------------|-----------|---------|----------|
| Runtime | Node.js | 20+ | Motor de ejecución |
| Framework | Express.js | 4.19+ | Servidor REST API |
| Base de Datos | PostgreSQL | 14+ | RDBMS |
| Hosting BD | Supabase | Cloud | PostgreSQL en nube |
| Autenticación | JWT + Bcrypt | 9.0.2 | Seguridad |
| Validación | Zod | 3.23.8 | Validar esquemas |
| Logging | Winston | 3.15.0 | Logs estructurados |
| OCR | Tesseract.js | 5.1.1 | Extracción de texto |
| PDF Generation | jsPDF + autoTable | 3.0.3 | Invoices PDF |
| Excel Export | ExcelJS | 4.4.0 | Reportes |
| Almacenamiento | Cloudinary | API | CDN + archivos |
| Rate Limiting | express-rate-limit | 7.4.1 | Protección |
| HTTP Security | Helmet | 8.0.0 | Headers seguros |
| CORS | cors | 2.8.5 | Control origen |
| Imágenes | Sharp | 0.34.4 | Procesamiento |
| Tareas | node-cron | 3.0.3 | Scheduling |
| Multer | Multer | 2.0 RC4 | Upload archivos |

---

## 📦 Módulos y Controladores Implementados

| Módulo | Controller | Funcionalidades |
|--------|-----------|-----------------|
| **Autenticación** | AuthController | Register, Login, Refresh, Logout, ChangePassword |
| **Usuarios** | UserController | Profile, Companies, Switch Company, Búsqueda |
| **Empresas** | CompanyController | CRUD, Members, Roles, Logo, Datos fiscales |
| **Invitaciones** | InvitationController | Crear, Validar, Aceptar código invitación |
| **Categorías** | CategoryController | CRUD jerárquico, Árbol de categorías |
| **Productos** | ProductController | CRUD, Stock, Búsqueda, Filtros |
| **Atributos** | ProductAttributeController | Crear, Actualizar, Eliminar atributos |
| **Compras** | PurchaseController | CRUD, Profit automático, Estadísticas |
| **Ventas** | SaleController | CRUD, OCR, Garantías automáticas |
| **Invoices** | InvoiceController | Crear, Generar PDF, Finalizar, Cambiar estado |
| **Garantías** | WarrantyController | CRUD, Expiración, Búsqueda |
| **Servicio Técnico** | ServiceHistoryController | Registro, Historial, Búsqueda |
| **Proveedores** | SupplierController | CRUD, Búsqueda |
| **Reportes** | ReportController | Costo vs Ingresos, Profit, Estadísticas |

---

## 🔐 Seguridad

- **JWT:** Access (15 min) + Refresh (7 días)
- **Bcrypt:** 12 salt rounds
- **Multi-tenant:** Aislamiento automático por `company_id`
- **RBAC:** Verificación de roles granular
- **SQL:** Prepared statements + Zod validation
- **CORS:** Configuración restrictiva
- **Rate Limiting:** 100 req/15min por IP

---

## 📊 Endpoints Principales

```
POST   /auth/register, /auth/login, /auth/refresh, /auth/change-password
GET    /users/profile, /users/companies | POST /users/switch-company/:id

GET    /products, /products/:id, /products/stock/complete | POST/PUT/DELETE
GET    /categories, /categories/tree | POST/PUT/DELETE products attributes

POST   /purchases (con profit automático) | GET statistics
POST   /sales (con OCR) | GET statistics

POST   /invoices, /invoices/:id/line-items | GET /invoices/statistics
POST   /invoices/:id/generate-pdf | PATCH /invoices/:id/finalize
```

**Completo:** [API_REFERENCE.md](docs/API_REFERENCE.md)

---

## 💾 Base de Datos - Modelo Completo

**18+ tablas principales:**
- `users` - Autenticación y perfiles
- `companies` - Datos de empresas multi-tenant
- `user_company` - Relación users-companies (aislamiento)
- `categories` - Jerárquicas con parent_id
- `products` - Inventario completo
- `product_attributes` - Atributos dinámicos
- `product_stock` - Stock por estado (new, used, open_box)
- `suppliers` - Proveedores
- `purchases` - Compras con profit tracking
- `purchase_items` - Items de compras
- `sales` - Ventas de clientes
- `sale_items` - Items de ventas con seriales OCR
- `invoices` - Invoices/Recibos
- `invoice_line_items` - Items de invoices
- `warranties` - Garantías automáticas
- `service_histories` - Historial de servicio técnico
- `invitations` - Códigos de invitación
- `refresh_tokens` - Tokens revocables

**Características:**
- ✅ Row Level Security (RLS) - Aislamiento por empresa
- ✅ Índices optimizados - En campos de búsqueda
- ✅ Foreign Keys - Integridad referencial
- ✅ Triggers - Auditoría automática
- ✅ Vistas - Para reportes complejos
- category_hierarchy, products_with_attributes
- purchase_profit_analysis, monthly_purchase_profit_summary
- invoices_with_details, invoice_line_items_detail

**Triggers automáticos:** Profit calculation, PDF updates, timestamps

---

## 📈 Cálculos Principales

### Profit en Compras
```
cost_amount = cost_per_unit × quantity
sell_amount = sell_price_per_unit × quantity
profit_amount = sell_amount - cost_amount
profit_margin_percent = (profit_amount / sell_amount) × 100
```

### Invoice Totals
```
tax_amount = subtotal × (tax_percentage / 100)
total = subtotal + tax + additional_items - discount
```

---

## 🔄 Flujos Principales

### 1. Registro y Empresa
Usuario → Register → BD (user + company + user_company) → JWT tokens

### 2. Venta con OCR
Venta + Imagen → OCR (serial) → Cloudinary (imagen) → BD → Garantía automática

### 3. Invoice desde Venta
Venta → Create Invoice → Agregar items flexibles → PDF → Cloudinary → Finalizar

### 4. Profit en Compra
Compra creada → Trigger → Calcula profit automático → Disponible en reportes

---

## 🐛 Troubleshooting

**Error: "Cannot find module"**
```bash
npm install
npm run dev
```

**Error: "Database connection failed"**
- Verifica DATABASE_URL en .env
- Supabase URL debe ser `postgresql://`
- Reinicia servidor

**Error: "Cloudinary not initialized"**
- Verifica CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET
- Están en Supabase project settings

**PDF generation failed**
- Verifica credenciales Cloudinary
- Revisa logs del servidor

---

## 🚀 Deployment

**Producción recomendada:** Railway, Render, Heroku

```bash
# Railway (recomendado)
npm install -g @railway/cli
railway link
railway up

# Variables de entorno: Copiar desde .env
```

**Verifica post-deployment:**
1. Health check: `GET /health`
2. Login: `POST /auth/login`
3. Productos: `GET /products`

---

## 📚 Recursos Adicionales

**Para análisis de arquitectura:** → [UML_ANALYSIS.md](docs/UML_ANALYSIS.md)  
**Para endpoints específicos:** → [API_REFERENCE.md](docs/API_REFERENCE.md)  
**Para arquitectura técnica:** → [ARCHITECTURE.md](docs/ARCHITECTURE.md)  
**Para despliegue:** → [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE_v1.3.0.md)  

---

## 📋 Roadmap Implementado

✅ v1.0.0 - Auth, Usuarios, Empresas, Invitaciones  
✅ v1.1.0 - Categorías jerárquicas, Atributos dinámicos  
✅ v1.2.0 - Compras con profit, Ventas con OCR, Reportes  
✅ v1.3.0 - Invoices PDF, Items flexibles, Numeración automática  

---

## 📧 Soporte

Contacta al equipo de Stockly para:
- Issues en desarrollo
- Preguntas de arquitectura
- Soporte en deployment

**Versión:** 1.3.0 | **Última actualización:** Oct 22, 2025

