# 🎨 Stockly Frontend v1.3.0

**Última Actualización:** 23 de Octubre, 2025  
**Estado:** ✅ Listo para Producción  
**React:** 19.1+ | **TypeScript:** 5.6+ | **Vite:** 5.4+ | **TailwindCSS:** 4.1+

---

## 🎯 Descripción del Proyecto

Frontend moderno para **Stockly**, SaaS multi-tenant completo de gestión de inventario, ventas, invoices y servicio técnico. Interfaz responsiva y optimizada.

**Stack Frontend Completo:** ✅ React 19 + TypeScript | ✅ Vite 5.4 | ✅ TailwindCSS 4.1 | ✅ Axios | ✅ React Router v7 | ✅ Redux Toolkit | ✅ React Query | ✅ Zod Validation

**Características:** ✅ Dashboard completo | ✅ Gestión inventario | ✅ Ventas con OCR | ✅ Invoices PDF | ✅ Reportes | ✅ Garantías | ✅ Multi-empresa

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar
cd Frontend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar: VITE_API_BASE_URL=http://localhost:3001/api/v1

# 3. Iniciar servidor de desarrollo
npm run dev

# ✅ Frontend en http://localhost:5173
```

---

## 📖 Documentación

| Documento | Propósito |
|-----------|-----------|
| **[Backend README](../Backend/README.md)** | Estado completo del backend v1.3.0 |
| **[API_REFERENCE](../Backend/docs/API_REFERENCE.md)** | Todos los endpoints disponibles |
| **[UML_ANALYSIS](../Backend/docs/UML_ANALYSIS.md)** | Diagramas ER, flujos, casos de uso |
| **[ARCHITECTURE](../Backend/docs/ARCHITECTURE.md)** | Stack técnico y arquitectura |
| **[DEPLOYMENT](../Backend/docs/DEPLOYMENT_GUIDE.md)** | Despliegue a producción |

---

## 🌟 Características Implementadas v1.3.0

### 🔐 Autenticación y Multi-empresa
- ✅ **Registro e Login con JWT** - Seguridad nivel enterprise
- ✅ **Multi-empresa** - Un usuario en múltiples empresas
- ✅ **Switch de empresa** - Cambiar contexto al instante
- ✅ **RBAC (4 roles)** - owner, admin, seller, inventory
- ✅ **Gestión de usuarios** - Por empresa con invitaciones
- ✅ **Cambio de contraseña** - Seguro y validado

### 📦 Gestión de Inventario
- ✅ **Categorías jerárquicas** - N niveles sin límite
- ✅ **Productos CRUD** - Con precios compra/venta
- ✅ **Atributos dinámicos** - Personalizables por producto
- ✅ **Stock por estado** - new, used, open_box
- ✅ **Búsqueda avanzada** - Por nombre, SKU, categoría
- ✅ **Stock consolidado** - Vista total por producto

### 💰 Ventas Completas
- ✅ **CRUD de Ventas** - Cliente, teléfono, email, fecha
- ✅ **OCR integrado** - Extrae seriales de imágenes
- ✅ **Garantías automáticas** - Se crean al vender
- ✅ **Estadísticas** - Ventas por período, ticket promedio
- ✅ **Comprobantes** - Descarga de PDFs
- ✅ **Historial** - Búsqueda por cliente, fecha

### 🛒 Compras y Proveedores
- ✅ **Compras CRUD** - Proveedor, factura, costos
- ✅ **Profit automático** - Calcula margen por item
- ✅ **Proveedores** - CRUD con contacto
- ✅ **Análisis rentabilidad** - Margen por producto
- ✅ **Estadísticas** - Gasto por período
- ✅ **Historial** - Por proveedor y fecha

### 📄 Invoices/Recibos - Profesionales
- ✅ **Creación flexible** - Desde venta o manual
- ✅ **Numeración automática** - INV-YYYY-00001 por empresa
- ✅ **Items flexibles** - Productos, envío, comisiones, descuentos
- ✅ **PDF profesional** - Con logo y datos empresa
- ✅ **Estados** - Draft, Pending, Paid, Cancelled
- ✅ **Descarga PDF** - Almacenado en Cloudinary
- ✅ **Compartir** - Link público de invoice
- ✅ **Estadísticas** - Por mes, estado, cliente

### 🛡️ Garantías y Servicio
- ✅ **Automáticas desde ventas** - Se crean al registrar venta
- ✅ **Seguimiento expiración** - Días restantes visible
- ✅ **Historial de servicio** - Reparaciones, técnico, fecha
- ✅ **Estados** - Activa, Vencida, Reclamada
- ✅ **Búsqueda** - Por cliente, producto, estado
- ✅ **Notificaciones** - 7 días antes de vencer

### 📊 Reportes Avanzados
- ✅ **Costo vs Ingresos** - Gráficos y tablas por período
- ✅ **Análisis de profit** - Detalle por compra y producto
- ✅ **Ventas por período** - Cantidad y monto
- ✅ **Invoices summary** - Total generado, cobrado
- ✅ **Exportación** - CSV y PDF
- ✅ **Gráficos interactivos** - Recharts

### ⚙️ Configuración Completa
- ✅ **Perfil de usuario** - Nombre, teléfono, foto
- ✅ **Datos de empresa** - Logo, teléfono, dirección, RUT
- ✅ **Gestión de usuarios** - Crear, editar, eliminar, roles
- ✅ **Invitaciones** - Código único por usuario
- ✅ **Roles** - Asignar y cambiar permisos
- ✅ **Seguridad** - Cambiar contraseña

---

## 🔧 Stack Tecnológico - Completo

| Componente | Tecnología | Versión | Propósito |
|-----------|-----------|---------|----------|
| Framework | React | 19.1.1 | UI Components |
| Lenguaje | TypeScript | 5.6+ | Type Safety |
| Build Tool | Vite | 5.4+ | Build rápido |
| Styling | TailwindCSS | 4.1.15 | Utilidad CSS |
| Forms | React Hook Form | 7.65+ | Form management |
| Validation | Zod | 4.1.12 | Schema validation |
| HTTP Client | Axios | 1.12.2 | Llamadas API |
| Routing | React Router | v7.9.4 | Navegación |
| State | Redux Toolkit | 2.9.1 | Estado global |
| Query | React Query | 5.90.5 | Data fetching |
| Icons | Lucide React | 0.546 | Iconografía |
| Notifications | React Hot Toast | 2.6.0 | Notificaciones |
| Charts | Recharts | 3.3.0 | Gráficos datos |
| PDF | react-pdf | 10.2.0 | Lectura PDFs |
| OCR | Tesseract.js | 6.0.1 | Lectura de texto |
| Webcam | react-webcam | 7.2.0 | Acceso cámara |
| Animations | Framer Motion | 12.23.24 | Animaciones |
| Drag & Drop | React Dropzone | 14.3.8 | File upload |
| UI Icons | React Icons | 5.5.0 | Iconografía |
| Formatos | Autoprefixer | 10.4.21 | CSS compatibility |
| CSS | PostCSS | 8.5.6 | CSS processing |

---

## 📁 Estructura de Carpetas Actual

```
Frontend/src/
├── App.tsx                           # App raíz con rutas
├── main.tsx                          # Entry point React
├── App.css & index.css              # Estilos globales
│
├── pages/                           # Vistas/Páginas
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── Dashboard.tsx
│   ├── Inventory/
│   │   ├── ProductList.tsx
│   │   ├── ProductDetail.tsx
│   │   └── ProductAdd.tsx
│   ├── Sales/
│   │   ├── SalesList.tsx
│   │   └── NewSale.tsx
│   ├── Purchases/
│   │   ├── PurchaseList.tsx
│   │   └── NewPurchase.tsx
│   ├── Invoices/
│   │   ├── InvoiceList.tsx
│   │   └── CreateInvoice.tsx
│   ├── Services/
│   │   └── ServiceBoard.tsx
│   ├── Warranties/
│   │   └── WarrantyList.tsx
│   ├── Suppliers/
│   │   └── SupplierList.tsx
│   ├── Users/
│   │   └── UserList.tsx
│   ├── Invitations/
│   │   └── InvitationList.tsx
│   ├── LoginPage.tsx
│   └── Settings/
│       └── CompanySettings.tsx
│
├── components/                      # Componentes reutilizables
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── ProtectedRoute.tsx
│   ├── SerialNumberInput.tsx
│   ├── OCRRegionSelector.tsx
│   ├── ImageCropper.tsx
│   └── index.ts
│
├── services/                        # API calls
│   ├── api.ts                      # Axios config con interceptors
│   ├── authService.ts
│   ├── productService.ts
│   ├── saleService.ts
│   ├── purchaseService.ts
│   ├── invoiceService.ts
│   ├── reportService.ts
│   ├── warrantyService.ts
│   └── [otros servicios]
│
├── context/                         # Context API
│   ├── ThemeContext.tsx
│   ├── AuthContext.tsx
│   └── CompanyContext.tsx
│
├── store/                           # Redux Toolkit
│   ├── authSlice.ts
│   ├── companySlice.ts
│   └── index.ts
│
├── hooks/                           # Custom React Hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── [otros hooks]
│
├── types/                           # Tipos TypeScript
│   ├── index.ts
│   ├── api.ts
│   ├── models.ts
│   └── [otros tipos]
│
├── utils/                           # Funciones utilidad
│   ├── formatters.ts
│   ├── validators.ts
│   └── helpers.ts
│
├── layouts/                         # Layouts
│   ├── AuthenticatedLayout.tsx
│   ├── GuestLayout.tsx
│   └── MainLayout.tsx
│
├── config/                          # Configuraciones
│   ├── api.config.ts
│   ├── routes.config.ts
│   └── constants.ts
│
└── assets/                          # Recursos estáticos
    ├── images/
    ├── icons/
    └── [otros]
