import { z } from 'zod';

/**
 * Authentication validation schemas using Zod
 */

// Email validation pattern
const emailSchema = z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim();

// Password validation pattern
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Phone validation pattern (optional)
const phoneSchema = z.string()
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format')
    .min(8, 'Phone must be at least 8 characters')
    .max(20, 'Phone must not exceed 20 characters')
    .optional();

/**
 * Register schema - Flujo unificado
 * 
 * IMPORTANTE: El usuario SIEMPRE debe crear empresa O unirse con código en el registro.
 * NO hay usuarios sin empresa.
 * 
 * Dos flujos:
 * 1. Crear usuario + empresa: email, password, name, phone, companyName (y opcionalmente RUC, address, etc)
 * 2. Crear usuario + unirse: email, password, name, phone, invitationCode
 */
const registerSchema = z.object({
    // User fields (required)
    email: emailSchema,
    password: passwordSchema,
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .trim(),
    phone: phoneSchema,

    // Invitation code (optional) - para unirse a empresa existente
    invitationCode: z.string()
        .length(12, 'Invitation code must be exactly 12 characters')
        .regex(/^[A-Z0-9]{12}$/, 'Invitation code must contain only uppercase letters and numbers')
        .optional(),

    // Company fields (optional) - para crear empresa
    // Si NO hay invitationCode, SÍ se necesita companyName
    companyName: z.string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255, 'Company name must not exceed 255 characters')
        .trim()
        .optional(),
    companyAddress: z.string()
        .max(500, 'Company address must not exceed 500 characters')
        .trim()
        .optional(),
    companyPhone: phoneSchema,
    companyEmail: emailSchema.optional(),
    companyWebsite: z.string()
        .url('Invalid website URL')
        .optional()
})
// CRUCIAL: Validación de que tiene AMBAS opciones O una de ellas
.refine(
    (data) => {
        // Debe tener invitationCode O companyName (pero no ambos)
        const hasInvitation = !!data.invitationCode;
        const hasCompanyName = !!data.companyName;
        
        // Si tiene código: NO puede tener datos de empresa
        if (hasInvitation) {
            return !hasCompanyName && !data.companyAddress && !data.companyEmail && !data.companyWebsite;
        }
        
        // Si NO tiene código: DEBE tener companyName
        return hasCompanyName;
    },
    {
        message: 'Must provide either invitation code OR company details (name required)',
        path: ['invitationCode']
    }
);

/**
 * Login schema
 */
const loginSchema = z.object({
    email: emailSchema,
    password: z.string()
        .min(1, 'Password is required'),
    companyId: z.string()
        .uuid('Invalid company ID format')
        .optional()
});

/**
 * Refresh token schema
 */
const refreshSchema = z.object({
    refreshToken: z.string()
        .min(1, 'Refresh token is required')
});

/**
 * Logout schema
 */
const logoutSchema = z.object({
    refreshToken: z.string()
        .min(1, 'Refresh token is required')
});

/**
 * Change password schema
 */
const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Current password is required'),
    newPassword: passwordSchema
}).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
});

/**
 * Forgot password schema
 */
const forgotPasswordSchema = z.object({
    email: emailSchema
});

/**
 * Reset password schema (for future use)
 */
const resetPasswordSchema = z.object({
    token: z.string()
        .min(1, 'Reset token is required'),
    newPassword: passwordSchema
});

/**
 * Verify email schema (for future use)
 */
const verifyEmailSchema = z.object({
    token: z.string()
        .min(1, 'Verification token is required')
});

// Export all schemas
export const schemas = {
    register: registerSchema,
    login: loginSchema,
    refresh: refreshSchema,
    logout: logoutSchema,
    changePassword: changePasswordSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    verifyEmail: verifyEmailSchema
};

// Export individual schemas for flexibility
export {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    emailSchema,
    passwordSchema,
    phoneSchema
};
