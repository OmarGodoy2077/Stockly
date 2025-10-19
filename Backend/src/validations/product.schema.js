import { z } from 'zod';

/**
 * Product validation schemas using Zod
 */

// Base product schema
const productBaseSchema = z.object({
    sku: z.string()
        .min(1, 'SKU es requerido')
        .max(100, 'SKU no puede exceder 100 caracteres')
        .regex(/^[A-Z0-9\-_]+$/, 'SKU solo puede contener letras, números, guiones y guiones bajos'),

    name: z.string()
        .min(1, 'Nombre es requerido')
        .max(255, 'Nombre no puede exceder 255 caracteres'),

    description: z.string()
        .max(1000, 'Descripción no puede exceder 1000 caracteres')
        .optional(),

    price: z.number()
        .min(0, 'Precio debe ser mayor o igual a 0')
        .max(999999.99, 'Precio no puede exceder 999,999.99'),

    stock: z.number()
        .int('Stock debe ser un número entero')
        .min(0, 'Stock debe ser mayor o igual a 0')
        .max(999999, 'Stock no puede exceder 999,999'),

    min_stock: z.number()
        .int('Stock mínimo debe ser un número entero')
        .min(0, 'Stock mínimo debe ser mayor o igual a 0')
        .max(999999, 'Stock mínimo no puede exceder 999,999')
        .default(5),

    category_id: z.string()
        .uuid('ID de categoría inválido')
        .optional(),

    image_url: z.string()
        .url('URL de imagen inválida')
        .max(500, 'URL de imagen no puede exceder 500 caracteres')
        .optional(),

    barcode: z.string()
        .max(255, 'Código de barras no puede exceder 255 caracteres')
        .optional()
});

// Create product schema
const createProductSchema = productBaseSchema;

// Update product schema (all fields optional except id)
const updateProductSchema = z.object({
    category_id: z.string().uuid('ID de categoría inválido').optional(),
    sku: z.string()
        .min(1, 'SKU es requerido')
        .max(100, 'SKU no puede exceder 100 caracteres')
        .regex(/^[A-Z0-9\-_]+$/, 'SKU solo puede contener letras, números, guiones y guiones bajos')
        .optional(),

    name: z.string()
        .min(1, 'Nombre es requerido')
        .max(255, 'Nombre no puede exceder 255 caracteres')
        .optional(),

    description: z.string()
        .max(1000, 'Descripción no puede exceder 1000 caracteres')
        .optional(),

    price: z.number()
        .min(0, 'Precio debe ser mayor o igual a 0')
        .max(999999.99, 'Precio no puede exceder 999,999.99')
        .optional(),

    min_stock: z.number()
        .int('Stock mínimo debe ser un número entero')
        .min(0, 'Stock mínimo debe ser mayor o igual a 0')
        .max(999999, 'Stock mínimo no puede exceder 999,999')
        .optional(),

    image_url: z.string()
        .url('URL de imagen inválida')
        .max(500, 'URL de imagen no puede exceder 500 caracteres')
        .optional(),

    barcode: z.string()
        .max(255, 'Código de barras no puede exceder 255 caracteres')
        .optional()
});

// Update stock schema
const updateStockSchema = z.object({
    stock: z.number()
        .int('Stock debe ser un número entero')
        .min(0, 'Stock debe ser mayor o igual a 0')
        .max(999999, 'Stock no puede exceder 999,999'),

    operation: z.enum(['set', 'add', 'subtract'])
        .default('set')
});

// Query parameters schema
const productQuerySchema = z.object({
    page: z.string()
        .regex(/^\d+$/, 'Página debe ser un número')
        .transform(val => parseInt(val))
        .refine(val => val > 0, 'Página debe ser mayor a 0')
        .optional()
        .default(1),

    limit: z.string()
        .regex(/^\d+$/, 'Límite debe ser un número')
        .transform(val => parseInt(val))
        .refine(val => val > 0 && val <= 100, 'Límite debe estar entre 1 y 100')
        .optional()
        .default(20),

    category: z.string()
        .uuid('ID de categoría inválido')
        .optional(),

    search: z.string()
        .min(1, 'Búsqueda no puede estar vacía')
        .max(100, 'Búsqueda no puede exceder 100 caracteres')
        .optional(),

    stock_status: z.enum(['low', 'out', 'available'])
        .optional(),

    sort_by: z.enum(['name', 'sku', 'price', 'stock', 'created_at'])
        .default('name'),

    sort_order: z.enum(['ASC', 'DESC'])
        .default('ASC')
});

// Bulk update schema
const bulkUpdateProductSchema = z.object({
    products: z.array(z.object({
        id: z.string().uuid('ID de producto inválido'),
        updates: updateProductSchema
    }))
    .min(1, 'Debe incluir al menos un producto')
    .max(100, 'No puede actualizar más de 100 productos a la vez')
});

// Export validation schemas for use in routes
export const schemas = {
    createProduct: createProductSchema,
    updateProduct: updateProductSchema,
    updateStock: updateStockSchema,
    productQuery: productQuerySchema,
    bulkUpdate: bulkUpdateProductSchema
};

// Export individual schemas for direct use
export {
    productBaseSchema,
    createProductSchema,
    updateProductSchema,
    updateStockSchema,
    productQuerySchema,
    bulkUpdateProductSchema
};