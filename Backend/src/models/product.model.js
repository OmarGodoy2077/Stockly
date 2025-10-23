import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Product model - Handles product-related database operations
 */
class ProductModel {

    /**
     * Create a new product
     * @param {Object} productData - Product data
     * @returns {Promise<Object>} Created product
     */
    static async create({
        companyId,
        categoryId,
        sku,
        name,
        brand,
        description,
        price,
        stock,
        minStock,
        imageUrl,
        barcode,
        condition = 'new'
    }) {
        try {
            const { data, error } = await database.supabase
                .from('products')
                .insert({
                    company_id: companyId,
                    category_id: categoryId,
                    sku,
                    name,
                    brand,
                    description,
                    price,
                    stock,
                    min_stock: minStock,
                    image_url: imageUrl,
                    barcode,
                    condition
                })
                .select()
                .single();

            if (error) {
                logger.error('Supabase error creating product:', error);
                if (error.code === '23505') { // Unique violation
                    throw new Error('SKU already exists in this company');
                }
                throw error;
            }

            logger.business('product_created', 'product', data.id, {
                companyId,
                sku,
                name,
                brand,
                stock,
                condition
            });

            return data;
        } catch (error) {
            logger.error('Error creating product:', error);
            throw error;
        }
    }

    /**
     * Find product by ID
     * @param {string} productId - Product ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Product data or null
     */
    static async findById(productId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('products')
                .select(`
                    *,
                    category:categories(id, name)
                `)
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // Not found
                    return null;
                }
                logger.error('Supabase error finding product:', error);
                throw error;
            }

            // Calculate stock status
            const stockStatus = this.calculateStockStatus(data.stock, data.min_stock);

            return {
                ...data,
                category_name: data.category?.name || null,
                stock_status: stockStatus,
                total_sold: 0, // TODO: Calculate from sales
                total_purchased: 0, // TODO: Calculate from purchases
                category: undefined
            };
        } catch (error) {
            logger.error('Error finding product by ID:', error);
            throw error;
        }
    }

    /**
     * Get products by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Products with pagination info
     */
    static async getByCompany({
        companyId,
        categoryId,
        search,
        stockStatus,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'ASC'
    }) {
        try {
            const offset = (page - 1) * limit;

            // Build query using Supabase
            let query = database.supabase
                .from('products')
                .select(`
                    *,
                    category:categories(id, name)
                `, { count: 'exact' })
                .eq('company_id', companyId);

            // Apply filters
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
            }

            if (stockStatus) {
                switch (stockStatus) {
                    case 'low':
                        // Stock <= min_stock (requires custom filter)
                        query = query.filter('stock', 'lte', database.supabase.rpc('get_column', { col: 'min_stock' }));
                        break;
                    case 'out':
                        query = query.eq('stock', 0);
                        break;
                    case 'available':
                        query = query.gt('stock', 0);
                        break;
                }
            }

            // Apply sorting
            const validSortFields = ['name', 'sku', 'price', 'stock', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
            const ascending = sortOrder.toUpperCase() !== 'DESC';

            query = query.order(sortField, { ascending });

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            // Execute query
            const { data, error, count } = await query;

            if (error) {
                logger.error('Supabase error getting products:', error);
                throw error;
            }

            // Transform data to match expected format
            const products = (data || []).map(product => {
                const stockStatus = this.calculateStockStatus(product.stock, product.min_stock);
                return {
                    ...product,
                    category_name: product.category?.name || null,
                    stock_status: stockStatus,
                    // Remove nested category object if you want flat structure
                    category: undefined
                };
            });

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            return {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Error getting products by company:', error);
            throw error;
        }
    }

    /**
     * Calculate stock status based on stock and min_stock
     * @private
     */
    static calculateStockStatus(stock, minStock) {
        if (stock === 0) return 'out';
        if (stock <= minStock) return 'low';
        return 'available';
    }

    /**
     * Update product stock
     * @param {string} productId - Product ID
     * @param {string} companyId - Company ID
     * @param {number} newStock - New stock quantity
     * @param {string} operation - Operation type ('set', 'add', 'subtract')
     * @returns {Promise<Object>} Updated product
     */
    static async updateStock(productId, companyId, newStock, operation = 'set') {
        try {
            // First, get the current product
            const { data: currentProduct, error: fetchError } = await database.supabase
                .from('products')
                .select('stock')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (fetchError || !currentProduct) {
                throw new Error('Product not found');
            }

            let finalStock;
            const oldStock = currentProduct.stock;

            switch (operation) {
                case 'add':
                    finalStock = oldStock + newStock;
                    break;
                case 'subtract':
                    finalStock = Math.max(0, oldStock - newStock);
                    break;
                case 'set':
                default:
                    finalStock = newStock;
                    break;
            }

            // Update the stock
            const { data, error } = await database.supabase
                .from('products')
                .update({ stock: finalStock, updated_at: new Date().toISOString() })
                .eq('id', productId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                logger.error('Supabase error updating stock:', error);
                throw error;
            }

            logger.business('stock_updated', 'product', productId, {
                companyId,
                oldStock,
                newStock: data.stock,
                operation,
                quantity: newStock
            });

            return {
                ...data,
                stock_status: this.calculateStockStatus(data.stock, data.min_stock)
            };
        } catch (error) {
            logger.error('Error updating product stock:', error);
            throw error;
        }
    }

    /**
     * Update product details
     * @param {string} productId - Product ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated product
     */
    static async update(productId, companyId, updates) {
        try {
            const allowedFields = ['category_id', 'sku', 'name', 'description', 'price', 'min_stock', 'image_url', 'barcode', 'condition'];
            const updateData = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            updateData.updated_at = new Date().toISOString();

            const { data, error } = await database.supabase
                .from('products')
                .update(updateData)
                .eq('id', productId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                logger.error('Supabase error updating product:', error);
                if (error.code === '23505') {
                    throw new Error('SKU already exists in this company');
                }
                throw error;
            }

            if (!data) {
                throw new Error('Product not found');
            }

            logger.business('product_updated', 'product', productId, {
                companyId,
                updatedFields: Object.keys(updates)
            });

            return data;
        } catch (error) {
            logger.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product (soft delete by deactivating)
     * @param {string} productId - Product ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(productId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('products')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', productId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error || !data) {
                throw new Error('Product not found');
            }

            logger.business('product_deleted', 'product', productId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Get low stock products for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Low stock products
     */
    static async getLowStockProducts(companyId) {
        try {
            // Get products where stock <= min_stock using RPC or filter
            // Note: Supabase doesn't support column-to-column comparison directly
            // We need to fetch and filter or use RPC
            const { data, error } = await database.supabase
                .from('products')
                .select(`
                    *,
                    category:categories(id, name)
                `)
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('stock', { ascending: true });

            if (error) {
                logger.error('Supabase error getting low stock products:', error);
                throw error;
            }

            // Filter products where stock <= min_stock
            const lowStockProducts = (data || [])
                .filter(p => p.stock <= p.min_stock)
                .map(product => ({
                    ...product,
                    category_name: product.category?.name || null,
                    deficit: product.min_stock - product.stock,
                    stock_status: 'low',
                    category: undefined
                }))
                .sort((a, b) => b.deficit - a.deficit || a.name.localeCompare(b.name));

            return lowStockProducts;
        } catch (error) {
            logger.error('Error getting low stock products:', error);
            throw error;
        }
    }

    /**
     * Get product statistics for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Product statistics
     */
    static async getStatistics(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('products')
                .select('stock, min_stock, price')
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (error) {
                logger.error('Supabase error getting product statistics:', error);
                throw error;
            }

            const products = data || [];

            const stats = {
                total_products: products.length,
                out_of_stock: products.filter(p => p.stock === 0).length,
                low_stock: products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length,
                available: products.filter(p => p.stock > p.min_stock).length,
                average_price: products.length > 0 
                    ? products.reduce((sum, p) => sum + Number(p.price), 0) / products.length 
                    : 0,
                total_stock_value: products.reduce((sum, p) => sum + Number(p.stock), 0)
            };

            return stats;
        } catch (error) {
            logger.error('Error getting product statistics:', error);
            throw error;
        }
    }

    /**
     * Get stock status for a product (deprecated, use calculateStockStatus)
     * @param {number} stock - Current stock
     * @param {number} minStock - Minimum stock threshold
     * @returns {string} Stock status
     */
    static getStockStatus(stock, minStock) {
        return this.calculateStockStatus(stock, minStock);
    }
}

export default ProductModel;