```
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── sale.service.ts
│   │   ├── invoice.service.ts
│   │   ├── purchase.service.ts
│   │   ├── report.service.ts
│   │   └── [otros servicios]
│   │
│   ├── context/                   # Context API
│   │   ├── AuthContext.tsx
│   │   ├── CompanyContext.tsx
│   │   └── [otros contextos]
│   │
│   ├── hooks/                     # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── usePagination.ts
│   │   └── [otros hooks]
│   │
│   ├── store/                     # Estado global (Zustand)
│   │   ├── authStore.ts
│   │   ├── companyStore.ts
│   │   └── [otros stores]
│   │
│   ├── types/                     # Tipos TypeScript
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── [otros tipos]
│   │
│   ├── utils/                     # Utilidades
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   └── [otros utils]
│   │
│   ├── layouts/                   # Layouts
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── [otros layouts]
│   │
│   ├── assets/                    # Imágenes, logos, etc
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── config/                    # Configuraciones
│   │   ├── api.config.ts
│   │   ├── routes.config.ts
│   │   └── constants.ts
│   │
│   └── App.css                    # Estilos de App
│
├── public/                        # Archivos públicos
├── .env.example                   # Variables de entorno ejemplo
├── vite.config.ts                 # Configuración Vite
├── tailwind.config.js             # Configuración TailwindCSS
├── tsconfig.json                  # TypeScript config
├── tsconfig.app.json              # TypeScript app config
├── tsconfig.node.json             # TypeScript node config
├── eslint.config.js               # ESLint config
├── postcss.config.js              # PostCSS config
├── package.json                   # Dependencias
└── README.md                      # Este archivo
```

