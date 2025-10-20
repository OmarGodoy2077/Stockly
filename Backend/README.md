# 📚 Stockly Backend - Documentación Oficial

**Versión:** 1.1.0  
**Última Actualización:** 20 de Octubre, 2025  
**Estado:** ✅ Listo para Producción

---

## 🎯 ¿Qué es Stockly?

Stockly es un **sistema SaaS multi-tenant** para la gestión integral de inventario, ventas y servicio técnico diseñado para emprendedores en LATAM. Incluye características avanzadas como:

- ✅ **Multi-tenant**: Múltiples empresas y usuarios
- ✅ **Inventario Flexible**: Categorías jerárquicas y atributos dinámicos
- ✅ **Gestión de Ventas**: Con OCR para números de serie
- ✅ **Garantías y Servicio Técnico**: Seguimiento completo
- ✅ **Sistema de Compras**: Registro y actualización automática de stock
- ✅ **Invitaciones**: Sistema de códigos para agregar usuarios

---

## 🚀 Inicio Rápido (5 minutos)

### Nueva Instalación

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd Backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Inicializar base de datos
# En Supabase SQL Editor, ejecutar: database/init.sql

# 5. Iniciar servidor
npm run dev

# ✅ Backend corriendo en http://localhost:3000
```

### Migrar Base de Datos Existente

```bash
# Si ya tienes una base de datos en producción
# En Supabase SQL Editor, ejecutar: migrations/add-product-improvements.sql

npm run dev
```

---

## 📖 Guía de Documentación

### Para Empezar

| Documento | Para Quién | Tiempo | Descripción |
|-----------|-----------|--------|-------------|
| **[README.md](README.md)** (este) | Todos | 5 min | Visión general y guía rápida |
| **[SETUP.md](SETUP.md)** | DevOps/Desarrolladores | 15 min | Configuración completa del entorno |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Desarrolladores Frontend | 30 min | Todos los endpoints con ejemplos |

### Para Profundizar

| Documento | Para Quién | Tiempo | Descripción |
|-----------|-----------|--------|-------------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Arquitectos/Tech Leads | 20 min | Arquitectura del sistema completa |
| **[CHANGELOG.md](CHANGELOG.md)** | Product Managers | 10 min | Historial de cambios por versión |

---

## 🌟 Características Principales

### 1. **Categorías Jerárquicas**
Crea estructuras de categorías con subcategorías ilimitadas:

```
Electrónica
└── Componentes PC
    ├── Procesadores
    ├── Memorias RAM
    │   ├── DDR4
    │   └── DDR5
    └── Almacenamiento
        └── SSDs
```

### 2. **Atributos Dinámicos**
Cada producto puede tener atributos personalizados según su categoría:

**Ejemplo - Componente RAM:**
```json
{
  "Tipo": "DDR4",
  "Capacidad": "16GB",
  "Velocidad": "3200MHz",
  "Marca": "Corsair"
}
```

**Ejemplo - Ropa:**
```json
{
  "Talla": "XL",
  "Color": "Rojo",
  "Material": "Algodón"
}
```

### 3. **Estados de Producto**
- `new` - Producto nuevo sin usar
- `used` - Producto previamente utilizado
- `open_box` - Abierto pero sin usar

### 4. **Sistema de Invitaciones**
Los dueños de empresas pueden generar códigos únicos para invitar usuarios:
- Códigos de 8 caracteres alfanuméricos
- Válidos por 24 horas
- Asignación automática de roles

---

## 🔧 Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Node.js | 20+ |
| Framework | Express.js | 4.19+ |
| Base de Datos | PostgreSQL | 14+ |
| Hosting BD | Supabase | - |
| Autenticación | JWT + bcrypt | - |
| Validación | Zod | 3+ |
| Logging | Winston | 3+ |
| OCR | Tesseract.js | 5+ |
| Almacenamiento | Firebase Storage | 12+ |

---

## 📦 Módulos Implementados

### Core
- ✅ **Autenticación** - Login, registro, refresh tokens
- ✅ **Usuarios** - Gestión de perfiles y permisos
- ✅ **Empresas** - Multi-tenant con aislamiento de datos
- ✅ **Invitaciones** - Sistema de códigos temporales

### Inventario
- ✅ **Productos** - CRUD con categorías y atributos
- ✅ **Categorías** - Jerarquía multinivel
- ✅ **Atributos** - Dinámicos por producto
- ✅ **Compras** - Registro con actualización de stock
- ✅ **Proveedores** - Gestión de proveedores

### Ventas y Servicio
- ✅ **Ventas** - Con OCR para números de serie
- ✅ **Garantías** - Seguimiento automático
- ✅ **Servicio Técnico** - Estados y prioridades
- ✅ **Reportes** - Estadísticas y análisis

---

## 🔐 Seguridad

- **JWT**: Tokens de acceso (15 min) y refresh (7 días)
- **Bcrypt**: Hashing de contraseñas con salt rounds
- **Multi-tenant**: Aislamiento automático por `company_id`
- **RBAC**: Roles: owner, admin, seller, inventory
- **SQL Injection**: Prepared statements en todas las queries
- **CORS**: Configuración restrictiva
- **Rate Limiting**: Protección contra ataques

---

## 📊 Endpoints Principales

### Autenticación
```http
POST   /api/v1/auth/register         # Registro
POST   /api/v1/auth/login            # Login
POST   /api/v1/auth/refresh          # Renovar token
GET    /api/v1/auth/me               # Perfil actual
```

### Productos
```http
GET    /api/v1/products              # Listar productos
POST   /api/v1/products              # Crear producto
GET    /api/v1/products/:id          # Ver producto
PUT    /api/v1/products/:id          # Actualizar producto
DELETE /api/v1/products/:id          # Eliminar producto
```

### Atributos de Productos
```http
GET    /api/v1/products/:id/attributes              # Listar atributos
POST   /api/v1/products/:id/attributes              # Crear atributo
POST   /api/v1/products/:id/attributes/bulk         # Crear múltiples
PUT    /api/v1/products/:id/attributes/:attrId      # Actualizar
DELETE /api/v1/products/:id/attributes/:attrId      # Eliminar
```

### Categorías
```http
GET    /api/v1/categories            # Listar categorías
POST   /api/v1/categories            # Crear categoría
PUT    /api/v1/categories/:id        # Actualizar
DELETE /api/v1/categories/:id        # Eliminar
```

**Ver documentación completa en [API_REFERENCE.md](API_REFERENCE.md)**

---

## 🧪 Testing Rápido

### 1. Registrar Usuario y Crear Empresa
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin Test",
    "companyName": "Mi Empresa",
    "companyAddress": "Dirección 123"
  }'
```

