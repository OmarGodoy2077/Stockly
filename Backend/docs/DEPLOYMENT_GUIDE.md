# 🚀 Guía de Despliegue - Stockly v1.3.0

**Última Actualización:** 22 de Octubre, 2025  
**Versión:** 1.3.0 - Sistema de Invoices/Recibos  
**Plataformas:** Railway, Render, Heroku

---

## 📋 Tabla de Contenidos

1. [Pre-Despliegue](#pre-despliegue)
2. [Opción 1: Railway (Recomendado)](#opción-1-railway-recomendado)
3. [Opción 2: Render](#opción-2-render)
4. [Opción 3: Heroku](#opción-3-heroku)
5. [Post-Despliegue](#post-despliegue)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Despliegue

### Checklist Base de Datos

- [ ] Si es BD NUEVA: Ejecutar `database/init.sql` en Supabase SQL Editor
- [ ] Si es BD EXISTENTE: Ejecutar `migrations/add-invoices-system.sql` 
- [ ] Verificar que existen tablas: invoices, invoice_line_items
- [ ] Verificar que existe función: generate_invoice_number()
- [ ] Crear usuario PostgreSQL específico para producción (opcional pero recomendado)

### Checklist Credenciales

- [ ] Supabase PROJECT_URL
- [ ] Supabase DATABASE_URL (postgresql://)
- [ ] Supabase DATABASE_PASSWORD
- [ ] Cloudinary CLOUD_NAME
- [ ] Cloudinary API_KEY
- [ ] Cloudinary API_SECRET
- [ ] JWT_SECRET (mínimo 32 caracteres)
- [ ] JWT_REFRESH_SECRET (diferente a JWT_SECRET)

### Checklist Código

- [ ] `npm run dev` funciona localmente
- [ ] No hay errores de validación
- [ ] .env NO está en git (.gitignore configurado)
- [ ] package.json tiene engines: "node": ">=20.0.0"
- [ ] Todas las migraciones están aplicadas

### Checklist Frontend

- [ ] Frontend variable BASE_URL apunta a nueva URL del backend
- [ ] CORS_ORIGIN configurado en backend
- [ ] Certificados SSL/TLS listos (obligatorio en producción)

---

## 🚂 Opción 1: Railway (Recomendado)

Railway es la opción más rápida y con mejor soporte para Node.js + PostgreSQL.

### Paso 1: Crear Proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. Click en **"New Project"** → **"Deploy from GitHub"**
3. Conecta tu repositorio GitHub
4. Selecciona rama: `main`
5. Railway detectará automáticamente Node.js

### Paso 2: Configurar Base de Datos

**Opción A: Usar BD existente (Supabase)**

1. En Railway Dashboard, click **"+ New"**
2. Busca y NO selecciones PostgreSQL (ya tienes en Supabase)
3. En cambio, ve a **"Variables"**
4. Agrega variables de entorno manualmente

**Opción B: Crear BD en Railway** (para producción privada)

1. En Railway Dashboard, click **"+ New"**
2. Selecciona **"PostgreSQL"**
3. Railway creará automáticamente DATABASE_URL
4. Ve a **"Database"** para obtener credenciales
5. Copia la connection string
6. Ejecuta `database/init.sql` en Railway PostgreSQL client

### Paso 3: Configurar Variables de Entorno

1. Ve a **"Variables"** en tu proyecto
2. Agrega cada variable:

```
DATABASE_URL=postgresql://user:password@host:5432/db
NODE_ENV=production
PORT=3001
JWT_SECRET=tu-secreto-de-64-caracteres
JWT_REFRESH_SECRET=otro-secreto-diferente
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
CORS_ORIGIN=https://tu-frontend-url.com
```

### Paso 4: Configurar Build

En **"Settings"** → **"Build & Deploy"**:

```
Build Command: npm install
Start Command: npm start
```

### Paso 5: Desplegar

1. Vuelve a **"Deployments"**
2. Click en **"Deploy"** o espera a que se despliegue automáticamente
3. Espera ~2 minutos a que compile

### Paso 6: Obtener URL

En **"Public Domain"**, se mostrará la URL:
```
https://stockly-backend-prod.railway.app
```

---

## 🎨 Opción 2: Render

Render es similar a Railway, con buen soporte Node.js.

### Paso 1: Crear Web Service

1. Ve a [render.com](https://render.com)
2. Click **"+ New +"** → **"Web Service"**
3. Conecta tu repositorio GitHub
4. Configura:
   - **Name:** stockly-backend-prod
   - **Root Directory:** Backend (si es monorepo)
   - **Build Command:** npm install
   - **Start Command:** npm start
   - **Environment:** Node

### Paso 2: Configurar Base de Datos

**Opción A: Usar BD existente (Supabase)**

En **"Environment"**, agrega DATABASE_URL de Supabase

**Opción B: Crear PostgreSQL en Render**

1. Click **"+ New +"** → **"PostgreSQL"**
2. Copia la connection string
3. Ejecuta `database/init.sql`

### Paso 3: Agregar Variables de Entorno

En **"Environment"**, agrega:

```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3001
JWT_SECRET=...
[resto de variables]
```

### Paso 4: Desplegar

El deploy se inicia automáticamente cuando guardas cambios en GitHub.

---

## 🟣 Opción 3: Heroku

Heroku es más caro pero muy confiable. Requiere Heroku CLI.

### Paso 1: Instalar Heroku CLI

```bash
# Windows
choco install heroku-cli

# macOS
brew tap heroku/brew && brew install heroku

# Linux
sudo npm install -g heroku
```

### Paso 2: Autenticarse

```bash
heroku login
```

### Paso 3: Crear App

```bash
cd Backend
heroku create stockly-backend-prod
```

### Paso 4: Configurar BD

**Opción A: Usar BD existente**

```bash
heroku config:set DATABASE_URL="postgresql://user:pass@host:5432/db"
```

**Opción B: Agregar PostgreSQL Heroku**

```bash
heroku addons:create heroku-postgresql:standard-0
```

### Paso 5: Agregar Variables de Entorno

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="tu-secreto"
heroku config:set JWT_REFRESH_SECRET="otro-secreto"
heroku config:set CLOUDINARY_CLOUD_NAME="tu-cloud-name"
[resto...]
```

### Paso 6: Desplegar

```bash
git push heroku main
```

---

## ✅ Post-Despliegue

### Paso 1: Verificar Health Check

```bash
curl https://tu-backend-url.com/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T10:00:00Z"
}
```

### Paso 2: Test de Login

```bash
curl -X POST https://tu-backend-url.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc..."
  }
}
```

### Paso 3: Test de Productos

```bash
curl https://tu-backend-url.com/api/v1/products \
  -H "Authorization: Bearer {tu-token}"
```

### Paso 4: Test de Invoices (v1.3.0)

```bash
curl https://tu-backend-url.com/api/v1/invoices \
  -H "Authorization: Bearer {tu-token}"
```

### Paso 5: Verificar Logs

**Railway:**
```
Dashboard → Logs → Stream logs
```

**Render:**
```
Dashboard → Logs → Tail logs
```

**Heroku:**
```bash
heroku logs --tail
```

### Paso 6: Configurar Dominio Personalizado (Opcional)

**Railway:**
1. Settings → Custom Domain
2. Ingresa tu dominio
3. Apunta CNAME a Railway

**Render:**
1. Settings → Custom Domain
2. Agrega tu dominio
3. Configura DNS

**Heroku:**
```bash
heroku domains:add api.stockly.app
```

---

## 🐛 Troubleshooting

### ❌ Error: "Cannot find module"

**Causa:** Dependencias no instaladas en producción

**Solución:**
```bash
npm ci --production  # En local
# O verificar package-lock.json en git
git add package-lock.json
git push
```

### ❌ Error: "Database connection refused"

**Causa:** DATABASE_URL inválida o BD no accesible

**Solución:**
1. Verifica que DATABASE_URL comienza con `postgresql://`
2. Verifica contraseña es correcta
3. Verifica firewall permite conexión (Supabase IP whitelist)
4. Test conexión local primero

### ❌ Error: "Port 3001 already in use"

**Causa:** Puerto ocupado en servidor

**Solución:**
1. Railway/Render asignan puerto automáticamente via $PORT
2. Asegúrate que server.js usa: `process.env.PORT || 3001`

```javascript
const port = process.env.PORT || 3001;
app.listen(port, () => { ... });
```

### ❌ Error: "Cloudinary not initialized"

**Causa:** Variables de Cloudinary faltando

**Solución:**
1. Verifica CLOUDINARY_CLOUD_NAME en variables de entorno
2. Verifica CLOUDINARY_API_KEY
3. Verifica CLOUDINARY_API_SECRET
4. Redeploy después de agregar

### ❌ Error: "Cannot generate PDF"

**Causa:** Cloudinary no accesible o jsPDF error

**Solución:**
1. Verifica que jsPDF v3.0.3 y jsPDF-autoTable v5.0.2 están en package.json
2. Test en local: `npm run dev`
3. Verifica credenciales Cloudinary

### ❌ Error: "CORS policy violation"

**Causa:** Frontend URL no en CORS_ORIGIN

**Solución:**
```bash
# Agregar variable
CORS_ORIGIN=https://tu-frontend-url.com

# O permitir múltiples
CORS_ORIGIN=https://frontend.com,https://app.frontend.com
```

### ❌ Error: "JWT token invalid"

**Causa:** JWT_SECRET no sincronizado entre envs

**Solución:**
1. Usa mismo JWT_SECRET en local y producción
2. O regenera y reasigna a usuarios (logout requerido)

### ❌ Error: "Rate limit exceeded"

**Causa:** Muchas requests rápidas

**Solución:**
```bash
# Configurar en variables
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # requests
```

---

## 📊 Monitoreo en Producción

### Logs Importantes

```
INFO: User registration
INFO: Invoice PDF generated
WARN: Profit margin > 80%
ERROR: Cloudinary upload failed
```

### Métricas Críticas

- Response time < 200ms (p95)
- Error rate < 0.1%
- DB connections < 20
- Uptime > 99.9%

### Alertas Recomendadas

- Downtime
- Database errors > 5/min
- Response time > 1s
- Memory usage > 80%

---

## 🔄 Actualizar a Nueva Versión

```bash
# Local
git pull origin main
npm install
npm run dev

# Si hay cambios en BD
# Ejecutar migraciones en Supabase SQL Editor

# Desplegar
git push origin main  # Auto-deploy en Railway/Render
heroku logs --tail   # Ver logs en Heroku
```

---

## 🔐 Seguridad en Producción

### Checklist

- [ ] NODE_ENV=production
- [ ] Helmet habilitado (CORS headers)
- [ ] Rate limiting activo
- [ ] HTTPS/SSL obligatorio
- [ ] JWT_SECRET mínimo 32 caracteres
- [ ] .env NO en git
- [ ] Database backups automáticos
- [ ] Logs monitoreados

### Certificado SSL

- Railway/Render: Automático con dominio personalizado
- Heroku: Automático con *.herokuapp.com, pago para dominio

---

## 📈 Scaling

**Si la carga crece:**

1. **BD:** Upgrade a PostgreSQL größer en Supabase
2. **Backend:** Multiple dynos en Heroku, auto-scale en Railway/Render
3. **Cache:** Agregar Redis para datos frecuentes
4. **CDN:** Cloudinary ya actúa como CDN

---

## 📞 Soporte

Para issues específicos de tu proveedor:

- **Railway:** support@railway.app
- **Render:** docs.render.com
- **Heroku:** help.heroku.com

Para issues de Stockly:
- Revisar API_REFERENCE.md
- Revisar ARCHITECTURE.md
- Revisar UML_ANALYSIS.md

---

**Última actualización:** 22 Octubre 2025 | v1.3.0

