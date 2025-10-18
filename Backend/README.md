# Stockly Backend - SaaS para Gestión de Inventario

Backend moderno para sistema de gestión de inventario con soporte para ventas, garantías, números de serie y servicio técnico.

## 🚀 Características Principales

- **Gestión de Empresas**: Multi-tenant con roles de usuario (owner, admin, seller, inventory)
- **Productos**: Control de inventario con SKU, stock y precios
- **Ventas**: Registro de ventas con extracción automática de números de serie vía OCR
- **Garantías**: Seguimiento automático de fechas de vencimiento y alertas
- **Servicio Técnico**: Historial completo con fotos y estados de reparación
- **Compras**: Registro de entradas de inventario
- **Autenticación JWT**: Con refresh tokens y seguridad avanzada
- **Almacenamiento**: Integración con Cloudinary para imágenes optimizadas
- **OCR**: Procesamiento automático de números de serie desde imágenes

## 📋 Prerrequisitos

- **Node.js 20+**
- **Cuenta de Supabase** con un proyecto PostgreSQL creado
- **Cuenta de Cloudinary** (gratuita) para almacenamiento de imágenes
- **Git** para control de versiones

## 🛠️ Instalación

1. **Clona el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd stockly-backend
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura la base de datos en Supabase:**
   
   a. Crea un proyecto en [Supabase](https://supabase.com) (si no tienes uno)
   
   b. Ve a **SQL Editor** en el menú lateral
   
   c. Crea una nueva query
   
   d. Copia y pega el contenido completo del archivo `database/init.sql`
   
   e. Ejecuta el script haciendo clic en **"Run"** ▶️
   
   f. Verifica que todas las tablas se hayan creado en la sección **Table Editor**

4. **Configura las variables de entorno:**
   
   Crea un archivo `.env` en la raíz del proyecto Backend:
   ```bash
   cp .env.template .env
   # o si prefieres:
   # cp .env.example .env
   ```

   **📋 Variables Requeridas** (obtén las instrucciones en [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)):
   
   ```env
   # Supabase Database (desde Project Settings > Database > Connection String)
   DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres

   # JWT (genera secretos aleatorios seguros)
   JWT_SECRET=genera-un-secreto-de-32-caracteres-minimo
   JWT_REFRESH_SECRET=otro-secreto-diferente

   # Cloudinary (desde Dashboard > Account Details)
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-api-secret

   # Server
   PORT=3001
   NODE_ENV=development
   ```

   **📖 Ver Guía Completa**: [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) tiene instrucciones paso a paso para obtener cada credencial.

5. **Inicia el servidor:**
   ```bash
   # Desarrollo (con hot-reload)
   npm run dev

   # Producción
   npm start
   ```

   Si todo está configurado correctamente, deberías ver:
   ```
   ✅ Database connected successfully
   ✅ Cloudinary SDK initialized successfully  
   🚀 Stockly Backend Server started successfully
   ```

## 📁 Estructura del Proyecto

```
src/
├── config/           # Configuraciones
│   ├── database.js   # Conexión a PostgreSQL
│   ├── jwt.js        # Configuración JWT
│   ├── logger.js     # Winston logger
│   ├── firebase.js   # Firebase Admin SDK
│   └── tesseract.js  # Configuración OCR
├── controllers/      # Lógica de negocio
│   ├── auth.controller.js
│   ├── product.controller.js
│   ├── sale.controller.js
│   └── serviceHistory.controller.js
├── routes/           # Definición de rutas
│   ├── auth.routes.js
│   ├── product.routes.js
│   └── sale.routes.js
├── middlewares/      # Middlewares reutilizables
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   └── validation.middleware.js
├── models/           # Consultas a base de datos
│   ├── user.model.js
│   ├── product.model.js
│   └── sale.model.js
├── services/         # Servicios externos
│   ├── firebaseStorage.service.js
│   └── ocr.service.js
├── utils/            # Utilidades
│   ├── dateUtils.js
│   └── responseHandler.js
├── validations/      # Esquemas de validación
│   ├── auth.schema.js
│   └── product.schema.js
└── server.js         # Punto de entrada

database/
└── init.sql          # Script de inicialización de BD

docs/
├── ARCHITECTURE.md  # Documentación de arquitectura
├── API.md           # Documentación de API
└── README.md        # Esta documentación
```

## 🔧 Configuración para Railway (Despliegue)

1. **Variables de entorno en Railway:**
   - `DATABASE_URL`: URL de PostgreSQL desde Supabase (Settings → Database → Connection string)
   - `SUPABASE_URL`: https://[PROJECT-REF].supabase.co
   - `SUPABASE_ANON_KEY`: Tu anon/public key de Supabase
   - `JWT_SECRET`: Genera uno seguro (mínimo 32 caracteres)
   - `JWT_REFRESH_SECRET`: Otro secreto diferente para refresh tokens
   - `CLOUDINARY_CLOUD_NAME`: Tu cloud name de Cloudinary
   - `CLOUDINARY_API_KEY`: API key de Cloudinary
   - `CLOUDINARY_API_SECRET`: API secret de Cloudinary
   - `NODE_ENV=production`
   - `PORT=3001` (Railway lo puede sobrescribir automáticamente)

2. **Build Command:**
   ```bash
   npm install
   ```

3. **Start Command:**
   ```bash
   npm start
   ```

4. **Despliegue:**
   - Conecta tu repositorio de GitHub a Railway
   - Railway detectará automáticamente que es un proyecto Node.js
   - Configura todas las variables de entorno listadas arriba
   - El despliegue se realizará automáticamente

## 📚 Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo con hot-reload
- `npm start` - Inicia servidor en producción
- `npm run lint` - Ejecuta ESLint para verificar código

## 📖 Documentación Adicional

Consulta la carpeta `docs/` para documentación detallada:

- **[API.md](docs/API.md)** - Documentación completa de endpoints y ejemplos
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura del sistema y modelo de datos
- **[AUTHENTICATION_GUIDE.md](docs/AUTHENTICATION_GUIDE.md)** - Guía de autenticación JWT
- **[IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Resumen de implementación
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Guía completa de despliegue en Supabase y Railway

## 🔒 Seguridad

- Todas las contraseñas se hashean con bcrypt
- JWT con refresh tokens para seguridad mejorada
- Validación estricta de datos con Zod
- Middlewares de autenticación y autorización
- Logging estructurado para auditoría
- Imágenes almacenadas de forma segura en Cloudinary
- Optimización automática de imágenes con WebP

## 🚀 Despliegue en Producción

1. **Railway (Recomendado):**
   - Conecta tu repositorio de GitHub
   - Configura las variables de entorno
   - Railway detectará automáticamente Node.js
   - El despliegue es automático en cada push

2. **Variables críticas para producción:**
   ```env
   NODE_ENV=production
   JWT_SECRET=un-secreto-muy-largo-y-seguro
   JWT_REFRESH_SECRET=otro-secreto-diferente-y-seguro
   ```

## 🤝 Soporte

Para soporte técnico o consultas sobre la implementación, revisa la documentación en `/docs` o contacta al equipo de desarrollo.

## 📄 Licencia

Este proyecto es propiedad de Stockly. Todos los derechos reservados.