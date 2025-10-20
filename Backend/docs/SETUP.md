# 🔧 Guía de Configuración Completa - Stockly Backend

**Última Actualización:** 20 de Octubre, 2025  
**Tiempo Estimado:** 15-20 minutos

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Configuración de Base de Datos (Supabase)](#1️⃣-configuración-de-base-de-datos-supabase)
3. [Configuración de Almacenamiento de Imágenes](#2️⃣-configuración-de-almacenamiento-de-imágenes)
4. [Configuración de Variables de Entorno](#3️⃣-configuración-de-variables-de-entorno)
5. [Instalación y Ejecución](#4️⃣-instalación-y-ejecución)
6. [Verificación](#5️⃣-verificación)
7. [Migración de Base de Datos Existente](#migración-de-base-de-datos-existente)
8. [Troubleshooting](#troubleshooting)
9. [Deploy a Producción](#deploy-a-producción)

---

## Pre-requisitos

- ✅ **Node.js** 20+ instalado ([Descargar](https://nodejs.org/))
- ✅ **npm** 9+ (viene con Node.js)
- ✅ **Git** instalado
- ✅ Cuenta en **Supabase** (gratis)
- ✅ Cuenta en **Cloudinary** (gratis) - Opcional pero recomendado

---

## 1️⃣ Configuración de Base de Datos (Supabase)

### Paso 1.1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Click en **"Start your project"** o **"New Project"**
3. Selecciona tu organización (o crea una nueva)
4. Configura tu proyecto:
   - **Name**: `stockly` o el nombre que prefieras
   - **Database Password**: Elige una contraseña segura (guárdala)
   - **Region**: Elige la más cercana a tus usuarios
   - **Pricing Plan**: Free (suficiente para empezar)
5. Click en **"Create new project"**
6. Espera 2-3 minutos mientras se crea el proyecto

### Paso 1.2: Ejecutar Schema de Base de Datos

**Para Nueva Instalación:**

1. En tu proyecto de Supabase, ve a **"SQL Editor"** (icono de consola en el menú lateral)
2. Click en **"New Query"**
3. Abre el archivo `Backend/database/init.sql` en tu editor
4. **Copia TODO el contenido** del archivo
5. **Pégalo** en el editor SQL de Supabase
6. Click en **"Run"** (▶️) o presiona `Ctrl + Enter`
7. Verifica que aparezca **"Success. No rows returned"**

**Resultado:** Se crearán ~15 tablas, índices, funciones y triggers.

### Paso 1.3: Obtener DATABASE_URL

1. Ve a **"Project Settings"** (⚙️ en el menú lateral)
2. Click en **"Database"**
3. Busca la sección **"Connection string"**
4. Selecciona el modo **"URI"** (no "Transaction" ni "Session")
5. Copia la cadena completa que comienza con `postgresql://`
6. **IMPORTANTE:** Reemplaza `[YOUR-PASSWORD]` con la contraseña que configuraste en el Paso 1.1

**Ejemplo:**
```
postgresql://postgres.abcdefghijk:TuPasswordAqui123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## 2️⃣ Configuración de Almacenamiento de Imágenes

Tienes 2 opciones: **Cloudinary (recomendado)** o **Firebase Storage**.

### Opción A: Cloudinary (Recomendado)

#### Paso 2A.1: Crear Cuenta

1. Ve a [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Completa el registro
3. Confirma tu email
4. Completa el proceso de onboarding

#### Paso 2A.2: Obtener Credenciales

1. Ve al Dashboard: [https://console.cloudinary.com/](https://console.cloudinary.com/)
2. En la sección **"Product Environment Credentials"**, encontrarás:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click en "eye" para revelar)
3. Guarda estos 3 valores

**Ejemplo:**
```
Cloud Name: stockly-app-12345
API Key: 123456789012345
API Secret: AbCdEfGhIjKlMnOpQrStUvWxYz
```

### Opción B: Firebase Storage (Alternativa)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Firebase Storage
4. Descarga el archivo `serviceAccountKey.json`
5. Colócalo en `Backend/config/firebase-credentials.json`

---

## 3️⃣ Configuración de Variables de Entorno

### Paso 3.1: Generar Secretos JWT

**Opción A - Con Node.js (Recomendado):**
```bash
# Ejecuta este comando DOS VECES para obtener 2 secretos diferentes
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Opción B - Online:**
- Ve a [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)
- Genera 2 secretos diferentes

### Paso 3.2: Crear Archivo .env

1. En la carpeta `Backend/`, crea un archivo llamado `.env`
2. Copia el siguiente contenido y reemplaza los valores:

```env
# ============================================
# BASE DE DATOS (SUPABASE)
# ============================================
DATABASE_URL=postgresql://postgres.tu-ref:tu-password@aws-0-region.pooler.supabase.com:6543/postgres

# ============================================
# JWT (Autenticación)
# ============================================
JWT_SECRET=tu-primer-secreto-de-64-caracteres-hexadecimales-aqui
JWT_REFRESH_SECRET=tu-segundo-secreto-de-64-caracteres-hexadecimales-diferente
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CLOUDINARY (Imágenes)
# ============================================
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# ============================================
# SERVIDOR
# ============================================
PORT=3001
NODE_ENV=development

# ============================================
# OPCIONALES
# ============================================
# OCR (Tesseract)
TESSERACT_LANG=eng+spa

# Seguridad
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Paso 3.3: Verificar Variables

**Checklist:**
- [ ] `DATABASE_URL` - Copiado de Supabase con contraseña correcta
- [ ] `JWT_SECRET` - Generado con 64 caracteres hexadecimales
- [ ] `JWT_REFRESH_SECRET` - Generado y **diferente** al anterior
- [ ] `CLOUDINARY_CLOUD_NAME` - De tu Dashboard de Cloudinary
- [ ] `CLOUDINARY_API_KEY` - De tu Dashboard de Cloudinary
- [ ] `CLOUDINARY_API_SECRET` - De tu Dashboard de Cloudinary
- [ ] `PORT` - 3001 o el puerto que prefieras (diferente al frontend)

---

## 4️⃣ Instalación y Ejecución

### Paso 4.1: Instalar Dependencias

```bash
# Navega a la carpeta Backend
cd Backend

# Instalar todas las dependencias
npm install
```

**Tiempo estimado:** 2-3 minutos

### Paso 4.2: Iniciar Servidor

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# O modo producción
npm start
```

### Paso 4.3: Verificar Inicio Exitoso

Deberías ver en la consola:

```
✅ Database connected successfully
✅ Cloudinary SDK initialized successfully
🚀 Server running on port 3001
📝 Environment: development
```

**Si ves estos mensajes:** ¡Todo está configurado correctamente! 🎉

---

## 5️⃣ Verificación

### Test 1: Health Check

```bash
curl http://localhost:3001/api/v1/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T...",
  "uptime": 42.5
}
```

### Test 2: Registrar Usuario

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Usuario Test",
    "companyName": "Mi Empresa Test",
    "companyAddress": "Calle 123"
  }'
```

**Respuesta esperada (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-del-usuario",
    "email": "test@example.com",
    "name": "Usuario Test"
  },
  "company": {
    "id": "uuid-de-la-empresa",
    "name": "Mi Empresa Test",
    "role": "owner"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

### Test 3: Verificar Base de Datos

Ve a Supabase → **"Table Editor"** → Deberías ver:
- Tabla `users` con 1 registro
- Tabla `companies` con 1 registro
- Tabla `user_company` con 1 registro

---

## Migración de Base de Datos Existente

**Si ya tienes una base de datos en producción** y necesitas agregar las nuevas características (v1.1.0):

### Paso M.1: Backup

```bash
# Desde Supabase Dashboard
# Project Settings → Database → Database Backups → Create Backup
```

### Paso M.2: Ejecutar Migración

1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `Backend/migrations/add-product-improvements.sql`
3. Copia TODO el contenido
4. Pégalo en el editor SQL
5. Click en **"Run"**

**Esto agregará:**
- Columna `parent_id` a `categories`
- Columna `condition` a `products`
- Tabla `product_attributes`
- Tabla `attribute_templates`
- Columna `invitation_code_used` a `user_company`
- Tabla `invitations`
- 4 nuevas vistas
- Índices de performance
- Funciones RPC para invitaciones

### Paso M.3: Verificar Migración

```sql
-- Ejecuta esto en SQL Editor para verificar
SELECT 
  (SELECT COUNT(*) FROM product_attributes) as attributes_count,
  (SELECT COUNT(*) FROM invitations) as invitations_count,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'condition'
  )) as products_has_condition,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  )) as categories_has_parent_id;
```

**Resultado esperado:** Todas las columnas deberían mostrar valores correctos.

### Paso M.4: Reiniciar Backend

```bash
# Detén el servidor (Ctrl + C)
# Vuelve a iniciar
npm run dev
```

---

## Troubleshooting

### ❌ Error: "DATABASE_URL environment variable is required"

**Causa:** No existe el archivo `.env` o está en la ubicación incorrecta.

**Solución:**
```bash
# Verifica que .env esté en Backend/
ls -la Backend/.env

# Si no existe, créalo siguiendo el Paso 3.2
```

---

### ❌ Error: "password authentication failed for user"

**Causa:** La contraseña en `DATABASE_URL` es incorrecta.

**Solución:**
1. Ve a Supabase → Project Settings → Database
2. Click en **"Reset Database Password"**
3. Genera nueva contraseña
4. Actualiza `DATABASE_URL` en tu `.env`
5. Reinicia el servidor

---

### ❌ Error: "Failed to generate invitation code"

**Causa:** No se ejecutó la migración de invitaciones.

**Solución:**
1. Ve a SQL Editor en Supabase
2. Ejecuta:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'generate_invitation_code';
   ```
3. Si retorna 0 filas, ejecuta `migrations/add-invitations-system.sql`

---

### ❌ Error: "Cloudinary SDK not initialized"

**Causa:** Las credenciales de Cloudinary están mal o faltan.

**Solución:**
1. Verifica que en `.env` tengas las 3 variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. Ve al Dashboard de Cloudinary y verifica que copiaste correctamente
3. Reinicia el servidor

---

### ❌ Error: "Port 3001 already in use"

**Causa:** Otro proceso está usando el puerto 3001.

**Solución en Windows:**
```powershell
# Buscar proceso
netstat -ano | findstr :3001

# Matar proceso (reemplaza PID con el número que salió)
taskkill /PID <PID> /F
```

**Solución en Linux/Mac:**
```bash
# Buscar y matar proceso
lsof -ti:3001 | xargs kill -9
```

O cambia el puerto en `.env`:
```env
PORT=3002
```

---

### ❌ Error: "JWT malformed" o "Invalid token"

**Causa:** Los secretos JWT cambiaron o hay tokens antiguos.

**Solución:**
1. Verifica que `JWT_SECRET` y `JWT_REFRESH_SECRET` no tengan espacios
2. Haz logout y login nuevamente
3. Si persiste, borra los tokens del cliente y vuelve a autenticarte

---

## Deploy a Producción

### Opción 1: Railway

1. **Sube tu código a GitHub** (sin `.env`)
2. Ve a [Railway.app](https://railway.app)
3. Click en **"New Project"** → **"Deploy from GitHub repo"**
4. Selecciona tu repositorio
5. Ve a **"Variables"** y agrega todas las del `.env`:
   ```
   DATABASE_URL=...
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://tu-frontend.vercel.app
   ```
6. Railway detectará `package.json` y desplegará automáticamente

### Opción 2: Render

Similar a Railway:
1. Conecta tu repo de GitHub
2. Configura las variables de entorno
3. Deploy automático

### Opción 3: VPS (DigitalOcean, AWS, etc.)

```bash
# En tu servidor
git clone <tu-repo>
cd Backend
npm install --production
npm install -g pm2

# Configurar .env con valores de producción
nano .env

# Iniciar con PM2
pm2 start src/server.js --name stockly-backend
pm2 save
pm2 startup
```

---

## ✅ Checklist Final

- [ ] Supabase proyecto creado
- [ ] Schema ejecutado (init.sql o migración)
- [ ] Cloudinary configurado
- [ ] Archivo .env creado con todos los valores
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor inicia sin errores
- [ ] Test de registro de usuario funciona
- [ ] Tablas visibles en Supabase

---

## 📞 Soporte

- **Documentación API**: [API_REFERENCE.md](API_REFERENCE.md)
- **Arquitectura**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **GitHub Issues**: [Crear Issue](../../issues)

---

**¿Todo listo?** 🎉 Continúa con [API_REFERENCE.md](API_REFERENCE.md) para explorar los endpoints.
