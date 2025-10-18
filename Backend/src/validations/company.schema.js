import { z } from 'zod';
import { phoneSchema, emailSchema } from './auth.schema.js';

/**
 * Company validation schemas using Zod
 */

/**
 * Create company schema
 */
const createCompanySchema = z.object({
    name: z.string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255, 'Company name must not exceed 255 characters')
        .trim(),
    ruc: z.string()
        .min(5, 'RUC must be at least 5 characters')
        .max(50, 'RUC must not exceed 50 characters')
        .trim(),
    address: z.string()
        .max(500, 'Address must not exceed 500 characters')
        .optional(),
    phone: phoneSchema,
    email: emailSchema.optional(),
    website: z.string()
        .url('Invalid website URL')
        .optional()
        .or(z.literal(''))
});

/**
 * Update company schema
 */
const updateCompanySchema = z.object({
    name: z.string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255, 'Company name must not exceed 255 characters')
        .trim()
        .optional(),
    address: z.string()
        .max(500, 'Address must not exceed 500 characters')
        .optional(),
    phone: phoneSchema,
    email: emailSchema.optional(),
    website: z.string()
        .url('Invalid website URL')
        .optional()
        .or(z.literal('')),
    logo_url: z.string()
        .url('Invalid logo URL')
        .optional()
        .or(z.literal(''))
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
});

/**
 * Invite user to company schema
 */
const inviteUserSchema = z.object({
    email: emailSchema,
    role: z.enum(['admin', 'seller', 'inventory'], {
        errorMap: () => ({ message: 'Role must be admin, seller, or inventory' })
    }),
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .trim()
        .optional(),
    phone: phoneSchema,
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must not exceed 100 characters')
        .optional()
});

/**
 * Update user role schema
 */
const updateRoleSchema = z.object({
    role: z.enum(['admin', 'seller', 'inventory'], {
        errorMap: () => ({ message: 'Role must be admin, seller, or inventory' })
    })
});

/**
 * Add existing user to company schema
 */
const addUserSchema = z.object({
    userId: z.string()
        .uuid('Invalid user ID format'),
    role: z.enum(['admin', 'seller', 'inventory'], {
        errorMap: () => ({ message: 'Role must be admin, seller, or inventory' })
    })
});

// Export all schemas
export const schemas = {
    createCompany: createCompanySchema,
    updateCompany: updateCompanySchema,
    inviteUser: inviteUserSchema,
    updateRole: updateRoleSchema,
    addUser: addUserSchema
};

// Export individual schemas
export {
    createCompanySchema,
    updateCompanySchema,
    inviteUserSchema,
    updateRoleSchema,
    addUserSchema
};