### 2. Crear Producto con Estado
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD001",
    "name": "Laptop Gaming",
    "price": 1500,
    "stock": 5,
    "condition": "new"
  }'
```

### 3. Agregar Atributos Dinámicos
```bash
curl -X POST http://localhost:3000/api/v1/products/PRODUCT_ID/attributes/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": [
      {"name": "Procesador", "value": "Intel i7"},
      {"name": "RAM", "value": "16GB"},
      {"name": "Almacenamiento", "value": "512GB SSD"}
    ]
  }'
```

---

## 🎯 Casos de Uso Soportados

### Tienda de Electrónica
- Categorías: Computadoras → Componentes → RAM/SSD/etc
- Atributos: Marca, Modelo, Capacidad, Velocidad
- Estados: new, open_box

### Tienda de Ropa
- Categorías: Ropa → Hombre/Mujer → Camisas/Pantalones
- Atributos: Talla, Color, Material, Marca
- Estados: new, used

### Ferretería
- Categorías: Herramientas → Eléctricas/Manuales
- Atributos: Voltaje, Potencia, Peso, Marca
- Estados: new, open_box

### Marketplace General
- Categorías jerárquicas ilimitadas
- Atributos totalmente personalizables
- Todos los estados disponibles

---

## 🛠️ Desarrollo

### Estructura del Proyecto
```
Backend/
├── database/
│   └── init.sql                 # Schema inicial completo
├── migrations/
│   └── add-product-improvements.sql  # Migración v1.1
├── src/
│   ├── config/                  # Configuraciones
│   ├── controllers/             # Lógica de negocio
│   ├── middlewares/             # Auth, validación, errores
│   ├── models/                  # Modelos de datos
│   ├── routes/                  # Definición de rutas
│   ├── services/                # Servicios externos
│   ├── utils/                   # Utilidades
│   ├── validations/             # Schemas Zod
│   └── server.js                # Entry point
├── docs/                        # Documentación
└── package.json
```

### Scripts Disponibles
```bash
npm run dev          # Modo desarrollo (nodemon)
npm start            # Modo producción
npm test             # Ejecutar tests
npm run lint         # Verificar código
```

---

## 🔄 Roadmap

### v1.2.0 (Próxima)
- [ ] Sistema de notificaciones en tiempo real
- [ ] Reportes avanzados con gráficos
- [ ] Exportación a PDF/Excel
- [ ] Dashboard personalizable
- [ ] Múltiples monedas

### v2.0.0 (Futuro)
- [ ] Integración con WhatsApp Business
- [ ] App móvil (React Native)
- [ ] Sistema de facturación electrónica
- [ ] Integración con marketplaces
- [ ] BI y análisis predictivo

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar variables de entorno
cat .env | grep DB_

# Verificar conexión a Supabase
psql "postgresql://user:pass@host:5432/dbname"
```

### Error: "JWT token expired"
```bash
# Refrescar token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Error: "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

## 📞 Soporte

- **Documentación**: [docs/](.)
- **Issues**: GitHub Issues
- **Contacto**: [Tu email]

---

## 📄 Licencia

Copyright © 2025 Stockly. Todos los derechos reservados.

---

**¿Listo para empezar?** 👉 Ve a **[SETUP.md](SETUP.md)** para configurar tu entorno.