---

## ⚙️ Variables de Entorno

Crear archivo `.env` en Frontend/:

```env
# API Backend
VITE_API_BASE_URL=http://localhost:3001/api/v1

# En producción
# VITE_API_BASE_URL=https://api.stockly.app/v1

# Modo debug (opcional)
VITE_DEBUG=false

# Cloudinary (si descarga directa desde frontend)
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
```

---

## 📦 Scripts NPM

```bash
# Desarrollo (con hot reload)
npm run dev

# Build para producción
npm run build

# Preview de build local
npm run preview

# Lint (verificar errores)
npm run lint

# Format (formatear código)
npm run format
```

---

## 🔐 Seguridad

- ✅ **JWT en localStorage** - Access token almacenado securo
- ✅ **HTTPS en producción** - Conexión segura
- ✅ **Validación de entrada** - Zod schemas
- ✅ **Sanitización** - Prevención XSS
- ✅ **CORS headers** - Respetados del backend
- ✅ **Auto-logout** - Al expirar token
- ✅ **RBAC en UI** - Componentes según rol

---

## 📊 Páginas Principales

### Dashboard
- KPIs principales
- Resumen de ventas, compras, invoices
- Gráficos de tendencias
- Acciones rápidas

### Productos
- Listar con búsqueda y filtros
- Crear/Editar producto
- Gestionar atributos
- Ver stock completo

