import { z } from 'zod';
import { phoneSchema } from './auth.schema.js';

/**
 * User validation schemas using Zod
 */

/**
 * Update user profile schema
 */
const updateProfileSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .trim()
        .optional(),
    phone: phoneSchema
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
});

/**
 * User ID param schema
 */
const userIdSchema = z.object({
    userId: z.string()
        .uuid('Invalid user ID format')
});

// Export all schemas
export const schemas = {
    updateProfile: updateProfileSchema,
    userId: userIdSchema
};

// Export individual schemas
export {
    updateProfileSchema,
    userIdSchema
};
