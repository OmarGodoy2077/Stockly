import { z } from 'zod';

/**
 * Sale validation schemas using Zod
 */

// Product item in sale
const saleProductSchema = z.object({
    product_id: z.string()
        .uuid('ID de producto inválido'),
    quantity: z.number()
        .int('La cantidad debe ser un número entero')
        .min(1, 'La cantidad debe ser mayor a 0'),
    unit_price: z.number()
        .min(0, 'El precio debe ser mayor o igual a 0'),
    discount: z.number()
        .min(0, 'El descuento debe ser mayor o igual a 0')
        .optional()
        .default(0),
    serial_number: z.string()
        .max(255, 'El número de serie no puede exceder 255 caracteres')
        .optional()
});

// Create sale schema
const createSaleSchema = z.object({
    customer_name: z.string()
        .min(1, 'El nombre del cliente es requerido')
        .max(255, 'El nombre del cliente no puede exceder 255 caracteres'),
    customer_email: z.string()
        .email('Email inválido')
        .optional(),
    customer_phone: z.string()
        .max(50, 'El teléfono no puede exceder 50 caracteres')
        .optional(),
    customer_address: z.string()
        .max(500, 'La dirección no puede exceder 500 caracteres')
        .optional(),
    items: z.array(saleProductSchema)
        .min(1, 'Debe incluir al menos un producto en la venta'),
    warranty_months: z.number()
        .int('El período de garantía debe ser un número entero')
        .min(0, 'El período de garantía debe ser mayor o igual a 0')
        .max(120, 'El período de garantía no puede exceder 120 meses')
        .optional()
        .default(12),
    payment_method: z.enum(['cash', 'card', 'check', 'transfer'])
        .optional()
        .default('cash'),
    sales_platform: z.enum(['direct', 'amazon', 'ebay', 'shopify', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'marketplace', 'otros'])
        .optional()
        .default('direct'),
    notes: z.string()
        .max(1000, 'Las notas no pueden exceder 1000 caracteres')
        .optional(),
    discount_amount: z.number()
        .min(0, 'El descuento debe ser mayor o igual a 0')
        .optional()
        .default(0),
    serial_image: z.string()
        .optional(),
    serial_number: z.string()
        .max(255, 'El número de serie no puede exceder 255 caracteres')
        .optional(),
    serial_image_url: z.string()
        .optional()
});

// Update sale schema (limited fields can be updated)
const updateSaleSchema = z.object({
    customer_email: z.string()
        .email('Email inválido')
        .optional(),
    customer_phone: z.string()
        .max(50, 'El teléfono no puede exceder 50 caracteres')
        .optional(),
    customer_address: z.string()
        .max(500, 'La dirección no puede exceder 500 caracteres')
        .optional(),
    warranty_months: z.number()
        .int('El período de garantía debe ser un número entero')
        .min(0, 'El período de garantía debe ser mayor o igual a 0')
        .max(120, 'El período de garantía no puede exceder 120 meses')
        .optional(),
    notes: z.string()
        .max(1000, 'Las notas no pueden exceder 1000 caracteres')
        .optional()
});

// Query parameters schema for sales list
const saleQuerySchema = z.object({
    page: z.string()
        .regex(/^\d+$/, 'Página debe ser un número')
        .transform(val => parseInt(val))
        .refine(val => val > 0, 'Página debe ser mayor a 0')
        .optional()
        .default('1')
        .transform(val => typeof val === 'string' ? parseInt(val) : val),
    limit: z.string()
        .regex(/^\d+$/, 'Límite debe ser un número')
        .transform(val => parseInt(val))
        .refine(val => val > 0 && val <= 100, 'Límite debe estar entre 1 y 100')
        .optional()
        .default('20')
        .transform(val => typeof val === 'string' ? parseInt(val) : val),
    start_date: z.string()
        .datetime('Fecha inicial inválida')
        .optional(),
    end_date: z.string()
        .datetime('Fecha final inválida')
        .optional(),
    customer_name: z.string()
        .max(255, 'El nombre del cliente no puede exceder 255 caracteres')
        .optional(),
    serial_number: z.string()
        .max(255, 'El número de serie no puede exceder 255 caracteres')
        .optional(),
    payment_method: z.enum(['cash', 'card', 'check', 'transfer'])
        .optional(),
    sales_platform: z.enum(['direct', 'amazon', 'ebay', 'shopify', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'marketplace', 'otros'])
        .optional(),
    sort_by: z.enum(['sale_date', 'customer_name', 'total_amount', 'created_at'])
        .optional()
        .default('sale_date'),
    sort_order: z.enum(['ASC', 'DESC'])
        .optional()
        .default('DESC')
});

// Export validation schemas
export const schemas = {
    createSale: createSaleSchema,
    updateSale: updateSaleSchema,
    saleQuery: saleQuerySchema
};

export {
    createSaleSchema,
    updateSaleSchema,
    saleQuerySchema,
    saleProductSchema
};