### Ventas
- Listar ventas
- Crear venta (con OCR para serial)
- Ver detalles
- Garantía automática
- Estadísticas

### Compras
- Listar compras
- Crear compra
- Ver profit automático
- Análisis de rentabilidad
- Estadísticas

### Invoices ⭐ NUEVO
- Listar invoices
- Crear desde venta
- Agregar items (envío, comisiones)
- Generar y descargar PDF
- Cambiar estado (draft → pending → paid)
- Estadísticas

### Reportes
- Costo vs Ingresos
- Análisis por período
- Gráficos
- Exportar datos

### Configuración
- Perfil de usuario
- Cambiar contraseña
- Gestionar empresas
- Invitar usuarios
- Cambiar roles

---

## 🔌 Integración con Backend

### Servicio API

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Llamadas API

```typescript
// services/product.service.ts
import api from './api';

export const productService = {
  getAll: (page = 1, limit = 20) => 
    api.get('/products', { params: { page, limit } }),
  
  create: (data) => 
    api.post('/products', data),
  
  update: (id, data) => 
    api.put(`/products/${id}`, data),
  
  delete: (id) => 
    api.delete(`/products/${id}`),
};
```

---

## 📱 Responsividad

- ✅ Mobile first design
- ✅ Breakpoints: sm, md, lg, xl
- ✅ TailwindCSS responsive utilities
- ✅ Menú adaptable en mobile

---

## 🎨 Temas & Styling

- **TailwindCSS** para estilos
- **Modo claro/oscuro** (opcional)
- **Paleta de colores** personalizable en `tailwind.config.js`
- **Componentes reutilizables** con estilos consistentes

---

## 🧪 Testing (Futuro)

- [ ] Jest + React Testing Library
- [ ] E2E con Cypress
- [ ] Cobertura > 80%

---

## 🚀 Build & Deploy

### Local
```bash
npm run build
npm run preview
```

### Producción (Recomendado: Vercel, Netlify, Railway)

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Variables en producción:**
```
VITE_API_BASE_URL=https://api.stockly.app/v1
```

---

## 🐛 Troubleshooting

### ❌ "Cannot find module"
```bash
npm install
npm run dev
```

### ❌ "CORS error"
- Verifica VITE_API_BASE_URL es correcto
- Backend debe tener CORS configurado
- Revisa CORS_ORIGIN en .env del backend

### ❌ "Token expired"
- Auto-logout redirige a login
- Usuario debe hacer login nuevamente

### ❌ "PDF no genera"
- Verifica que invoice está en estado draft/pending
- Revisa que datos están completos
- Verifica Cloudinary credenciales en backend

---

## 📊 Performance

- ✅ Code splitting automático con Vite
- ✅ Lazy loading de rutas
- ✅ Caché de API
- ✅ Optimización de imágenes
- ✅ Minificación en build

---

## 🔄 Próximas Mejoras

- [ ] PWA (Progressive Web App)
- [ ] Offline mode
- [ ] Dark mode
- [ ] i18n (Internacionalización)
- [ ] Notificaciones en tiempo real
- [ ] Editor visual de reportes

---

## 📚 Recursos

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vite.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Backend API Reference](../Backend/docs/API_REFERENCE.md)

---

## 📧 Soporte

Para issues o preguntas:
- Revisar [Backend API Reference](../Backend/docs/API_REFERENCE.md)
- Revisar [UML Analysis](../Backend/docs/UML_ANALYSIS.md)
- Contactar equipo de desarrollo

---

**Versión:** 1.3.0 | **Estado:** ✅ Producción | **Última actualización:** Oct 22, 2025

