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
        description,
        price,
        stock,
        minStock,
        imageUrl,
        barcode
    }) {
        try {
            const query = `
                INSERT INTO products (
                    company_id, category_id, sku, name, description,
                    price, stock, min_stock, image_url, barcode
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const result = await database.query(query, [
                companyId, categoryId, sku, name, description,
                price, stock, minStock, imageUrl, barcode
            ]);

            logger.business('product_created', 'product', result.rows[0].id, {
                companyId,
                sku,
                name,
                stock
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating product:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error('SKU already exists in this company');
            }
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
            const query = `
                SELECT
                    p.*,
                    c.name as category_name,
                    COALESCE(SUM(sold.quantity), 0) as total_sold,
                    COALESCE(SUM(purchased.quantity), 0) as total_purchased
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN (
                    SELECT
                        product_id,
                        SUM(quantity) as quantity
                    FROM (
                        SELECT product_id, quantity FROM sales, jsonb_array_elements(products) as product
                        UNION ALL
                        SELECT product_id, quantity FROM purchases, jsonb_array_elements(products) as product
                    ) combined
                    GROUP BY product_id
                ) sold ON p.id = sold.product_id
                WHERE p.id = $1 AND p.company_id = $2
            `;

            const result = await database.query(query, [productId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            const product = result.rows[0];

            // Parse JSON products data if needed for additional details
            return {
                ...product,
                stock_status: this.getStockStatus(product.stock, product.min_stock)
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

            // Build WHERE conditions
            const conditions = ['p.company_id = $1'];
            const params = [companyId];
            let paramCount = 2;

            if (categoryId) {
                conditions.push(`p.category_id = $${paramCount}`);
                params.push(categoryId);
                paramCount++;
            }

            if (search) {
                conditions.push(`(p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
                params.push(`%${search}%`);
                paramCount++;
            }

            if (stockStatus) {
                switch (stockStatus) {
                    case 'low':
                        conditions.push(`p.stock <= p.min_stock`);
                        break;
                    case 'out':
                        conditions.push(`p.stock = 0`);
                        break;
                    case 'available':
                        conditions.push(`p.stock > 0`);
                        break;
                }
            }

            const whereClause = conditions.join(' AND ');

            // Build ORDER BY clause
            const validSortFields = ['name', 'sku', 'price', 'stock', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Main query for products
            const query = `
                SELECT
                    p.*,
                    c.name as category_name,
                    ${this.getStockStatusExpression('p.stock', 'p.min_stock')} as stock_status
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE ${whereClause}
                ORDER BY p.${sortField} ${order}
                LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;

            // Count query for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM products p
                WHERE ${whereClause}
            `;

            // Execute queries
            const [productsResult, countResult] = await Promise.all([
                database.query(query, [...params, limit, offset]),
                database.query(countQuery, params)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                products: productsResult.rows,
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
     * Update product stock
     * @param {string} productId - Product ID
     * @param {string} companyId - Company ID
     * @param {number} newStock - New stock quantity
     * @param {string} operation - Operation type ('set', 'add', 'subtract')
     * @returns {Promise<Object>} Updated product
     */
    static async updateStock(productId, companyId, newStock, operation = 'set') {
        try {
            let stockValue;

            switch (operation) {
                case 'add':
                    stockValue = `stock + ${newStock}`;
                    break;
                case 'subtract':
                    stockValue = `stock - ${newStock}`;
                    break;
                case 'set':
                default:
                    stockValue = newStock;
                    break;
            }

            const query = `
                UPDATE products
                SET stock = ${stockValue}, updated_at = NOW()
                WHERE id = $1 AND company_id = $2
                RETURNING *
            `;

            const result = await database.query(query, [productId, companyId]);

            if (result.rows.length === 0) {
                throw new Error('Product not found');
            }

            const product = result.rows[0];

            logger.business('stock_updated', 'product', productId, {
                companyId,
                oldStock: operation === 'set' ? 'unknown' : product.stock - (operation === 'add' ? newStock : -newStock),
                newStock: product.stock,
                operation,
                quantity: newStock
            });

            return {
                ...product,
                stock_status: this.getStockStatus(product.stock, product.min_stock)
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
            const allowedFields = ['category_id', 'sku', 'name', 'description', 'price', 'min_stock', 'image_url', 'barcode'];
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(productId);
            values.push(companyId);

            const query = `
                UPDATE products
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Product not found');
            }

            logger.business('product_updated', 'product', productId, {
                companyId,
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating product:', error);
            if (error.code === '23505') {
                throw new Error('SKU already exists in this company');
            }
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
            const query = `
                UPDATE products
                SET is_active = false, updated_at = NOW()
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(query, [productId, companyId]);

            if (result.rowCount === 0) {
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
            const query = `
                SELECT
                    p.*,
                    c.name as category_name,
                    (p.min_stock - p.stock) as deficit
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.company_id = $1
                  AND p.is_active = true
                  AND p.stock <= p.min_stock
                ORDER BY (p.min_stock - p.stock) DESC, p.name ASC
            `;

            const result = await database.query(query, [companyId]);

            return result.rows.map(product => ({
                ...product,
                stock_status: 'low'
            }));
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
            const query = `
                SELECT
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
                    COUNT(CASE WHEN stock <= min_stock THEN 1 END) as low_stock,
                    COUNT(CASE WHEN stock > min_stock THEN 1 END) as available,
                    AVG(price) as average_price,
                    SUM(stock) as total_stock_value
                FROM products
                WHERE company_id = $1 AND is_active = true
            `;

            const result = await database.query(query, [companyId]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting product statistics:', error);
            throw error;
        }
    }

    /**
     * Get stock status for a product
     * @param {number} stock - Current stock
     * @param {number} minStock - Minimum stock threshold
     * @returns {string} Stock status
     */
    static getStockStatus(stock, minStock) {
        if (stock === 0) return 'out';
        if (stock <= minStock) return 'low';
        return 'available';
    }

    /**
     * Get stock status SQL expression
     * @param {string} stockField - Stock field name
     * @param {string} minStockField - Min stock field name
     * @returns {string} SQL expression for stock status
     */
    static getStockStatusExpression(stockField, minStockField) {
        return `
            CASE
                WHEN ${stockField} = 0 THEN 'out'
                WHEN ${stockField} <= ${minStockField} THEN 'low'
                ELSE 'available'
            END
        `;
    }
}

export default ProductModel;