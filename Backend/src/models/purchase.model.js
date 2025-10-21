import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Purchase model - Handles purchase-related database operations
 */
class PurchaseModel {

    /**
     * Create a new purchase
     * @param {Object} purchaseData - Purchase data
     * @returns {Promise<Object>} Created purchase
     */
    static async create({
        companyId,
        userId,
        supplierId = null,
        supplierName,
        invoiceNumber = null,
        products,
        totalAmount,
        costAmount = 0,
        sellAmount = 0,
        purchaseDate,
        notes = null
    }) {
        try {
            // Calculate profit if both cost and sell amounts are provided
            let profitAmount = 0;
            let profitMarginPercent = 0;
            
            if (costAmount > 0 && sellAmount > 0) {
                profitAmount = sellAmount - costAmount;
                profitMarginPercent = (profitAmount / costAmount) * 100;
            }

            const query = `
                INSERT INTO purchases (
                    company_id, user_id, supplier_id, supplier_name,
                    invoice_number, products, total_amount, cost_amount, sell_amount,
                    profit_amount, profit_margin_percent, purchase_date, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const result = await database.query(query, [
                companyId, userId, supplierId, supplierName,
                invoiceNumber, JSON.stringify(products), totalAmount,
                costAmount, sellAmount, profitAmount, profitMarginPercent,
                purchaseDate, notes
            ]);

            logger.business('purchase_created', 'purchase', result.rows[0].id, {
                companyId,
                userId,
                supplierName,
                totalAmount,
                costAmount,
                sellAmount,
                profitAmount,
                productCount: products.length
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating purchase:', error);
            throw error;
        }
    }

    /**
     * Find purchase by ID
     * @param {string} purchaseId - Purchase ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Purchase data or null
     */
    static async findById(purchaseId, companyId) {
        try {
            const query = `
                SELECT
                    p.*,
                    u.name as buyer_name,
                    u.email as buyer_email,
                    s.name as supplier_full_name,
                    s.contact_person as supplier_contact
                FROM purchases p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.id = $1 AND p.company_id = $2
            `;

            const result = await database.query(query, [purchaseId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            // Parse products JSON
            const purchase = result.rows[0];
            if (purchase.products) {
                purchase.products = typeof purchase.products === 'string'
                    ? JSON.parse(purchase.products)
                    : purchase.products;
            }

            return purchase;
        } catch (error) {
            logger.error('Error finding purchase by ID:', error);
            throw error;
        }
    }

    /**
     * Get purchases by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Purchases with pagination info
     */
    static async getByCompany({
        companyId,
        supplierId = null,
        supplierName = null,
        startDate = null,
        endDate = null,
        page = 1,
        limit = 20,
        sortBy = 'purchase_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;
            const params = [companyId];
            let paramCount = 1;

            // Build WHERE clause
            let whereConditions = ['p.company_id = $1'];

            if (supplierId) {
                paramCount++;
                whereConditions.push(`p.supplier_id = $${paramCount}`);
                params.push(supplierId);
            }

            if (supplierName) {
                paramCount++;
                whereConditions.push(`p.supplier_name ILIKE $${paramCount}`);
                params.push(`%${supplierName}%`);
            }

            if (startDate) {
                paramCount++;
                whereConditions.push(`p.purchase_date >= $${paramCount}`);
                params.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereConditions.push(`p.purchase_date <= $${paramCount}`);
                params.push(endDate);
            }

            const whereClause = whereConditions.join(' AND ');

            // Validate sort fields
            const validSortFields = {
                'purchase_date': 'p.purchase_date',
                'total_amount': 'p.total_amount',
                'supplier_name': 'p.supplier_name',
                'created_at': 'p.created_at'
            };
            const sortField = validSortFields[sortBy] || 'p.purchase_date';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Main query
            const query = `
                SELECT
                    p.*,
                    u.name as buyer_name,
                    s.name as supplier_full_name,
                    (SELECT COUNT(*) FROM jsonb_array_elements(p.products)) as product_count
                FROM purchases p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM purchases p
                WHERE ${whereClause}
            `;

            params.push(limit, offset);

            const [purchases, countResult] = await Promise.all([
                database.query(query, params),
                database.query(countQuery, params.slice(0, paramCount))
            ]);

            // Parse products JSON for each purchase
            const purchasesWithProducts = purchases.rows.map(purchase => ({
                ...purchase,
                products: purchase.products && typeof purchase.products === 'string'
                    ? JSON.parse(purchase.products)
                    : (purchase.products || [])
            }));

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                purchases: purchasesWithProducts,
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
            logger.error('Error getting purchases by company:', error);
            throw error;
        }
    }

    /**
     * Update purchase
     * @param {string} purchaseId - Purchase ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated purchase
     */
    static async update(purchaseId, companyId, updates) {
        try {
            const allowedFields = [
                'supplier_id', 'supplier_name', 'invoice_number',
                'products', 'total_amount', 'purchase_date', 'notes'
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

            values.push(purchaseId, companyId);

            const query = `
                UPDATE purchases
                SET ${fields.join(', ')}
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Purchase not found');
            }

            logger.business('purchase_updated', 'purchase', purchaseId, {
                companyId,
                updates
            });

            const purchase = result.rows[0];
            if (purchase.products) {
                purchase.products = typeof purchase.products === 'string'
                    ? JSON.parse(purchase.products)
                    : purchase.products;
            }

            return purchase;
        } catch (error) {
            logger.error('Error updating purchase:', error);
            throw error;
        }
    }

    /**
     * Delete purchase
     * @param {string} purchaseId - Purchase ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(purchaseId, companyId) {
        try {
            const query = `
                DELETE FROM purchases
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(query, [purchaseId, companyId]);

            if (result.rowCount === 0) {
                throw new Error('Purchase not found');
            }

            logger.business('purchase_deleted', 'purchase', purchaseId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting purchase:', error);
            throw error;
        }
    }

    /**
     * Get purchase statistics for a company
     * @param {string} companyId - Company ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(companyId, startDate = null, endDate = null) {
        try {
            let whereClause = 'company_id = $1';
            const params = [companyId];
            let paramCount = 1;

            if (startDate) {
                paramCount++;
                whereClause += ` AND purchase_date >= $${paramCount}`;
                params.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereClause += ` AND purchase_date <= $${paramCount}`;
                params.push(endDate);
            }

            const query = `
                SELECT
                    COUNT(*) as total_purchases,
                    SUM(total_amount) as total_spent,
                    AVG(total_amount) as average_purchase,
                    COUNT(DISTINCT supplier_id) as unique_suppliers,
                    MAX(total_amount) as largest_purchase,
                    MIN(total_amount) as smallest_purchase
                FROM purchases
                WHERE ${whereClause}
            `;

            const result = await database.query(query, params);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting purchase statistics:', error);
            throw error;
        }
    }

    /**
     * Get purchases by supplier
     * @param {string} companyId - Company ID
     * @param {string} supplierId - Supplier ID
     * @returns {Promise<Array>} Purchases
     */
    static async getBySupplier(companyId, supplierId) {
        try {
            const query = `
                SELECT
                    p.*,
                    u.name as buyer_name,
                    s.name as supplier_full_name
                FROM purchases p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.company_id = $1 AND p.supplier_id = $2
                ORDER BY p.purchase_date DESC
            `;

            const result = await database.query(query, [companyId, supplierId]);

            return result.rows.map(purchase => ({
                ...purchase,
                products: purchase.products && typeof purchase.products === 'string'
                    ? JSON.parse(purchase.products)
                    : (purchase.products || [])
            }));
        } catch (error) {
            logger.error('Error getting purchases by supplier:', error);
            throw error;
        }
    }
}

export default PurchaseModel;
