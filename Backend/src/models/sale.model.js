import { database } from '../config/database.js';
import { logger } from '../config/logger.js';
import DateUtils from '../utils/dateUtils.js';

/**
 * Sale model - Handles sales-related database operations
 */
class SaleModel {

    /**
     * Create a new sale
     * @param {Object} saleData - Sale data
     * @returns {Promise<Object>} Created sale
     */
    static async create({
        companyId,
        userId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        products,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        serialNumber,
        serialImageUrl,
        warrantyMonths,
        paymentMethod,
        notes,
        saleDate
    }) {
        try {
            const query = `
                INSERT INTO sales (
                    company_id, user_id, customer_name, customer_email, customer_phone,
                    customer_address, products, subtotal, tax_amount, discount_amount,
                    total_amount, serial_number, serial_image_url, warranty_months,
                    payment_method, sale_date, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `;

            const result = await database.query(query, [
                companyId, userId, customerName, customerEmail, customerPhone,
                customerAddress, JSON.stringify(products), subtotal, taxAmount, discountAmount,
                totalAmount, serialNumber, serialImageUrl, warrantyMonths,
                paymentMethod, saleDate || DateUtils.getCurrentDateGuatemala(), notes
            ]);

            logger.business('sale_created', 'sale', result.rows[0].id, {
                companyId,
                userId,
                customerName,
                totalAmount,
                serialNumber
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating sale:', error);
            throw error;
        }
    }

    /**
     * Find sale by ID
     * @param {string} saleId - Sale ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Sale data or null
     */
    static async findById(saleId, companyId) {
        try {
            const query = `
                SELECT
                    s.*,
                    u.name as seller_name,
                    u.email as seller_email,
                    p.name as product_name,
                    p.sku as product_sku
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN products p ON (s.products->0->>'product_id')::uuid = p.id
                WHERE s.id = $1 AND s.company_id = $2
            `;

            const result = await database.query(query, [saleId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            const sale = result.rows[0];

            // Parse products JSON
            sale.products = typeof sale.products === 'string'
                ? JSON.parse(sale.products)
                : sale.products;

            return sale;
        } catch (error) {
            logger.error('Error finding sale by ID:', error);
            throw error;
        }
    }

    /**
     * Get sales by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Sales with pagination info
     */
    static async getByCompany({
        companyId,
        startDate,
        endDate,
        customerName,
        serialNumber,
        userId,
        paymentMethod,
        page = 1,
        limit = 20,
        sortBy = 'sale_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;

            // Build WHERE conditions
            const conditions = ['s.company_id = $1'];
            const params = [companyId];
            let paramCount = 2;

            if (startDate) {
                conditions.push(`s.sale_date >= $${paramCount}`);
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                conditions.push(`s.sale_date <= $${paramCount}`);
                params.push(endDate);
                paramCount++;
            }

            if (customerName) {
                conditions.push(`s.customer_name ILIKE $${paramCount}`);
                params.push(`%${customerName}%`);
                paramCount++;
            }

            if (serialNumber) {
                conditions.push(`s.serial_number ILIKE $${paramCount}`);
                params.push(`%${serialNumber}%`);
                paramCount++;
            }

            if (userId) {
                conditions.push(`s.user_id = $${paramCount}`);
                params.push(userId);
                paramCount++;
            }

            if (paymentMethod) {
                conditions.push(`s.payment_method = $${paramCount}`);
                params.push(paymentMethod);
                paramCount++;
            }

            const whereClause = conditions.join(' AND ');

            // Build ORDER BY clause
            const validSortFields = ['sale_date', 'customer_name', 'total_amount', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'sale_date';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Main query for sales
            const query = `
                SELECT
                    s.*,
                    u.name as seller_name,
                    u.email as seller_email,
                    (SELECT COUNT(*) FROM warranties w WHERE w.sale_id = s.id) as has_warranty
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE ${whereClause}
                ORDER BY s.${sortField} ${order}
                LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;

            // Count query for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM sales s
                WHERE ${whereClause}
            `;

            // Execute queries
            const [salesResult, countResult] = await Promise.all([
                database.query(query, [...params, limit, offset]),
                database.query(countQuery, params)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            // Parse products JSON for each sale
            const sales = salesResult.rows.map(sale => ({
                ...sale,
                products: typeof sale.products === 'string'
                    ? JSON.parse(sale.products)
                    : sale.products
            }));

            return {
                sales,
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
            logger.error('Error getting sales by company:', error);
            throw error;
        }
    }

    /**
     * Update sale
     * @param {string} saleId - Sale ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated sale
     */
    static async update(saleId, companyId, updates) {
        try {
            const allowedFields = [
                'customer_name', 'customer_email', 'customer_phone', 'customer_address',
                'products', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
                'serial_number', 'warranty_months', 'payment_method', 'notes'
            ];

            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    if (key === 'products') {
                        fields.push(`products = $${paramCount}`);
                        values.push(JSON.stringify(updates[key]));
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updates[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(saleId);
            values.push(companyId);

            const query = `
                UPDATE sales
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Sale not found');
            }

            logger.business('sale_updated', 'sale', saleId, {
                companyId,
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating sale:', error);
            throw error;
        }
    }

    /**
     * Delete sale
     * @param {string} saleId - Sale ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(saleId, companyId) {
        try {
            // Start transaction
            await database.transaction(async (client) => {
                // First, delete related warranty if exists
                await client.query(
                    'DELETE FROM warranties WHERE sale_id = $1',
                    [saleId]
                );

                // Then delete the sale
                const result = await client.query(
                    'DELETE FROM sales WHERE id = $1 AND company_id = $2',
                    [saleId, companyId]
                );

                if (result.rowCount === 0) {
                    throw new Error('Sale not found');
                }
            });

            logger.business('sale_deleted', 'sale', saleId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting sale:', error);
            throw error;
        }
    }

    /**
     * Get sales statistics for a company
     * @param {string} companyId - Company ID
     * @param {Object} dateRange - Date range for statistics
     * @returns {Promise<Object>} Sales statistics
     */
    static async getStatistics(companyId, dateRange = null) {
        try {
            let dateFilter = '';
            const params = [companyId];

            if (dateRange) {
                if (dateRange.startDate) {
                    dateFilter += ` AND s.sale_date >= $${params.length + 1}`;
                    params.push(dateRange.startDate);
                }
                if (dateRange.endDate) {
                    dateFilter += ` AND s.sale_date <= $${params.length + 1}`;
                    params.push(dateRange.endDate);
                }
            }

            const query = `
                SELECT
                    COUNT(*) as total_sales,
                    SUM(s.total_amount) as total_revenue,
                    AVG(s.total_amount) as average_sale,
                    COUNT(DISTINCT s.user_id) as unique_sellers,
                    COUNT(DISTINCT s.customer_name) as unique_customers,
                    SUM(s.discount_amount) as total_discounts,
                    COUNT(CASE WHEN s.serial_number IS NOT NULL THEN 1 END) as sales_with_serial,
                    COUNT(CASE WHEN s.warranty_months > 0 THEN 1 END) as sales_with_warranty
                FROM sales s
                WHERE s.company_id = $1${dateFilter}
            `;

            const result = await database.query(query, params);

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting sales statistics:', error);
            throw error;
        }
    }

    /**
     * Get sales by date range for a company
     * @param {string} companyId - Company ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Sales in date range
     */
    static async getByDateRange(companyId, startDate, endDate) {
        try {
            const query = `
                SELECT
                    s.*,
                    u.name as seller_name,
                    u.email as seller_email
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.company_id = $1
                  AND s.sale_date >= $2
                  AND s.sale_date <= $3
                ORDER BY s.sale_date ASC
            `;

            const result = await database.query(query, [companyId, startDate, endDate]);

            // Parse products JSON for each sale
            return result.rows.map(sale => ({
                ...sale,
                products: typeof sale.products === 'string'
                    ? JSON.parse(sale.products)
                    : sale.products
            }));
        } catch (error) {
            logger.error('Error getting sales by date range:', error);
            throw error;
        }
    }

    /**
     * Get top selling products for a company
     * @param {string} companyId - Company ID
     * @param {number} limit - Number of top products to return
     * @param {Object} dateRange - Date range filter
     * @returns {Promise<Array>} Top selling products
     */
    static async getTopSellingProducts(companyId, limit = 10, dateRange = null) {
        try {
            let dateFilter = '';
            const params = [companyId];

            if (dateRange) {
                if (dateRange.startDate) {
                    dateFilter += ` AND s.sale_date >= $${params.length + 1}`;
                    params.push(dateRange.startDate);
                }
                if (dateRange.endDate) {
                    dateFilter += ` AND s.sale_date <= $${params.length + 1}`;
                    params.push(dateRange.endDate);
                }
            }

            const query = `
                SELECT
                    p.id,
                    p.sku,
                    p.name,
                    p.price,
                    SUM((product->>'quantity')::int) as total_quantity_sold,
                    SUM(((product->>'quantity')::int * (product->>'unit_price')::decimal)) as total_revenue,
                    COUNT(DISTINCT s.id) as sale_count
                FROM sales s
                CROSS JOIN jsonb_array_elements(s.products) as product
                LEFT JOIN products p ON (product->>'product_id')::uuid = p.id
                WHERE s.company_id = $1${dateFilter}
                GROUP BY p.id, p.sku, p.name, p.price
                ORDER BY total_quantity_sold DESC
                LIMIT $${params.length + 1}
            `;

            params.push(limit);

            const result = await database.query(query, params);

            return result.rows;
        } catch (error) {
            logger.error('Error getting top selling products:', error);
            throw error;
        }
    }

    /**
     * Get sales performance by seller
     * @param {string} companyId - Company ID
     * @param {Object} dateRange - Date range filter
     * @returns {Promise<Array>} Sales performance by seller
     */
    static async getSalesBySeller(companyId, dateRange = null) {
        try {
            let dateFilter = '';
            const params = [companyId];

            if (dateRange) {
                if (dateRange.startDate) {
                    dateFilter += ` AND s.sale_date >= $${params.length + 1}`;
                    params.push(dateRange.startDate);
                }
                if (dateRange.endDate) {
                    dateFilter += ` AND s.sale_date <= $${params.length + 1}`;
                    params.push(dateRange.endDate);
                }
            }

            const query = `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    COUNT(s.id) as total_sales,
                    SUM(s.total_amount) as total_revenue,
                    AVG(s.total_amount) as average_sale,
                    MAX(s.sale_date) as last_sale_date
                FROM sales s
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.company_id = $1${dateFilter}
                GROUP BY u.id, u.name, u.email
                ORDER BY total_revenue DESC
            `;

            const result = await database.query(query, params);

            return result.rows;
        } catch (error) {
            logger.error('Error getting sales by seller:', error);
            throw error;
        }
    }

    /**
     * Search sales by serial number
     * @param {string} companyId - Company ID
     * @param {string} serialNumber - Serial number to search
     * @returns {Promise<Object|null>} Sale with matching serial number
     */
    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const query = `
                SELECT
                    s.*,
                    u.name as seller_name,
                    u.email as seller_email,
                    p.name as product_name,
                    p.sku as product_sku
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN products p ON (s.products->0->>'product_id')::uuid = p.id
                WHERE s.company_id = $1 AND s.serial_number ILIKE $2
            `;

            const result = await database.query(query, [companyId, `%${serialNumber}%`]);

            if (result.rows.length === 0) {
                return null;
            }

            const sale = result.rows[0];

            // Parse products JSON
            sale.products = typeof sale.products === 'string'
                ? JSON.parse(sale.products)
                : sale.products;

            return sale;
        } catch (error) {
            logger.error('Error finding sale by serial number:', error);
            throw error;
        }
    }
}

export default SaleModel;