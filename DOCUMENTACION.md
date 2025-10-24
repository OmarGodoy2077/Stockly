# 📚 Stockly v1.3.0 - Documentación Completa - ACTUALIZADA

**Última Actualización:** 23 de Octubre, 2025  
**Versión:** 1.3.0 - Totalmente Actualizada  
**Estado:** ✅ Documentación Completa y Verificada

---

## 📋 Índice de Documentación

Este proyecto tiene documentación COMPLETA y ACTUALIZADA para todos los roles:

### 👥 Según tu Rol

#### 🧑‍💼 Soy Usuario Final (Quiero Usar Stockly)
**→ Lee:** `MANUAL_DE_USUARIO_v1.3.0.md` ⭐ **NUEVO - ACTUALIZADO**

**Contiene:**
- Cómo crear cuenta y configurar empresa
- Gestión completa de inventario con categorías jerárquicas
- Compras con profit tracking automático
- Ventas con OCR integrado
- **Invoices profesionales** - PDFs con logo, numeración secuencial
- Reportes con gráficos
- Garantías y servicio técnico
- Guía de configuración y usuarios
- 15+ preguntas frecuentes resueltas

**Mejor para:** Gerentes, vendedores, usuarios finales

---

#### 👨‍💻 Soy Desarrollador (Quiero Modificar/Desarrollar)
**→ Lee:** `MANUAL_TECNICO_v1.3.0.md` ⭐ **NUEVO - COMPLETAMENTE ACTUALIZADO**

**Contiene:**
- ✅ **14 Controllers** backend actualizados
- ✅ **18+ tablas** base de datos documentadas
- ✅ Stack técnico completo (versions reales)
- ✅ Estructura actual del código (Backend + Frontend)
- ✅ Todas las características v1.3.0
- ✅ API endpoints principales
- ✅ Autenticación JWT + RBAC
- ✅ Instalación paso a paso
- ✅ Despliegue a producción
- ✅ Troubleshooting con soluciones

**Mejor para:** Desarrolladores, tech leads, architects

---

#### 🔧 Soy DevOps / Despliegue
**→ Lee:** `MANUAL_TECNICO_v1.3.0.md` + `Backend/docs/DEPLOYMENT_GUIDE.md`

**Encontrarás:**
- Despliegue Backend (Railway, Heroku, Render)
- Despliegue Frontend (Vercel, Netlify)
- Configuración BD (Supabase PostgreSQL)
- Variables de entorno producción
- Monitoreo y logging
- SSL/HTTPS setup

---

### 📁 Documentos Ordenados

| Documento | Ubicación | Para Quién | Contenido |
|-----------|-----------|-----------|----------|
| **Manual de Usuario v1.3.0** | `MANUAL_DE_USUARIO_v1.3.0.md` | Usuarios finales | ⭐ Guía completa de uso |
| **Manual Técnico v1.3.0** | `MANUAL_TECNICO_v1.3.0.md` | Developers | ⭐ Arquitectura + desarrollo |
| API Reference | `Backend/docs/API_REFERENCE.md` | Developers, Integradores | Todos los endpoints |
| Architecture | `Backend/docs/ARCHITECTURE.md` | Tech Leads | Decisiones, stack |
| UML Analysis | `Backend/docs/UML_ANALYSIS.md` | Analistas | Diagramas ER, clases |
| Setup Backend | `Backend/docs/SETUP.md` | Developers | Configuración local |
| Deployment | `Backend/docs/DEPLOYMENT_GUIDE.md` | DevOps | Despliegue producción |
| Setup Frontend | `Frontend/SETUP.md` | Frontend Devs | Configuración frontend |
| README Frontend | `Frontend/README.md` | Equipo general | Overview frontend |
| README Backend | `Backend/README.md` | Equipo general | Overview backend |

---

## 🎯 Inicio Rápido por Rol

### Para Usuarios Finales

```
1. Accede a https://stockly.app
2. Registra tu cuenta
3. Sigue MANUAL_DE_USUARIO_v1.3.0.md
   - Configuración inicial (5 min)
   - Crear primer producto (2 min)
   - Registrar venta (3 min)
   - Generar invoice (2 min)
   - Ver reportes (2 min)
4. ¡Listo!
```

### Para Desarrolladores Frontend

```bash
# 1. Clonar y navegar
git clone <repo-url>
cd Stockly/Frontend

# 2. Instalar
npm install

# 3. Configurar .env
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3001/api/v1

# 4. Iniciar dev
npm run dev
# http://localhost:5173

# 5. Documentación
# - Lee: MANUAL_TECNICO_v1.3.0.md (Sección Frontend)
# - Explora: src/pages/, src/services/, src/components/
```

**Stack:** React 19 + TypeScript + Vite + Redux + React Router v7 + TailwindCSS 4.1

### Para Desarrolladores Backend

```bash
# 1. Clonar y navegar
git clone <repo-url>
cd Stockly/Backend

# 2. Instalar
npm install

# 3. Configurar BD
# - Crear en Supabase o PostgreSQL local
# - Ejecutar: database/init.sql

# 4. Configurar .env
cp .env.example .env
# DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET, etc.

# 5. Iniciar dev
npm run dev
# http://localhost:3001/api/v1

# 6. Documentación
# - Lee: MANUAL_TECNICO_v1.3.0.md (Sección Backend)
# - Revisa: Backend/docs/API_REFERENCE.md (todos los endpoints)
# - Explora: src/controllers/, src/models/, src/routes/
```

**Stack:** Node.js 20 + Express 4.19 + PostgreSQL 14 + JWT + Zod

### Para DevOps

