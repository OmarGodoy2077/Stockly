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
 * Register schema - User registration with company creation
 */
const registerSchema = z.object({
    // User fields
    email: emailSchema,
    password: passwordSchema,
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .trim(),
    phone: phoneSchema,

    // Company fields
    companyName: z.string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255, 'Company name must not exceed 255 characters')
        .trim(),
    companyRuc: z.string()
        .min(5, 'RUC must be at least 5 characters')
        .max(50, 'RUC must not exceed 50 characters')
        .trim(),
    companyAddress: z.string()
        .max(500, 'Address must not exceed 500 characters')
        .optional(),
    companyPhone: phoneSchema,
    companyEmail: z.string()
        .email('Invalid company email format')
        .optional(),
    companyWebsite: z.string()
        .url('Invalid website URL')
        .optional()
        .or(z.literal('')),
});

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
