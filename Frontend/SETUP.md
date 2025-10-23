# 🔧 Configuración Frontend - Stockly v1.3.0

**Última Actualización:** 22 de Octubre, 2025  
**Tiempo Estimado:** 10 minutos

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Instalación Local](#instalación-local)
3. [Configuración de Variables](#configuración-de-variables)
4. [Desarrollo](#desarrollo)
5. [Build para Producción](#build-para-producción)
6. [Despliegue](#despliegue)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-requisitos

- ✅ **Node.js** 20+ instalado
- ✅ **npm** 9+ (viene con Node.js)
- ✅ **Backend corriendo** en http://localhost:3001 (desarrollo)
- ✅ **Git** instalado

---

## 🚀 Instalación Local

### Paso 1: Clonar Repositorio

```bash
git clone <repository-url>
cd "Proyectos FullStack/Stockly/Frontend"
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

**Tiempo:** 2-3 minutos

### Paso 3: Crear Archivo .env

```bash
# Crear archivo
cp .env.example .env

# O crear manualmente: touch .env
```

---

## ⚙️ Configuración de Variables

### Paso 1: Abrir .env

Archivo: `Frontend/.env`

### Paso 2: Agregar Variables

```env
# ============================================
# API BACKEND
# ============================================

# DESARROLLO
VITE_API_BASE_URL=http://localhost:3001/api/v1

# PRODUCCIÓN (cambiar cuando despliegues)
# VITE_API_BASE_URL=https://tu-api.com/api/v1

# ============================================
# OPCIONALES
# ============================================

# Debug mode
VITE_DEBUG=false

# Cloudinary (si necesita acceso directo desde frontend)
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name

# Timeout para requests (ms)
VITE_API_TIMEOUT=30000
```

### Paso 3: Guardar

Presiona Ctrl+S (o Cmd+S en Mac)

---

## 💻 Desarrollo

### Iniciar Servidor de Desarrollo

```bash
npm run dev
```

**Output esperado:**
```
  VITE v5.4.0  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h + enter to show help
```

### Acceder

Abre http://localhost:5173 en tu navegador

### Hot Reload

Los cambios en archivos `.tsx`, `.ts`, `.css` se reflejan **automáticamente** sin recargar

---

## 🏗️ Build para Producción

### Paso 1: Compilar

```bash
npm run build
```

**Output:**
```
✓ 1234 modules transformed
dist/index.html                   0.50 KB
dist/assets/index-abc123.js       245.67 KB
dist/assets/index-def456.css      12.34 KB
```

### Paso 2: Verificar Build Local

```bash
npm run preview
```

Accede a http://localhost:4173

### Paso 3: Revisar Carpeta `dist/`

Esta carpeta contiene los archivos a desplegar en producción

---

## 🚀 Despliegue

### Opción 1: Vercel (Recomendado)

**Ventajas:** Automático, gratis, rápido

```bash
# 1. Instalar CLI
npm install -g vercel

# 2. Desplegar (primera vez)
vercel

# 3. Seguir prompts

# 4. Actualizaciones automáticas con git push
```

**Configuración variable en Vercel:**
1. Dashboard → Project Settings → Environment Variables
2. Agregar: `VITE_API_BASE_URL=https://tu-backend-api.com/api/v1`

### Opción 2: Netlify

```bash
# 1. Instalar CLI
npm install -g netlify-cli

# 2. Conectar repositorio
netlify init

# 3. Desplegar
npm run build
netlify deploy --prod --dir=dist
```

### Opción 3: Railway

1. Conectar repositorio GitHub en [railway.app](https://railway.app)
2. Railway detecta automáticamente Vite
3. Configurar variable: `VITE_API_BASE_URL=https://...`

### Opción 4: Heroku

```bash
# 1. Instalar Heroku CLI
npm install -g heroku

# 2. Crear app
heroku create stockly-frontend-prod

# 3. Configurar build pack
heroku buildpacks:set heroku/nodejs

# 4. Desplegar
git push heroku main
```

---

## 📝 Configurar Dominio Personalizado

### Vercel
1. Dashboard → Settings → Domains
2. Agregar tu dominio
3. Apuntar DNS según instrucciones

### Netlify
1. Site Settings → Domain Management
2. Add Custom Domain
3. Seguir pasos DNS

### Heroku
```bash
heroku domains:add frontend.stockly.app
```

---

## 🔄 Actualizar Código

### Traer cambios del repositorio

```bash
git pull origin main
npm install  # Si hay dependencias nuevas
npm run dev
```

### Actualizar variables de entorno

Si backend cambió URL o necesita nuevas variables:

1. Editar `.env`
2. Guardar
3. `npm run dev` recarga automáticamente

---

## 🐛 Troubleshooting

### ❌ Error: "Cannot find module 'react'"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
npm install
```

### ❌ Error: "Port 5173 already in use"

**Causa:** Otro proceso usa el puerto

**Solución:**
```bash
# Opción A: Usar otro puerto
npm run dev -- --port 5174

# Opción B: Matar proceso en puerto 5173
# Windows: netstat -ano | findstr :5173
# macOS/Linux: lsof -i :5173
```

### ❌ Error: "CORS policy violated"

**Causa:** Backend no permite requests del frontend

**Solución:**
1. Verificar backend está corriendo
2. Verificar VITE_API_BASE_URL es correcto
3. Verificar CORS_ORIGIN en backend .env incluye http://localhost:5173

### ❌ Error: "Cannot GET /assets/index.js"

**Causa:** Rutas no están siendo servidas correctamente

**Solución:**
```bash
# Reiniciar
npm run dev

# O limpiar caché
rm -rf node_modules/.vite
npm run dev
```

### ❌ Error: "Login falla pero backend funciona"

**Causa:** Credenciales incorrectas o backend tiene issues

**Solución:**
1. Verifica endpoint `/auth/login` en backend
2. Usa curl para testear:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### ❌ Error: "Tokens no funcionan"

**Causa:** JWT_SECRET diferente o localStorage limpio

**Solución:**
1. Limpiar localStorage:
   - DevTools → Application → Local Storage → Clear
2. Hacer login nuevamente
3. Verificar que token está en localStorage

### ❌ Error: "Imágenes/PDFs no cargan"

**Causa:** URLs de Cloudinary no válidas

**Solución:**
1. Verificar que backend tiene credenciales Cloudinary correctas
2. Verificar que invoices se generan correctamente en backend
3. Revisar logs del backend

---

## 📊 Verificación Completa

### Checklist Pre-Despliegue

- [ ] `npm run dev` funciona sin errores
- [ ] Login funciona
- [ ] Puedes crear productos
- [ ] Puedes crear ventas
- [ ] Puedes generar invoices
- [ ] Puedes descargar PDFs
- [ ] `npm run build` sin errores
- [ ] `npm run preview` muestra la app
- [ ] No hay console errors en DevTools

---

## 🎯 Información Útil

### Ubicación de Archivos Importantes

- **Configuración Vite:** `vite.config.ts`
- **Configuración Tailwind:** `tailwind.config.js`
- **Configuración TypeScript:** `tsconfig.json`
- **ESLint config:** `eslint.config.js`
- **Variables de entorno:** `.env`

### Comandos Útiles

```bash
# Linter
npm run lint

# Formato (Prettier)
npm run format

# Ver build de stats
npm run build -- --stats
```

---

## 📚 Documentación Relacionada

- **Backend Info:** [Backend README](../Backend/README.md)
- **API Endpoints:** [API Reference](../Backend/docs/API_REFERENCE.md)
- **Arquitectura:** [Architecture](../Backend/docs/ARCHITECTURE.md)
- **Análisis UML:** [UML Analysis](../Backend/docs/UML_ANALYSIS.md)

---

## 🔐 Seguridad en Producción

- ✅ HTTPS obligatorio
- ✅ Variables `.env` nunca en git
- ✅ Tokens JWT en localStorage (con cuidado)
- ✅ Validación en frontend (complementaria)
- ✅ Sanitización de inputs

---

**Última actualización:** 22 Octubre 2025 | v1.3.0

