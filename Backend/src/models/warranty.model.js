import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Warranty model - Handles warranty-related database operations
 */
class WarrantyModel {

    /**
     * Create a new warranty (usually called automatically when creating a sale)
     * @param {Object} warrantyData - Warranty data
     * @returns {Promise<Object>} Created warranty
     */
    static async create({
        saleId,
        companyId,
        serialNumber,
        productName,
        customerName,
        customerEmail,
        customerPhone,
        warrantyMonths,
        startDate,
        expiresAt
    }) {
        try {
            const query = `
                INSERT INTO warranties (
                    sale_id, company_id, serial_number, product_name,
                    customer_name, customer_email, customer_phone,
                    warranty_months, start_date, expires_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const result = await database.query(query, [
                saleId, companyId, serialNumber, productName,
                customerName, customerEmail, customerPhone,
                warrantyMonths, startDate, expiresAt
            ]);

            logger.business('warranty_created', 'warranty', result.rows[0].id, {
                companyId,
                saleId,
                serialNumber,
                expiresAt
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating warranty:', error);
            throw error;
        }
    }

    /**
     * Find warranty by ID
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Warranty data or null
     */
    static async findById(warrantyId, companyId) {
        try {
            const query = `
                SELECT
                    w.*,
                    s.id as sale_id,
                    s.total_amount as sale_total,
                    s.sale_date,
                    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_remaining,
                    CASE
                        WHEN w.expires_at < CURRENT_DATE THEN 'expired'
                        WHEN w.expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                        ELSE 'active'
                    END as warranty_status
                FROM warranties w
                LEFT JOIN sales s ON w.sale_id = s.id
                WHERE w.id = $1 AND w.company_id = $2
            `;

            const result = await database.query(query, [warrantyId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error finding warranty by ID:', error);
            throw error;
        }
    }

    /**
     * Get warranties by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Warranties with pagination info
     */
    static async getByCompany({
        companyId,
        status = 'all', // all, active, expired, expiring_soon
        serialNumber,
        customerName,
        page = 1,
        limit = 20,
        sortBy = 'expires_at',
        sortOrder = 'ASC'
    }) {
        try {
            const offset = (page - 1) * limit;
            const params = [companyId];
            let paramCount = 1;

            // Build WHERE clause
            let whereConditions = ['w.company_id = $1'];

            if (status === 'active') {
                whereConditions.push('w.expires_at >= CURRENT_DATE');
                whereConditions.push('w.is_active = true');
            } else if (status === 'expired') {
                whereConditions.push('w.expires_at < CURRENT_DATE');
            } else if (status === 'expiring_soon') {
                whereConditions.push('w.expires_at >= CURRENT_DATE');
                whereConditions.push('w.expires_at <= CURRENT_DATE + INTERVAL \'30 days\'');
                whereConditions.push('w.is_active = true');
            }

            if (serialNumber) {
                paramCount++;
                whereConditions.push(`w.serial_number ILIKE $${paramCount}`);
                params.push(`%${serialNumber}%`);
            }

            if (customerName) {
                paramCount++;
                whereConditions.push(`w.customer_name ILIKE $${paramCount}`);
                params.push(`%${customerName}%`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Validate sort fields
            const validSortFields = {
                'expires_at': 'w.expires_at',
                'start_date': 'w.start_date',
                'customer_name': 'w.customer_name',
                'created_at': 'w.created_at'
            };
            const sortField = validSortFields[sortBy] || 'w.expires_at';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Main query
            const query = `
                SELECT
                    w.*,
                    s.total_amount as sale_total,
                    s.sale_date,
                    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_remaining,
                    CASE
                        WHEN w.expires_at < CURRENT_DATE THEN 'expired'
                        WHEN w.expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                        ELSE 'active'
                    END as warranty_status,
                    (SELECT COUNT(*) FROM service_histories sh WHERE sh.warranty_id = w.id) as service_count
                FROM warranties w
                LEFT JOIN sales s ON w.sale_id = s.id
                WHERE ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM warranties w
                WHERE ${whereClause}
            `;

            params.push(limit, offset);

            const [warranties, countResult] = await Promise.all([
                database.query(query, params),
                database.query(countQuery, params.slice(0, paramCount))
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                warranties: warranties.rows,
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
            logger.error('Error getting warranties by company:', error);
            throw error;
        }
    }

    /**
     * Find warranty by serial number
     * @param {string} companyId - Company ID
     * @param {string} serialNumber - Serial number
     * @returns {Promise<Object|null>} Warranty or null
     */
    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const query = `
                SELECT
                    w.*,
                    s.total_amount as sale_total,
                    s.sale_date,
                    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_remaining,
                    CASE
                        WHEN w.expires_at < CURRENT_DATE THEN 'expired'
                        WHEN w.expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                        ELSE 'active'
                    END as warranty_status
                FROM warranties w
                LEFT JOIN sales s ON w.sale_id = s.id
                WHERE w.company_id = $1 AND w.serial_number = $2
                ORDER BY w.created_at DESC
                LIMIT 1
            `;

            const result = await database.query(query, [companyId, serialNumber]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error finding warranty by serial number:', error);
            throw error;
        }
    }

    /**
     * Update warranty
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated warranty
     */
    static async update(warrantyId, companyId, updates) {
        try {
            const allowedFields = [
                'customer_name', 'customer_email', 'customer_phone',
                'is_active', 'warranty_months', 'expires_at'
            ];

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

            values.push(warrantyId, companyId);

            const query = `
                UPDATE warranties
                SET ${fields.join(', ')}
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Warranty not found');
            }

            logger.business('warranty_updated', 'warranty', warrantyId, {
                companyId,
                updates
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating warranty:', error);
            throw error;
        }
    }

    /**
     * Deactivate warranty
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async deactivate(warrantyId, companyId) {
        try {
            const query = `
                UPDATE warranties
                SET is_active = false
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(query, [warrantyId, companyId]);

            if (result.rowCount === 0) {
                throw new Error('Warranty not found');
            }

            logger.business('warranty_deactivated', 'warranty', warrantyId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deactivating warranty:', error);
            throw error;
        }
    }

    /**
     * Get expiring warranties (for alerts)
     * @param {string} companyId - Company ID
     * @param {number} daysThreshold - Days threshold (default 30)
     * @returns {Promise<Array>} Expiring warranties
     */
    static async getExpiring(companyId, daysThreshold = 30) {
        try {
            const query = `
                SELECT
                    w.*,
                    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_remaining
                FROM warranties w
                WHERE w.company_id = $1
                  AND w.is_active = true
                  AND w.expires_at >= CURRENT_DATE
                  AND w.expires_at <= CURRENT_DATE + INTERVAL '${daysThreshold} days'
                ORDER BY w.expires_at ASC
            `;

            const result = await database.query(query, [companyId]);
            return result.rows;
        } catch (error) {
            logger.error('Error getting expiring warranties:', error);
            throw error;
        }
    }

    /**
     * Get warranty statistics for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(companyId) {
        try {
            const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE expires_at >= CURRENT_DATE AND is_active = true) as active,
                    COUNT(*) FILTER (WHERE expires_at < CURRENT_DATE) as expired,
                    COUNT(*) FILTER (WHERE expires_at >= CURRENT_DATE AND expires_at <= CURRENT_DATE + INTERVAL '30 days' AND is_active = true) as expiring_soon
                FROM warranties
                WHERE company_id = $1
            `;

            const result = await database.query(query, [companyId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting warranty statistics:', error);
            throw error;
        }
    }
}

export default WarrantyModel;
