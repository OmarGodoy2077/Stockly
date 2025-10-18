import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Supplier model - Handles supplier-related database operations
 */
class SupplierModel {

    /**
     * Create a new supplier
     * @param {Object} supplierData - Supplier data
     * @returns {Promise<Object>} Created supplier
     */
    static async create({
        companyId,
        name,
        contactPerson = null,
        email = null,
        phone = null,
        address = null,
        ruc = null
    }) {
        try {
            const query = `
                INSERT INTO suppliers (
                    company_id, name, contact_person, email, phone, address, ruc
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await database.query(query, [
                companyId, name, contactPerson, email, phone, address, ruc
            ]);

            logger.business('supplier_created', 'supplier', result.rows[0].id, {
                companyId,
                name
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating supplier:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error('Supplier name already exists in this company');
            }
            throw error;
        }
    }

    /**
     * Find supplier by ID
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Supplier data or null
     */
    static async findById(supplierId, companyId) {
        try {
            const query = `
                SELECT
                    s.*,
                    COUNT(p.id) as purchase_count,
                    COALESCE(SUM(p.total_amount), 0) as total_purchased
                FROM suppliers s
                LEFT JOIN purchases p ON s.id = p.supplier_id
                WHERE s.id = $1 AND s.company_id = $2
                GROUP BY s.id
            `;

            const result = await database.query(query, [supplierId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error finding supplier by ID:', error);
            throw error;
        }
    }

    /**
     * Get all suppliers for a company with pagination
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Suppliers with pagination
     */
    static async getByCompany({
        companyId,
        search = null,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'ASC'
    }) {
        try {
            const offset = (page - 1) * limit;
            const params = [companyId];
            let paramCount = 1;

            // Build WHERE clause
            let whereConditions = ['s.company_id = $1', 's.is_active = true'];

            if (search) {
                paramCount++;
                whereConditions.push(`(s.name ILIKE $${paramCount} OR s.contact_person ILIKE $${paramCount})`);
                params.push(`%${search}%`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Validate sort fields
            const validSortFields = {
                'name': 's.name',
                'contact_person': 's.contact_person',
                'created_at': 's.created_at'
            };
            const sortField = validSortFields[sortBy] || 's.name';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Main query
            const query = `
                SELECT
                    s.*,
                    COUNT(p.id) as purchase_count,
                    COALESCE(SUM(p.total_amount), 0) as total_purchased
                FROM suppliers s
                LEFT JOIN purchases p ON s.id = p.supplier_id
                WHERE ${whereClause}
                GROUP BY s.id
                ORDER BY ${sortField} ${order}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM suppliers s
                WHERE ${whereClause}
            `;

            params.push(limit, offset);

            const [suppliers, countResult] = await Promise.all([
                database.query(query, params),
                database.query(countQuery, params.slice(0, paramCount))
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                suppliers: suppliers.rows,
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
            logger.error('Error getting suppliers by company:', error);
            throw error;
        }
    }

    /**
     * Update supplier
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated supplier
     */
    static async update(supplierId, companyId, updates) {
        try {
            const allowedFields = [
                'name', 'contact_person', 'email', 'phone', 'address', 'ruc'
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

            fields.push('updated_at = NOW()');
            values.push(supplierId, companyId);

            const query = `
                UPDATE suppliers
                SET ${fields.join(', ')}
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Supplier not found');
            }

            logger.business('supplier_updated', 'supplier', supplierId, {
                companyId,
                updates
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating supplier:', error);
            throw error;
        }
    }

    /**
     * Delete supplier (soft delete)
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(supplierId, companyId) {
        try {
            const query = `
                UPDATE suppliers
                SET is_active = false, updated_at = NOW()
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(query, [supplierId, companyId]);

            if (result.rowCount === 0) {
                throw new Error('Supplier not found');
            }

            logger.business('supplier_deleted', 'supplier', supplierId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting supplier:', error);
            throw error;
        }
    }

    /**
     * Get top suppliers by purchase amount
     * @param {string} companyId - Company ID
     * @param {number} limit - Number of suppliers to return
     * @returns {Promise<Array>} Top suppliers
     */
    static async getTopSuppliers(companyId, limit = 10) {
        try {
            const query = `
                SELECT
                    s.*,
                    COUNT(p.id) as purchase_count,
                    COALESCE(SUM(p.total_amount), 0) as total_purchased
                FROM suppliers s
                LEFT JOIN purchases p ON s.id = p.supplier_id
                WHERE s.company_id = $1 AND s.is_active = true
                GROUP BY s.id
                HAVING COUNT(p.id) > 0
                ORDER BY total_purchased DESC
                LIMIT $2
            `;

            const result = await database.query(query, [companyId, limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error getting top suppliers:', error);
            throw error;
        }
    }
}

export default SupplierModel;
