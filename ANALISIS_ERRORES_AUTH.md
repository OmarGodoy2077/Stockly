# Análisis de Errores - Sistema de Autenticación y Registro

## Problemas Identificados

### 1. **CRÍTICO: Validación Contradictoria en auth.schema.js**
**Ubicación:** `Backend/src/validations/auth.schema.js` (línea 62-75)

```javascript
.refine(
    (data) => {
        if (data.invitationCode) {
            return !data.companyName && !data.companyAddress; // ✓ Correcto
        }
        // ✗ PROBLEMA: Requiere TODOS estos campos:
        return data.companyName && data.companyAddress && data.companyPhone;
    },
```

**Problema:** El flujo exige que el usuario proporcione `companyName`, `companyAddress` Y `companyPhone` durante el registro. Pero según la BD (init.sql):
- `companies.ruc` es UNIQUE pero **NOT NULL** (sin valor default)
- `companies.phone` puede ser NULL
- No se captura `companyRuc` en el frontend

**Estado Actual en BD:**
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    ruc VARCHAR(50) UNIQUE NOT NULL,  -- ← PROBLEMA: UNIQUE NOT NULL
    phone VARCHAR(50),  -- ← NULL permitido
    ...
)
```

**Impacto:** 
- Usuario no puede registrarse sin RUC
- Pero el frontend no pide RUC en el campo de registro
- Aunque lo pidiera, el usuario no tiene RUC en ese momento

---

### 2. **CRÍTICO: Falta RUC en Creación de Empresa**
**Ubicación:** `Backend/src/models/company.model.js` (línea 8-27)

```javascript
static async create({ name, address, phone, email, website, logoUrl }) {
    // ✗ PROBLEMA: NO recibe NI valida RUC
    const { data, error } = await database.supabase
        .from('companies')
        .insert({
            name,
            address,
            phone,
            email,
            website,
            logo_url: logoUrl
            // ← FALTA: ruc
        })
```

**Impacto:** La inserción falla porque `ruc` es NOT NULL.

---

### 3. **Frontend: Captura Innecesaria de RUC**
**Ubicación:** `Frontend/src/pages/Auth/Register.tsx` (línea 30)

```tsx
companyRuc: z.string()
    .regex(/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos numéricos'),
```

**Problema:** 
- Pide RUC al usuario en el registro
- Pero NUNCA lo envía al backend (ver Register.handleCreateSubmit)
- El usuario probablemente no tenga RUC en ese momento

**Flujo Actual (Incorrecto):**
```
Usuario → Pide nombre, email, password, RUC, empresa
         → Envía al backend SOLO: name, email, password, phone
         → Backend espera RUC pero no lo recibe
         → FALLO
```

---

### 4. **CRÍTICO: Flujo de Registro Incorrecto**
**Problema General:** El flujo actual asume que:
- Usuario DEBE crear empresa AL REGISTRARSE
- Usuario DEBE tener RUC AL REGISTRARSE

**Pero la lógica correcta es:**
```
1. Usuario crea CUENTA (email, password, nombre)
2. Usuario crea EMPRESA (nombre, RUC, dirección, etc.)
   - O se une a empresa existente con código
3. Usuario accede al Dashboard
```

**Impacto:** Es imposible registrarse correctamente.

---

### 5. **Invitaciones: Código Incorrecto**
**Ubicación:** `Frontend/src/pages/Auth/Register.tsx` (línea 48)

```tsx
invitationCode: z.string()
    .length(8, 'El código de invitación debe tener 8 caracteres')
    .regex(/^[A-Z0-9]{8}$/, 'El código de invitación solo puede contener letras mayúsculas y números'),
```

**Pero según init.sql:**
```sql
CREATE TABLE invitations (
    ...
    code VARCHAR(12) UNIQUE NOT NULL,  -- ← Es de 12, no 8!
    ...
)
```

**Impacto:** Usuario NO puede unirse con código porque valida 8 caracteres pero el sistema genera 12.

---

### 6. **joinCompany no Captura name**
**Ubicación:** `Frontend/src/pages/Auth/Register.tsx` (línea 120-127)

```tsx
const handleJoinSubmit = async (data: JoinCompanySchema) => {
    const response = await joinCompany(data.invitationCode);
    // ✗ NO ENVÍA: email, password, nombre
    // ✓ SOLO envía: invitationCode
```

**Problema:** El usuario debe registrarse (crear account) al mismo tiempo que se une. Falta:
- `email`
- `password`
- `name`

**Validación en Frontend:**
```tsx
const joinCompanySchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()...,
  confirmPassword: z.string()...,
  invitationCode: z.string()...
})
```

Pero solo envía el código. **INCONSISTENCIA TOTAL**.

---

### 7. **Login sin Empresa**
**Problema:** Si un usuario se registra pero NO ha creado empresa, ¿qué sucede en login?

**Backend - auth.controller.js (línea 210-270):**
```javascript
const userCompanies = await UserModel.getUserCompanies(userId);

if (!userCompanies || userCompanies.length === 0) {
    return res.status(400).json({
        success: false,
        error: 'User has no companies'
    });
    // ✗ RECHAZO USUARIOS SIN EMPRESA
}
```

**Problema:** Usuario NO puede loguearse si no tiene empresa. Pero el flujo actual:
1. Usuario se registra (sin poder crear empresa correctamente)
2. Usuario intenta loguearse
3. Sistema rechaza porque no tiene empresa
4. **USUARIO BLOQUEADO**

---

### 8. **Teléfono No es Verdaderamente Opcional**
**Frontend:** `phone` es `.optional()`
**Backend:** `phone` requiere formato específico en validación

Inconsistencia menor pero confusa.

---

## Soluciones Propuestas

### Opción A: Crear Empresa DESPUÉS de Registro (RECOMENDADO)

**Flujo:**
```
1. Registro (email, password, name, phone)
   ↓
2. Usuario logueado SIN empresa
   ↓
3. Dashboard → Opción "Crear Empresa" O "Unirse con Código"
   ↓
4. Si crea empresa: generar RUC temporal automáticamente
5. Usuario puede actualizar RUC después
```

**Ventajas:**
- Simple y lógico
- Permite usuario sin empresa inicialmente
- Empresa puede crearse más tarde
- Unirse con código es más claro

### Opción B: RUC Generado Automáticamente
- Sistema genera RUC temporal (UUID truncado o contador)
- Usuario puede actualizarlo después en perfil de empresa
- Evita requerir RUC en registro

---

## Cambios Necesarios

1. **auth.schema.js**: Remover lógica de refine que requiere empresa. Empresa es OPCIONAL.
2. **company.model.js**: Generar RUC si no se proporciona (UUID como fallback)
3. **auth.controller.js**: Permitir login sin empresa. Redirigir a "crear empresa".
4. **Frontend Register.tsx**: 
   - Cambiar flujo a solo capturar user data
   - Nueva pantalla para crear empresa DESPUÉS del registro
   - Corregir validación de código (12 caracteres, no 8)
5. **invitation.model.js**: Validar que soporte flujo completo
6. **init.sql**: Considerar hacer RUC UNIQUE pero permitir NULL, o tener default

