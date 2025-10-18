# Guía de Autenticación y Gestión de Empresas - Stockly Backend

## 📖 Descripción General

Stockly es un sistema SaaS multi-tenant donde:
- **Cada usuario puede crear múltiples empresas** o ser invitado a empresas existentes
- **Cada empresa puede tener múltiples usuarios** con diferentes roles
- **Los usuarios se autentican con su email real** y acceden a sus empresas

## 🔐 Flujo de Registro e Inicio de Sesión

### 1. Registro de Nuevo Emprendedor

Cuando un emprendedor se registra por primera vez, automáticamente:
1. Se crea su cuenta de usuario
2. Se crea su primera empresa
3. Se le asigna el rol de `owner` en esa empresa
4. Recibe tokens de acceso (JWT)

```javascript
// Ejemplo de registro
POST /api/v1/auth/register
{
  // Datos del usuario
  "email": "emprendedor@ejemplo.com",
  "password": "Password123!",
  "name": "Juan Pérez",
  "phone": "+502 1234 5678",
  
  // Datos de la empresa
  "companyName": "Mi Tienda SA",
  "companyRuc": "12345678901",
  "companyAddress": "Calle Principal 123",
  "companyPhone": "+502 9876 5432",
  "companyEmail": "contacto@mitienda.com"
}
```

### 2. Inicio de Sesión

Un usuario puede pertenecer a múltiples empresas. Al iniciar sesión:
- Si solo pertenece a una empresa, se conecta automáticamente
- Si pertenece a varias, puede especificar la empresa o cambiarla después

```javascript
// Login simple (selecciona la primera empresa)
POST /api/v1/auth/login
{
  "email": "emprendedor@ejemplo.com",
  "password": "Password123!"
}

// Login especificando empresa
POST /api/v1/auth/login
{
  "email": "emprendedor@ejemplo.com",
  "password": "Password123!",
  "companyId": "uuid-de-la-empresa"
}
```

### 3. Cambiar de Empresa

Si un usuario tiene acceso a múltiples empresas, puede cambiar el contexto:

```javascript
POST /api/v1/users/switch-company/{companyId}
Authorization: Bearer current_jwt_token

// Respuesta: nuevos tokens con el contexto de la nueva empresa
```

## 👥 Roles y Permisos

### Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **owner** | Dueño de la empresa | Acceso completo, puede cambiar roles, eliminar miembros |
| **admin** | Administrador | Gestionar usuarios, configuración, ver todos los datos |
| **seller** | Vendedor | Registrar ventas, ver inventario, buscar productos |
| **inventory** | Inventario | Gestionar productos, compras, ver stock |

### Jerarquía de Permisos

```
owner (máximo poder)
  └─ Puede hacer todo
  └─ Puede cambiar roles de admin, seller, inventory
  └─ No se puede cambiar su propio rol
  
admin
  └─ Puede gestionar usuarios (excepto owner)
  └─ Puede invitar nuevos usuarios
  └─ Puede ver todas las operaciones
  
seller
  └─ Puede registrar ventas
  └─ Puede ver productos y clientes
  └─ No puede modificar inventario
  
inventory
  └─ Puede gestionar productos
  └─ Puede registrar compras
  └─ No puede ver ventas completas
```

## 🏢 Gestión de Empresas

### Crear una Nueva Empresa

Un usuario autenticado puede crear nuevas empresas en cualquier momento:

```javascript
POST /api/v1/companies
Authorization: Bearer jwt_token
{
  "name": "Segunda Tienda SA",
  "ruc": "98765432101",
  "address": "Otra Calle 456",
  "phone": "+502 3333 4444",
  "email": "info@segundatienda.com"
}

// El usuario automáticamente se convierte en owner de la nueva empresa
```

### Invitar Usuarios a la Empresa

Los `owner` y `admin` pueden invitar usuarios:

**Opción 1: Invitar usuario existente (por email)**
```javascript
POST /api/v1/companies/{companyId}/invite
Authorization: Bearer jwt_token
{
  "email": "usuario.existente@email.com",
  "role": "seller"
}
```

**Opción 2: Crear nuevo usuario e invitar**
```javascript
POST /api/v1/companies/{companyId}/invite
Authorization: Bearer jwt_token
{
  "email": "nuevo.empleado@email.com",
  "role": "seller",
  "name": "Nuevo Empleado",
  "phone": "+502 5555 6666",
  "password": "TempPassword123!"  // Opcional
}

// Si no se proporciona password, se genera uno temporal
```

### Gestionar Roles de Miembros

Solo el `owner` puede cambiar roles:

```javascript
// Promover a admin
PATCH /api/v1/companies/{companyId}/members/{userId}/role
Authorization: Bearer jwt_token
{
  "role": "admin"
}

// Degradar a seller
PATCH /api/v1/companies/{companyId}/members/{userId}/role
Authorization: Bearer jwt_token
{
  "role": "seller"
}
```

### Eliminar Miembros

Los `owner` y `admin` pueden eliminar miembros:

```javascript
DELETE /api/v1/companies/{companyId}/members/{userId}
Authorization: Bearer jwt_token

// Restricciones:
// - No puedes eliminarte a ti mismo
// - No puedes eliminar al owner
```

## 🔑 Seguridad y Tokens

### JWT (JSON Web Tokens)

El sistema usa dos tipos de tokens:

**Access Token:**
- Duración: 15 minutos
- Contiene: user_id, email, company_id, role
- Se envía en cada request: `Authorization: Bearer {access_token}`

**Refresh Token:**
- Duración: 7 días
- Se usa para obtener nuevos access tokens sin hacer login
- Se guarda en la base de datos para validación adicional

### Refrescar Token

Cuando el access token expira:

```javascript
POST /api/v1/auth/refresh
{
  "refreshToken": "current_refresh_token"
}

// Respuesta: nuevo access token
```

### Logout

Invalida el refresh token:

```javascript
POST /api/v1/auth/logout
Authorization: Bearer jwt_token
{
  "refreshToken": "current_refresh_token"
}
```

## 📊 Ejemplos de Flujos Completos

### Flujo 1: Emprendedor Crea su Negocio

1. **Registro**
   ```
   POST /api/v1/auth/register
   → Usuario y empresa creados
   → Tokens recibidos
   ```

2. **Configurar perfil**
   ```
   PUT /api/v1/users/profile
   → Actualizar información personal
   ```

3. **Invitar empleados**
   ```
   POST /api/v1/companies/{companyId}/invite (x3)
   → Vendedor 1, Vendedor 2, Encargado de inventario
   ```

4. **Empezar operaciones**
   ```
   POST /api/v1/products → Agregar productos
   POST /api/v1/sales → Registrar ventas
   ```

### Flujo 2: Empleado Invitado

1. **Recibe email con credenciales** (futuro feature)

2. **Primer login**
   ```
   POST /api/v1/auth/login
   → Accede con empresa asignada y rol de seller
   ```

3. **Cambiar contraseña**
   ```
   POST /api/v1/auth/change-password
   → Establece su propia contraseña
   ```

4. **Trabajar en su rol**
   ```
   GET /api/v1/products → Ver inventario
   POST /api/v1/sales → Registrar ventas
   ```

### Flujo 3: Usuario Multi-Empresa

1. **Login en empresa A**
   ```
   POST /api/v1/auth/login
   → Tokens con company_id de empresa A
   ```

2. **Trabajar en empresa A**
   ```
   GET /api/v1/products → Ver productos de empresa A
   POST /api/v1/sales → Vender en empresa A
   ```

3. **Cambiar a empresa B**
   ```
   POST /api/v1/users/switch-company/{companyB_id}
   → Nuevos tokens con company_id de empresa B
   ```

4. **Trabajar en empresa B**
   ```
   GET /api/v1/products → Ver productos de empresa B
   POST /api/v1/sales → Vender en empresa B
   ```

## 🔒 Validaciones y Reglas de Negocio

### Contraseñas
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial

### Emails
- Deben ser únicos en el sistema
- Validación de formato email
- Se convierten a minúsculas automáticamente

### RUC (Registro Único de Contribuyentes)
- Debe ser único por empresa
- Mínimo 5 caracteres
- Máximo 50 caracteres

### Roles
- Un usuario puede tener diferentes roles en diferentes empresas
- El rol `owner` no se puede cambiar
- No puedes cambiar tu propio rol
- Solo el owner puede cambiar roles

### Contexto de Empresa
- Todas las operaciones se realizan en el contexto de una empresa
- El `company_id` se extrae del JWT
- Los datos están aislados por empresa (multi-tenant)

## 🚀 Para Implementar en el Frontend

### Guardar Tokens
```javascript
// Después de login/register
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
localStorage.setItem('currentCompany', JSON.stringify(data.currentCompany));
```

### Interceptor de Axios
```javascript
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expirado, intentar refresh
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      
      // Reintentar request original
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Selector de Empresa
```javascript
// Si el usuario tiene múltiples empresas
const companies = user.companies; // Del login response

// Al seleccionar una empresa diferente
async function switchCompany(companyId) {
  const { data } = await axios.post(`/api/v1/users/switch-company/${companyId}`);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('currentCompany', JSON.stringify(data.company));
  window.location.reload(); // Recargar con nuevo contexto
}
```

## 📝 Notas Importantes

1. **Multi-Tenant**: Cada empresa ve solo sus propios datos
2. **Emails Reales**: Los usuarios necesitan emails válidos para autenticación
3. **Escalabilidad**: Un usuario puede pertenecer a ilimitadas empresas
4. **Seguridad**: Row Level Security (RLS) en PostgreSQL para aislamiento de datos
5. **Tokens**: Los refresh tokens se guardan en la base de datos para mayor seguridad

## 🔜 Próximas Implementaciones

- [ ] Verificación de email
- [ ] Recuperación de contraseña por email
- [ ] Invitaciones por email con links únicos
- [ ] 2FA (Autenticación de dos factores)
- [ ] OAuth2 (Google, Facebook)
- [ ] Logs de auditoría detallados
- [ ] Límites de rate limiting por rol