```bash
# 1. Revisar deployment guide
# - Backend: Railway, Heroku, Render
# - Frontend: Vercel, Netlify
# - BD: Supabase PostgreSQL

# 2. Configurar variables producción
# - Backend: JWT_SECRET, DB_*, CLOUDINARY_*
# - Frontend: VITE_API_BASE_URL

# 3. Setup Cloudinary
# - Para almacenamiento de PDFs

# 4. Deploy
# - Railway: Auto desde GitHub
# - Vercel: Auto desde GitHub

# 5. Documentación
# - Lee: Backend/docs/DEPLOYMENT_GUIDE.md
```

---

## 📊 Características v1.3.0

### ✅ Totalmente Implementado

**Backend Controllers (14):**
- AuthController ✅
- UserController ✅
- CompanyController ✅
- InvitationController ✅
- CategoryController (jerárquico) ✅
- ProductController (con atributos) ✅
- PurchaseController (profit tracking) ✅
- SaleController (con OCR) ✅
- InvoiceController (PDF generation) ✅
- WarrantyController ✅
- ServiceHistoryController ✅
- SupplierController ✅
- ReportController ✅
- HealthController ✅

**Frontend Pages:**
- Auth (Login, Register) ✅
- Dashboard (KPIs) ✅
- Inventory (Products, Categories, Attributes) ✅
- Sales (with OCR) ✅
- Purchases (with Profit Tracking) ✅
- Invoices (PDF generation) ✅
- Services (Warranty + Technical Service) ✅
- Warranties ✅
- Suppliers ✅
- Users & Invitations ✅
- Reports (Recharts) ✅
- Settings (Company, Users, Roles) ✅

**Características Principales:**
- ✅ Multi-tenant (18 tablas BD)
- ✅ JWT + Bcrypt auth
- ✅ RBAC (4 roles)
- ✅ OCR Tesseract
- ✅ PDF generation (jsPDF)
- ✅ Cloudinary storage
- ✅ Profit tracking automático
- ✅ Categorías jerárquicas
- ✅ Atributos dinámicos
- ✅ Garantías con servicio técnico
- ✅ Reportes con gráficos (Recharts)
- ✅ Rate limiting
- ✅ Winston logging

---

## ✨ Cambios Actualizados (23 Octubre 2025)

### Backend README
- ✅ Stack completo con versions reales
- ✅ 14 Controllers documentados
- ✅ 18+ tablas BD listadas
- ✅ Características v1.3.0 actualizadas

### Frontend README
- ✅ Stack completo con versions reales
- ✅ 25+ dependencias listadas
- ✅ Todas las páginas/componentes documentados
- ✅ Características v1.3.0 actualizadas

### Manuales Nuevos
- ✅ `MANUAL_DE_USUARIO_v1.3.0.md` - Completamente reescrito
- ✅ `MANUAL_TECNICO_v1.3.0.md` - 14 controllers + 18 tablas + setup

---

## 🔒 Seguridad

### Implementado

✅ **JWT Tokens:**
- Access token: 15 minutos
- Refresh token: 7 días
- Auto-logout en expiración

✅ **Password Security:**
- Bcryptjs (10 salt rounds)
- Validación: 8+ caracteres, mayúscula, número

✅ **Multi-tenant:**
- RLS automático por company_id
- Aislamiento de datos

✅ **RBAC (4 roles):**
- owner: Todo + invitar
- admin: Todo
- seller: Solo ventas/invoices
- inventory: Solo productos

✅ **API Security:**
- Rate limiting: 100 req/15min
- Helmet: Headers seguros
- CORS: Configuración estricta
- Validation: Zod schemas

---

## 📈 Performance

- ✅ Vite: Build <200ms
- ✅ Code splitting automático
- ✅ Lazy loading de rutas
- ✅ DB índices optimizados
- ✅ Caché de API
- ✅ Image compression (Sharp)

---

## 🚀 Próximas Mejoras

- [ ] PWA (Progressive Web App)
- [ ] Modo offline
- [ ] Dark mode UI
- [ ] Internacionalización (i18n)
- [ ] Notificaciones tiempo real (Socket.io)
- [ ] Mobile app (React Native)
- [ ] Integración contabilidad
- [ ] Más formatos exportación

---

## 📞 Soporte

### Documentación

- **� Usuario:** `MANUAL_DE_USUARIO_v1.3.0.md`
- **🔧 Developer:** `MANUAL_TECNICO_v1.3.0.md`
- **📡 API:** `Backend/docs/API_REFERENCE.md`
- **🏗️ Architecture:** `Backend/docs/ARCHITECTURE.md`

### Contacto

- 📧 Email: support@stockly.app
- 💬 WhatsApp: +51 999 888 777
- � GitHub Issues: [Reportar problema]

---

## 📝 Últimas Actualizaciones

| Fecha | Qué Se Actualizó |
|-------|-----------------|
| 23-Oct-2025 | ✅ Todos los manuales actualizados a v1.3.0 |
| 23-Oct-2025 | ✅ Backend/Frontend README completos |
| 23-Oct-2025 | ✅ 14 Controllers documentados |
| 23-Oct-2025 | ✅ Stack completo con versions reales |
| 22-Oct-2025 | ✅ v1.3.0 release candidate |

---

**🎉 ¡Stockly v1.3.0 completamente documentado!**

Para empezar:
1. Eres **usuario?** → `MANUAL_DE_USUARIO_v1.3.0.md`
2. Eres **developer?** → `MANUAL_TECNICO_v1.3.0.md`
3. Necesitas **API?** → `Backend/docs/API_REFERENCE.md`

---

**Versión:** 1.3.0  
**Estado:** ✅ Producción  
**Documentación:** 100% ✅  
**Última Actualización:** 23 Octubre 2025

*Hecho con ❤️ por Omar Godoy y el equipo Stockly*

