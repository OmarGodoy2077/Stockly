# 🎨 Stockly Frontend v1.3.0

**Última Actualización:** 22 de Octubre, 2025  
**Estado:** ✅ Listo para Producción  
**React:** 18+ | **TypeScript:** 5.6+ | **Vite:** 5.4+ | **TailwindCSS:** 3.4+

---

## 🎯 Descripción del Proyecto

Frontend para **Stockly**, sistema SaaS de gestión de inventario multi-tenant. Interfaz moderna y responsiva para:

✅ Gestión de inventario | ✅ Ventas con OCR | ✅ Invoices/Recibos | ✅ Reportes | ✅ Garantías | ✅ Multi-empresa

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

### Dashboard & Autenticación ✅
- Login/Registro con JWT
- Cambio de contraseña
- Gestión de múltiples empresas
- Switch entre empresas

### Inventario ✅
- Categorías jerárquicas (N niveles)
- Productos CRUD
- Atributos dinámicos por producto
- Estados: new, used, open_box
- Stock completo consolidado

### Ventas ✅
- CRUD de ventas
- **OCR integrado** - Extrae números de serie automáticamente
- Garantías automáticas
- Estadísticas de ventas

### Compras ✅
- CRUD de compras
- **Profit tracking automático** - Calcula margen y rentabilidad
- Análisis de ganancias
- Estadísticas

### **Invoices/Recibos v1.3.0** ⭐ NUEVO
- Generación de invoices desde ventas
- **Numeración automática** - INV-YYYY-00001
- Items adicionales flexibles (envío, comisiones, descuentos)
- **Generación de PDF** - Profesional con logo empresa
- Almacenamiento en Cloudinary
- Estados: Draft → Pending → Paid/Cancelled
- Descargar PDF

### Garantías ✅
- Automáticas desde ventas
- Seguimiento de expiración
- Historial de servicio técnico

### Reportes ✅
- Costo vs Ingresos (resumen ejecutivo)
- Análisis de profit por compra
- Estadísticas de ventas
- Estadísticas de invoices

### Configuración ✅
- Gestión de usuarios por empresa
- Roles: owner, admin, seller, inventory
- Invitaciones por código
- Cambio de roles

---

## 🔧 Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | React | 18+ |
| Lenguaje | TypeScript | 5.6+ |
| Build | Vite | 5.4+ |
| Styling | TailwindCSS | 3.4+ |
| HTTP Client | Axios | Latest |
| State Management | Context API / Zustand | - |
| Routing | React Router | v6+ |
| UI Components | Componentes propios + TailwindCSS | - |
| Icons | Lucide React o Similar | - |
| Validation | Zod | 3+ |
| PDF Download | html2canvas + jsPDF | - |

---

## 📁 Estructura de Carpetas

```
Frontend/
├── src/
│   ├── App.tsx                    # Componente raíz
│   ├── main.tsx                   # Entrada
│   ├── index.css                  # Estilos globales
│   │
│   ├── components/                # Componentes reutilizables
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Modal.tsx
│   │   ├── Button.tsx
│   │   ├── Form/
│   │   └── [otros componentes]
│   │
│   ├── pages/                     # Páginas/Vistas
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Products.tsx
│   │   ├── Sales.tsx
│   │   ├── Invoices.tsx
│   │   ├── Purchases.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   └── [otras páginas]
│   │
│   ├── services/                  # Llamadas API
│   │   ├── api.ts                 # Configuración Axios
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

