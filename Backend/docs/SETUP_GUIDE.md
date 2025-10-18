# 🚀 Guía Rápida de Configuración

## ⚡ Setup en 5 Minutos

### 1️⃣ Configurar Supabase (Base de Datos)

**a) Crear proyecto:**
1. Ve a https://supabase.com
2. Click en "New Project"
3. Elige nombre, password y región
4. Espera 2 minutos mientras se crea

**b) Crear tablas:**
1. En tu proyecto, ve a **SQL Editor**
2. Click en "New Query"
3. Copia y pega TODO el contenido de `database/init.sql`
4. Click en "Run" (▶️)
5. Verifica que no haya errores

**c) Obtener DATABASE_URL:**
1. Ve a **Project Settings** (⚙️) → **Database**
2. Busca "Connection String"
3. Selecciona **URI**
4. Copia la URL completa
5. **IMPORTANTE**: Reemplaza `[YOUR-PASSWORD]` con la contraseña que pusiste al crear el proyecto

```bash
# Ejemplo (con datos ficticios):
DATABASE_URL=postgresql://postgres.abcdef123:MiPassword123!@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 2️⃣ Configurar Cloudinary (Imágenes)

**a) Crear cuenta gratuita:**
1. Ve a https://cloudinary.com/users/register/free
2. Completa el registro
3. Confirma tu email

**b) Obtener credenciales:**
1. Ve al Dashboard: https://console.cloudinary.com/
2. Verás "Account Details" (o "Product Environment Credentials")
3. Copia los 3 valores:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

```bash
# Ejemplo:
CLOUDINARY_CLOUD_NAME=stockly-app
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 3️⃣ Generar Secretos JWT

**Opción A - Con Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecuta el comando 2 veces para generar 2 secretos diferentes.

**Opción B - Online:**
Ve a https://generate-secret.vercel.app/32

```bash
# Ejemplo:
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345
JWT_REFRESH_SECRET=9876543210fedcba0987654321fedcba09876543210fedcba0987654321fedc
```

### 4️⃣ Crear archivo .env

```bash
# En la raíz del proyecto Backend:
cp .env.template .env
```

Luego edita `.env` con tus valores reales:

```env
# Supabase
DATABASE_URL=postgresql://postgres.tu-ref:tu-password@aws-0-region.pooler.supabase.com:6543/postgres

# JWT
JWT_SECRET=tu-secreto-jwt-de-32-caracteres-minimo
JWT_REFRESH_SECRET=otro-secreto-diferente-de-32-caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Server
PORT=3001
NODE_ENV=development

# Opcional
TESSEACT_LANG=eng+spa
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 5️⃣ Instalar y Ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

Deberías ver:
```
✅ Database connected successfully
✅ Cloudinary SDK initialized successfully
✅ Server running on port 3001
```

---

## 🔍 Verificación Paso a Paso

### ✅ Checklist de Variables

- [ ] `DATABASE_URL` - De Supabase
- [ ] `JWT_SECRET` - Generado aleatoriamente
- [ ] `JWT_REFRESH_SECRET` - Generado aleatoriamente (diferente al anterior)
- [ ] `CLOUDINARY_CLOUD_NAME` - De Cloudinary Dashboard
- [ ] `CLOUDINARY_API_KEY` - De Cloudinary Dashboard
- [ ] `CLOUDINARY_API_SECRET` - De Cloudinary Dashboard

### 🧪 Probar la Configuración

**1. Probar Base de Datos:**
```bash
npm run dev
```
Si ves "Database connected successfully" ✅

**2. Probar Cloudinary:**
Sube una imagen a través de la API y verifica en:
https://console.cloudinary.com/console/media_library

**3. Probar Autenticación:**
```bash
# Usa Postman o Thunder Client
POST http://localhost:3001/api/v1/auth/register
```

---

## ❌ Problemas Comunes

### Error: "DATABASE_URL environment variable is required"
- **Causa**: No tienes archivo `.env` o está mal ubicado
- **Solución**: Crea `.env` en la raíz de `Backend/` (mismo nivel que `package.json`)

### Error: "password authentication failed"
- **Causa**: La contraseña en DATABASE_URL es incorrecta
- **Solución**: 
  1. Ve a Supabase → Project Settings → Database
  2. Click en "Reset Database Password"
  3. Actualiza tu `.env`

### Error: "Cloudinary not initialized"
- **Causa**: Las credenciales de Cloudinary están mal
- **Solución**: Verifica que copiaste correctamente Cloud Name, API Key y API Secret

### Error: "connection refused"
- **Causa**: Estás usando `localhost` en DATABASE_URL
- **Solución**: Usa la URL completa de Supabase, no localhost

---

## 🚀 Deploy a Railway

Cuando estés listo para producción:

1. **Sube tu código a GitHub** (sin `.env`)
2. **Conecta Railway a tu repo**
3. **Configura las variables de entorno** en Railway Dashboard:
   - Usa las mismas variables que en `.env`
   - Cambia `NODE_ENV=production`
   - Cambia `CORS_ORIGIN` a la URL de tu frontend en producción

---

## 📚 Recursos

- **Supabase Docs**: https://supabase.com/docs
- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Railway Docs**: https://docs.railway.app

## 💡 Tips

- Usa diferentes credenciales para desarrollo y producción
- Guarda tus contraseñas en un gestor seguro (1Password, Bitwarden)
- Nunca subas el archivo `.env` a Git
- Rota tus secretos JWT cada cierto tiempo en producción
