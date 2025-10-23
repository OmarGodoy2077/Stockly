# 📊 Análisis UML - Stockly Backend v1.3.0

**Última Actualización:** 22 de Octubre, 2025  
**Propósito:** Referencia completa para arquitectura, modelos de datos, flujos y diagramas

---

## 📑 Tabla de Contenidos

1. [Diagrama ER - Modelo de Datos](#diagrama-er---modelo-de-datos)
2. [Diagrama de Clases](#diagrama-de-clases)
3. [Diagrama de Secuencia - Flujos Principales](#diagrama-de-secuencia---flujos-principales)
4. [Diagrama de Casos de Uso](#diagrama-de-casos-de-uso)
5. [Diagrama de Componentes](#diagrama-de-componentes)
6. [Relaciones entre Entidades](#relaciones-entre-entidades)
7. [Flujos de Autenticación](#flujos-de-autenticación)
8. [Estado de Transacciones](#estado-de-transacciones)

---

## 🗂️ Diagrama ER - Modelo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    STOCKLY DATABASE v1.3.0                       │
│                   Multi-Tenant Architecture                      │
└─────────────────────────────────────────────────────────────────┘

                          ┌──────────────┐
                          │    USERS     │
                          │──────────────│
                          │ id (PK)      │
                          │ email        │
                          │ password     │
                          │ name         │
                          │ phone        │
                          │ created_at   │
                          └──────┬───────┘
                                 │
                          N:M Relationship
                                 │
                    ┌────────────┴────────────┐
                    │                         │
          ┌─────────▼────────┐      ┌────────▼──────────┐
          │ USER_COMPANY     │      │   COMPANIES      │
          │──────────────────│      │──────────────────│
          │ id (PK)          │      │ id (PK)          │
          │ user_id (FK)     │      │ name             │
          │ company_id (FK)  │      │ ruc              │
          │ role             │      │ address          │
          │ created_at       │      │ email            │
          └──────────────────┘      │ phone            │
                                    │ created_at       │
                                    └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
        ┌───────────▼──────────┐  ┌─────────▼────────┐  ┌───────────▼──────────┐
        │   CATEGORIES         │  │    PRODUCTS      │  │   INVITATIONS        │
        │──────────────────────│  │──────────────────│  │───────────────────────│
        │ id (PK)              │  │ id (PK)          │  │ id (PK)               │
        │ company_id (FK)      │  │ company_id (FK)  │  │ company_id (FK)       │
        │ name                 │  │ category_id (FK) │  │ code (UNIQUE)         │
        │ parent_id (FK)       │  │ sku              │  │ role                  │
        │ description          │  │ name             │  │ created_by (FK)       │
        │ is_active            │  │ description      │  │ expires_at            │
        │ created_at           │  │ price            │  │ used                  │
        └──────────────────────┘  │ stock            │  │ created_at            │
                                   │ condition        │  └───────────────────────┘
                                   │ created_at       │
                                   └────────┬─────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
        ┌───────────▼─────────┐  ┌─────────▼──────────┐ ┌──────────▼─────────┐
        │  PRODUCT_ATTRIBUTES │  │      SALES         │ │  INVOICES          │
        │──────────────────────│  │────────────────────│ │────────────────────│
        │ id (PK)              │  │ id (PK)            │ │ id (PK)            │
        │ product_id (FK)      │  │ company_id (FK)    │ │ company_id (FK)    │
        │ attribute_name       │  │ user_id (FK)       │ │ sale_id (FK)       │
        │ attribute_value      │  │ customer_name      │ │ invoice_number     │
        │ created_at           │  │ customer_email     │ │ invoice_date       │
        └──────────────────────┘  │ serial_number      │ │ customer_name      │
                                   │ serial_image_url   │ │ subtotal           │
                                   │ total              │ │ tax_amount         │
                                   │ warranty_months    │ │ total_amount       │
                                   │ payment_method     │ │ payment_status     │
                                   │ is_paid            │ │ is_draft           │
                                   │ created_at         │ │ created_at         │
                                   └────────┬───────────┘ └────────┬───────────┘
                                            │                      │
                            ┌───────────────┴──────────────┐        │
                            │                              │        │
                ┌───────────▼──────────┐    ┌────────────▼─────────────┐
                │    WARRANTIES        │    │ INVOICE_LINE_ITEMS       │
                │──────────────────────│    │──────────────────────────│
                │ id (PK)              │    │ id (PK)                  │
                │ sale_id (FK)         │    │ invoice_id (FK)          │
                │ serial_number        │    │ company_id (FK)          │
                │ expires_at           │    │ product_id (FK) NULLABLE │
                │ is_active            │    │ item_type                │
                │ created_at           │    │ item_name                │
                └──────────────────────┘    │ quantity                 │
                            │                │ unit_price               │
                ┌───────────▼──────────┐    │ line_total               │
                │ SERVICE_HISTORIES    │    │ is_taxable               │
                │──────────────────────│    │ line_order               │
                │ id (PK)              │    │ created_at               │
                │ warranty_id (FK)     │    └──────────────────────────┘
                │ serial_number        │
                │ status               │ ┌───────────────────────┐
                │ reason               │ │      PURCHASES        │
                │ photos_url           │ │───────────────────────│
                │ entry_date           │ │ id (PK)               │
                │ entry_time           │ │ company_id (FK)       │
                │ created_at           │ │ supplier              │
                └──────────────────────┘ │ cost_amount           │
                                         │ sell_amount           │
                                         │ profit_amount         │
                                         │ profit_margin_percent │
                                         │ created_at            │
                                         └───────────────────────┘

CONVENCIONES:
  (PK) = Primary Key
  (FK) = Foreign Key
  UNIQUE = Restricción única
  N:M = Relación muchos a muchos
```

---

## 🏛️ Diagrama de Clases

```
┌─────────────────────────────────────────────────────────────────┐
│                      ESTRUCTURAS PRINCIPALES                     │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐
│      AuthController        │
├────────────────────────────┤
│ - register()               │
│ - login()                  │
│ - refresh()                │
│ - logout()                 │
│ - changePassword()         │
│ - validateToken()          │
└────────────┬───────────────┘
             │
             ├──▶ AuthMiddleware
             │    - authenticate()
             │    - authorize()
             │    - validateRole()
             │
             └──▶ AuthModel
                  - createUser()
                  - findByEmail()
                  - updatePassword()

┌────────────────────────────┐
│    ProductController       │
├────────────────────────────┤
│ - create()                 │
│ - getAll()                 │
│ - getById()                │
│ - update()                 │
│ - delete()                 │
│ - getCompleteStock()       │
└────────────┬───────────────┘
             │
             ├──▶ ProductModel
             │    - create()
             │    - findById()
             │    - findByCompanyId()
             │    - update()
             │    - delete()
             │    - updateStock()
             │
             └──▶ ProductAttributeController
                  - addAttribute()
                  - getAttributes()
                  - updateAttribute()
                  - deleteAttribute()

┌────────────────────────────┐
│    SaleController          │
├────────────────────────────┤
│ - create()                 │
│ - getAll()                 │
│ - getById()                │
│ - update()                 │
│ - delete()                 │
│ - getStatistics()          │
└────────────┬───────────────┘
             │
             ├──▶ SaleModel
             │    - create()
             │    - findById()
             │    - getByCompanyId()
             │
             ├──▶ WarrantyModel
             │    - createWarranty()
             │    - updateWarranty()
             │
             └──▶ TesseractOCR
                  - extractSerialNumber()

┌────────────────────────────┐
│   InvoiceController        │
├────────────────────────────┤
│ - create()                 │
│ - getAll()                 │
│ - getById()                │
│ - addLineItem()            │
│ - generatePdf()            │
│ - finalize()               │
│ - getStatistics()          │
└────────────┬───────────────┘
             │
             ├──▶ InvoiceModel
             │    - create()
             │    - generateInvoiceNumber()
             │    - addLineItem()
             │    - findById()
             │    - finalize()
             │
             └──▶ PDFGenerator
                  - generatePdf()
                  - uploadToCloudinary()

┌────────────────────────────┐
│  PurchaseController        │
├────────────────────────────┤
│ - create()                 │
│ - getAll()                 │
│ - getById()                │
│ - update()                 │
│ - delete()                 │
│ - getStatistics()          │
└────────────┬───────────────┘
             │
             └──▶ PurchaseModel
                  - create()
                  - calculateProfit()
                  - getAnalysis()

┌────────────────────────────┐
│   ReportController         │
├────────────────────────────┤
│ - getCostVsRevenue()       │
│ - generateSalesReport()    │
│ - generatePurchaseReport() │
│ - getStatistics()          │
└────────────┬───────────────┘
             │
             └──▶ ReportModel
                  - queryCostVsRevenue()
                  - querySalesData()
                  - queryPurchaseData()
```

---

## 🔄 Diagrama de Secuencia - Flujos Principales

### Flujo 1: Registro de Usuario y Creación de Empresa

```
┌─────────┐    ┌────────────┐    ┌───────────┐    ┌──────────────┐
│ Cliente │    │ Frontend   │    │ Backend   │    │ Base de Datos│
└────┬────┘    └─────┬──────┘    └─────┬─────┘    └──────┬───────┘
     │                │                 │                  │
     │─ Completa      │                 │                  │
     │  formulario ──▶│                 │                  │
     │                │                 │                  │
     │                │─ POST /register▶│                  │
     │                │ {email,password,│                  │
     │                │  company_data}  │                  │
     │                │                 │                  │
     │                │                 │─ Validar datos ─▶│
     │                │                 │                  │
     │                │                 │◀─ ✅ Valid       │
     │                │                 │                  │
     │                │                 │─ CREATE user ───▶│
     │                │                 │ CREATE company   │
     │                │                 │ CREATE user_co.  │
     │                │                 │                  │
     │                │                 │◀─ user_id, co_id │
     │                │                 │                  │
     │                │                 │─ Generate JWT ──▶│
     │                │                 │                  │
     │                │◀─ 201 Created   │                  │
     │                │ {access_token,  │                  │
     │                │  refresh_token} │                  │
     │                │                 │                  │
     │◀─ ✅ Registro │                 │                  │
     │  exitoso       │                 │                  │
```

### Flujo 2: Creación de Venta con OCR

```
┌─────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│ Vendedor│    │ Backend    │    │ Tesseract    │    │  Cloudinary  │    │ Base Datos  │
└────┬────┘    └─────┬──────┘    └──────┬───────┘    └──────┬───────┘    └──────┬──────┘
     │                │                  │                   │                    │
     │─ Venta + ──────▶│                  │                   │                    │
     │  Imagen         │                  │                   │                    │
     │                 │──────────────────▶ Extraer          │                    │
     │                 │   serial_image   │ serie (OCR)      │                    │
     │                 │                  │                   │                    │
     │                 │◀─ serie_number ──│                   │                    │
     │                 │                  │                   │                    │
     │                 │─ Subir imagen ───────────────────────▶                    │
     │                 │                  │                   │                    │
     │                 │◀─ image_url ─────────────────────────│                    │
     │                 │                  │                   │                    │
     │                 │─ Guardar venta ──────────────────────────────────────────▶│
     │                 │ {serial_number,  │                   │                    │
     │                 │  serial_image_url}                   │                    │
     │                 │                  │                   │                    │
     │                 │◀─ sale_id ───────────────────────────────────────────────│
     │                 │                  │                   │                    │
     │                 │─ Crear warranty ─────────────────────────────────────────▶│
     │                 │                  │                   │                    │
     │                 │◀─ 201 Created ───│                   │                    │
     │◀─ ✅ Venta     │                  │                   │                    │
     │  creada        │                  │                   │                    │
```

### Flujo 3: Generación de Invoice desde Venta

```
┌────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│Usuario │    │ Backend      │    │ Base Datos  │    │   jsPDF      │    │ Cloudinary  │
└───┬────┘    └──────┬───────┘    └──────┬──────┘    └──────┬───────┘    └──────┬──────┘
    │                │                   │                  │                    │
    │─ Crear Invoice─▶│                   │                  │                    │
    │ {sale_id,      │                   │                  │                    │
    │  company_data} │                   │                  │                    │
    │                │                   │                  │                    │
    │                │─ Generar # ───────▶│                  │                    │
    │                │ INV-2025-00001     │                  │                    │
    │                │                   │                  │                    │
    │                │◀─ invoice_number ─│                  │                    │
    │                │                   │                  │                    │
    │                │─ Guardar invoice ─▶│                  │                    │
    │                │                   │                  │                    │
    │                │◀─ invoice_id ─────│                  │                    │
    │                │                   │                  │                    │
    │─ Agregar ──────▶│                   │                  │                    │
    │  items extra   │─ Guardar items ───▶│                  │                    │
    │  (shipping)    │                   │                  │                    │
    │                │◀─ line_items ─────│                  │                    │
    │                │                   │                  │                    │
    │─ Generar PDF──▶│                   │                  │                    │
    │                │─ Compilar datos ─▶│ Generar PDF     │                    │
    │                │                   │◀─────────────────▶                    │
    │                │                   │                  │                    │
    │                │                   │                  │─ Subir PDF ───────▶│
    │                │                   │                  │                    │
    │                │◀─ pdf_url ────────────────────────────────────────────────│
    │                │                   │                  │                    │
    │◀─ 201 Created ─│                   │                  │                    │
    │  {invoice_id,  │                   │                  │                    │
    │   pdf_url}     │                   │                  │                    │
```

---

## 👥 Diagrama de Casos de Uso

```
                            ┌──────────────────────────┐
                            │    Stakeholders          │
                            └──────────────────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
        ┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
        │  ADMIN/OWNER   │   │   SELLER       │   │  INVENTORY MGR  │
        └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                 │                     │                     │
                 │◀────────────────────┴─────────────────────│
                 │
         ┌───────┴─────────────────────────────┐
         │     STOCKLY SYSTEM v1.3.0           │
         └───────┬─────────────────────────────┘
                 │
    ┌────────────┼────────────┬──────────────┬────────────────┐
    │            │            │              │                │
┌───▼────┐  ┌───▼────┐  ┌────▼────┐  ┌─────▼──┐  ┌───────────▼─┐
│Gestión │  │Gestión │  │Gestión  │  │Gestión │  │  Generar   │
│de      │  │de      │  │de       │  │de      │  │  Invoice   │
│Usuarios│  │Productos│  │Compras  │  │Ventas  │  │  PDF       │
└────────┘  └────────┘  └─────────┘  └────────┘  └────────────┘
    │           │            │           │             │
    │           │            │           │             │
┌───▼────┐  ┌───▼────┐  ┌────▼────┐  ┌─────▼──┐  ┌───────────▼─┐
│Register│  │CRUD    │  │Registrar│  │ CRUD   │  │Almacenar   │
│        │  │Categorías│ │Compra   │  │Venta   │  │en Cloud    │
│Login   │  │Crear   │  │Calcular │  │OCR     │  │            │
│        │  │Atributos│ │Profit   │  │Serial  │  │Descargar   │
└────────┘  └────────┘  └─────────┘  └────────┘  └────────────┘
    │           │            │           │             │
    └───────────┼────────────┼───────────┼─────────────┘
                │
        ┌───────▼────────┐
        │  Base Datos    │
        │   PostgreSQL   │
        │  (Supabase)    │
        └────────────────┘
```

---

## 🔌 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        STOCKLY ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React/TypeScript)                │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│ │  Dashboard │ │ Inventario │ │   Ventas   │ │   Reportes   │  │
│ └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
└──────────────────┬───────────────────────────────────────────────┘
                   │ HTTP/REST API
┌──────────────────▼───────────────────────────────────────────────┐
│                    BACKEND (Express.js)                          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                    REQUEST PIPELINE                         │ │
│ │  Request ─▶ Logger ─▶ Auth ─▶ Validation ─▶ Controller    │ │
│ │                                                   ▼         │ │
│ │                                             Business Logic  │ │
│ │                                                   ▼         │ │
│ │  Response ◀─ Error Handler ◀─ Model/Services ◀─▬         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐   │
│ │ Auth        │ │ Product  │ │ Sale       │ │ Invoice      │   │
│ │ Controller  │ │ Controller│ │Controller  │ │ Controller   │   │
│ └─────────────┘ └──────────┘ └────────────┘ └──────────────┘   │
│ ┌─────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐   │
│ │ Purchase    │ │ Category │ │ Company    │ │ Report       │   │
│ │ Controller  │ │ Controller│ │Controller  │ │ Controller   │   │
│ └─────────────┘ └──────────┘ └────────────┘ └──────────────┘   │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       │              │              │              │
┌──────▼──┐    ┌──────▼──┐    ┌─────▼───┐    ┌────▼────┐
│Tesseract│    │ jsPDF   │    │Winston  │    │ Zod     │
│  (OCR)  │    │ (PDF)   │    │(Logging)│    │(Validation)
└──────┬──┘    └──────┬──┘    └────┬────┘    └────┬────┘
       │              │             │             │
       └──────────────┼─────────────┼─────────────┘
                      │             │
       ┌──────────────┼─────────────┼───────────────────┐
       │              │             │                   │
┌──────▼──────┐ ┌─────▼────┐ ┌─────▼─────┐ ┌──────────▼──┐
│ Cloudinary  │ │PostgreSQL│ │ Environment│ │  Helmet    │
│(File Store) │ │(Database)│ │ (Config)   │ │ (Security) │
└─────────────┘ └──────────┘ └────────────┘ └────────────┘
```

---

## 🔗 Relaciones entre Entidades

### Relación 1: Usuario ↔ Empresa (N:M)

```
Un usuario puede pertenecer a múltiples empresas
Una empresa puede tener múltiples usuarios

┌────────────┐      ┌──────────────────┐      ┌────────────┐
│   USER     │ ────▶│  USER_COMPANY    │ ◀──── │ COMPANY    │
│────────────│   1:M│──────────────────│ M:1   │────────────│
│ id (PK)    │      │ user_id (FK)     │       │ id (PK)    │
│ email      │      │ company_id (FK)  │       │ name       │
└────────────┘      │ role             │       └────────────┘
                    │ created_at       │
                    └──────────────────┘

ROLES DISPONIBLES:
- owner: Propietario de empresa (máximo 1 por empresa)
- admin: Administrador con todos los permisos
- seller: Solo puede crear ventas
- inventory: Solo puede ver/actualizar inventario
```

### Relación 2: Producto ↔ Atributo (1:N)

```
Un producto puede tener múltiples atributos
Un atributo pertenece a un único producto

┌────────────┐        ┌──────────────────────┐
│  PRODUCT   │ ──────▶│ PRODUCT_ATTRIBUTE    │
│────────────│ 1:N    │──────────────────────│
│ id (PK)    │        │ id (PK)              │
│ name       │        │ product_id (FK)      │
│ sku        │        │ attribute_name       │
└────────────┘        │ attribute_value      │
                      └──────────────────────┘

EJEMPLO:
Producto: Samsung 65" Smart TV
  ├─ Resolución: 4K
  ├─ Panel: QLED
  ├─ Frecuencia: 120Hz
  └─ Puertos: HDMI x3, USB x2
```

### Relación 3: Venta ↔ Invoice (1:1 o 1:N)

```
Una venta puede generar múltiples invoices
Un invoice pertenece a una única venta

┌──────────┐        ┌──────────────┐
│  SALE    │ ──────▶│  INVOICE     │
│──────────│ 1:N    │──────────────│
│ id (PK)  │        │ id (PK)      │
│ customer │        │ sale_id (FK) │
│ total    │        │ invoice_#    │
└──────────┘        │ total_amount │
                    └──────────────┘

CASO DE USO:
- Una venta puede generar invoice inicial
- Se pueden agregar líneas adicionales (envío, impuestos, descuentos)
- Un invoice se puede separar en múltiples (si es muy grande)
```

### Relación 4: Invoice ↔ LineItem (1:N)

```
Un invoice tiene múltiples líneas de items
Un item pertenece a un único invoice

┌──────────────┐        ┌─────────────────────┐
│  INVOICE     │ ──────▶│ INVOICE_LINE_ITEM   │
│──────────────│ 1:N    │─────────────────────│
│ id (PK)      │        │ id (PK)             │
│ invoice_#    │        │ invoice_id (FK)     │
│ subtotal     │        │ item_type           │
│ tax_amount   │        │ unit_price          │
│ total_amount │        │ quantity            │
└──────────────┘        │ line_total          │
                        └─────────────────────┘

TIPOS DE ITEMS:
- product: Producto del catálogo
- shipping: Costo de envío
- commission: Comisión de venta
- discount: Descuento aplicado
- other: Otros cargos
```

---

## 🔐 Flujos de Autenticación

### Flujo JWT - Access & Refresh Tokens

```
REGISTRO
┌────────────────────────────────────┐
│ 1. Cliente envía credenciales      │
│    {email, password, company_data} │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 2. Backend valida y hashea pwd     │
│    Crea usuario en BD              │
│    Genera tokens JWT               │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 3. Retorna tokens al cliente       │
│    ├─ access_token (15 min)        │
│    └─ refresh_token (7 días)       │
└────────────────────────────────────┘


LOGIN
┌────────────────────────────────────┐
│ 1. Cliente envía credenciales      │
│    {email, password}               │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 2. Backend valida credenciales     │
│    Compara password con bcrypt     │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 3. Retorna tokens JWT              │
└────────────────────────────────────┘


REFRESH TOKEN
┌────────────────────────────────────┐
│ 1. Access token expirado           │
│    Cliente envía refresh_token     │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 2. Backend valida refresh_token    │
│    Genera nuevo access_token       │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 3. Retorna nuevo access_token      │
└────────────────────────────────────┘

JWT PAYLOAD
{
  "user_id": "uuid",
  "email": "user@example.com",
  "company_id": "uuid",
  "role": "admin",
  "exp": 1729631234,
  "iat": 1729630934
}
```

---

## 📊 Estado de Transacciones

### Estados de Venta

```
┌─────────┐
│ DRAFT   │ (Inicial - Borrador)
└────┬────┘
     │
     ▼
┌──────────────┐
│ COMPLETED    │ (Venta finalizada)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ INVOICED     │ (Se generó invoice)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ DELIVERED    │ (Entregado al cliente)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ CANCELLED    │ (Cancelada)
└──────────────┘
```

### Estados de Invoice

```
┌───────┐
│ DRAFT │ (Editable - sin finalizar)
└───┬───┘
    │ finalize()
    ▼
┌──────────┐
│ PENDING  │ (Finalizado, sin pagar)
└───┬──────┘
    │ markAsPaid()
    ▼
┌─────────┐
│ PAID    │ (Pagado)
└─────────┘

    │ (desde DRAFT o PENDING)
    │ cancel()
    ▼
┌──────────┐
│CANCELLED │ (Anulado)
└──────────┘
```

### Estados de Garantía

```
┌─────────┐
│ ACTIVE  │ (Vigente)
└────┬────┘
     │ (si se solicita reparación)
     ▼
┌───────────────┐
│ IN_SERVICE    │ (En servicio técnico)
└────┬──────────┘
     │ (cuando finaliza servicio)
     ▼
┌──────────────┐
│ COMPLETED    │ (Reparación completada)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ EXPIRED      │ (Expiró la garantía)
└──────────────┘
```

### Estados de Servicio Técnico

```
┌──────────┐
│ RECEIVED │ (Equipo recibido)
└────┬─────┘
     │
     ▼
┌──────────────┐
│ IN_REPAIR    │ (En reparación)
└────┬─────────┘
     │
     ▼
┌───────────┐
│ DELIVERED │ (Entregado reparado)
└───────────┘
```

---

## 📐 Métricas y Ratios

### Cálculos de Profit en Compras

```
Dado:
  - cost_per_unit = $50
  - sell_price_per_unit = $80
  - quantity = 100

Fórmulas:
  cost_amount = cost_per_unit × quantity
              = 50 × 100 = $5,000

  sell_amount = sell_price_per_unit × quantity
              = 80 × 100 = $8,000

  profit_amount = sell_amount - cost_amount
                = 8,000 - 5,000 = $3,000

  profit_margin_percent = (profit_amount / sell_amount) × 100
                        = (3,000 / 8,000) × 100
                        = 37.5%
```

### Cálculos de Impuestos en Invoice

```
Dado:
  - items_subtotal = $1,000
  - tax_percentage = 12% (IVA por defecto)
  - discount_amount = $50
  - additional_items_total = $100 (shipping)

Fórmula:
  tax_amount = items_subtotal × (tax_percentage / 100)
             = 1,000 × 0.12 = $120

  total_amount = subtotal + tax_amount + additional_items - discount
               = 1,000 + 120 + 100 - 50
               = $1,170
```

---

## 🔄 Ciclo de Vida de Entidades

### Ciclo de Producto

```
CREATE              UPDATE              DELETE
   │                  │                   │
   ▼                  ▼                   ▼
CREATED ◀─────────UPDATED───────────► SOFT_DELETE
   │                  │                   │
   │ (activo)         │ (editable)        │ (no visible)
   │                  │                   │
   └──────────────────┴───────────────────┘
        (múltiples veces)

IMPORTANTE:
- Los productos usan soft delete (is_active = false)
- Nunca se eliminan físicamente para mantener historial
- Los soft deleted no aparecen en listados
```

### Ciclo de Invoice

```
CREATE         ADD_ITEMS       GENERATE_PDF      FINALIZE
  │              │                 │                │
  ▼              ▼                 ▼                ▼
DRAFT ◀──────DRAFT────────────DRAFT──────────► PENDING
  │              │                 │                │
  │              │                 │                │
  │              │                 │ (pdf_url set)  │
  │              │                 │                │
  │              │                 │ markAsPaid()   │
  │              │                 │                ▼
  │              │                 │             PAID
  │              │                 │
  └──────────────┴────cancel()─────┘
                    │
                    ▼
                CANCELLED
```

---

## 📈 Roadmap de Versiones (Implementado)

### v1.0.0 - Core System
- ✅ Autenticación y autorizacion
- ✅ Gestión de usuarios y empresas
- ✅ CRUD básico de productos
- ✅ Sistema de invitaciones

### v1.1.0 - Product Management
- ✅ Categorías jerárquicas
- ✅ Atributos dinámicos
- ✅ Estados de producto (new, used, open_box)

### v1.2.0 - Sales & Analytics
- ✅ Gestión de compras con profit tracking
- ✅ Ventas con OCR
- ✅ Reportes de costo vs ingreso
- ✅ Stock consolidado

### v1.3.0 - Invoicing System (ACTUAL)
- ✅ Generación de invoices/recibos
- ✅ Numeración automática secuencial
- ✅ Items adicionales flexibles
- ✅ Generación de PDF profesional
- ✅ Almacenamiento en Cloudinary

---

## 🎯 Conclusión

Este análisis UML proporciona una visión completa de la arquitectura Stockly v1.3.0 para:

- **Desarrolladores**: Entender estructura de código y relaciones
- **Arquitectos**: Diseñar nuevas características
- **DevOps**: Planificar despliegues y migraciones
- **Testers**: Validar flujos y casos de uso
- **Product**: Documentar funcionalidades implementadas

Para más detalles técnicos, consulta:
- **API_REFERENCE.md** - Endpoints y ejemplos
- **ARCHITECTURE.md** - Stack tecnológico
- **DEPLOYMENT_GUIDE.md** - Despliegue a producción

