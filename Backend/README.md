# 📚 Stockly Backend v1.3.0

**Última Actualización:** 22 de Octubre, 2025  
**Estado:** ✅ Listo para Producción  
**Node.js:** 20+ | **Express:** 4.19+ | **PostgreSQL:** 14+ (Supabase)

---

## 🎯 Descripción del Proyecto

Stockly es un **SaaS multi-tenant** para gestión integral de inventario, ventas, recibos y servicio técnico. Diseñado para emprendedores en LATAM.

**Características:** ✅ Multi-tenant | ✅ Categorías jerárquicas | ✅ Atributos dinámicos | ✅ OCR para seriales | ✅ Invoices PDF | ✅ Profit tracking | ✅ Garantías

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

### ⭐ Invoices/Recibos (NUEVO)
- ✅ Generación de PDFs profesionales con logo empresa
- ✅ Numeración automática secuencial (INV-2025-00001)
- ✅ Items flexibles: productos, envío, comisiones, descuentos
- ✅ Cálculo automático de impuestos (IVA 12%)
- ✅ Almacenamiento en Cloudinary
- ✅ Estados: Draft → Pending → Paid/Cancelled

### Características Existentes
- **Categorías jerárquicas** - N niveles de subcategorías  
- **Atributos dinámicos** - Personalizados por producto  
- **OCR para seriales** - Extracción automática Tesseract  
- **Profit tracking** - Análisis de rentabilidad en compras  
- **Sistema de garantías** - Automático desde ventas  
- **Multi-tenant** - Aislamiento por empresa  
- **RBAC** - 4 roles: owner, admin, seller, inventory  

---

## 🔧 Stack Tecnológico

| Componente | Tecnología | 
|------------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.19+ |
| BD | PostgreSQL 14+ (Supabase) |
| Auth | JWT + Bcrypt |
| Validación | Zod 3+ |
| Logging | Winston 3+ |
| OCR | Tesseract.js 5+ |
| PDF | jsPDF 3.0.3 + jsPDF-autoTable 5.0.2 |
| Archivos | Cloudinary |
| Rate Limit | express-rate-limit 7.4.1 |

---

## 📦 Módulos Completos

| Módulo | Endpoints |
|--------|-----------|
| **Auth** | Register, Login, Refresh, Change Password |
| **Usuarios** | Profile, Companies, Switch Company |
| **Empresas** | CRUD, Miembros, Roles, Invitaciones |
| **Productos** | CRUD, Stock Completo, Categorías, Atributos |
| **Compras** | CRUD, Profit Automático, Estadísticas |
| **Ventas** | CRUD, OCR, Garantías Automáticas |
| **Invoices** | CRUD, PDF, Items Flexibles, Estadísticas |
| **Garantías** | Automáticas desde Ventas, Servicio Técnico |
| **Reportes** | Costo vs Ingreso, Estadísticas |

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

## 💾 Base de Datos

**18 tablas principales:**
- users, companies, user_company (multi-tenant)
- products, categories, product_attributes (inventario)
- sales, invoices, invoice_line_items (ventas)
- warranties, service_histories (garantías)
- purchases (compras con profit tracking)
- suppliers, invitations

**Vistas materializadas:**
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

