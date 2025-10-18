import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Company model - Handles company-related database operations
 */
class CompanyModel {

    /**
     * Create a new company
     * @param {Object} companyData - Company data
     * @returns {Promise<Object>} Created company
     */
    static async create({ name, ruc, address, phone, email, website, logoUrl }) {
        try {
            const query = `
                INSERT INTO companies (name, ruc, address, phone, email, website, logo_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await database.query(query, [name, ruc, address, phone, email, website, logoUrl]);

            logger.business('company_created', 'company', result.rows[0].id, {
                name,
                ruc
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating company:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error('RUC already exists');
            }
            throw error;
        }
    }

    /**
     * Find company by ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object|null>} Company data or null
     */
    static async findById(companyId) {
        try {
            const query = `
                SELECT *
                FROM companies
                WHERE id = $1
            `;

            const result = await database.query(query, [companyId]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding company by ID:', error);
            throw error;
        }
    }

    /**
     * Find company by RUC
     * @param {string} ruc - Company RUC
     * @returns {Promise<Object|null>} Company data or null
     */
    static async findByRuc(ruc) {
        try {
            const query = `
                SELECT *
                FROM companies
                WHERE ruc = $1
            `;

            const result = await database.query(query, [ruc]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding company by RUC:', error);
            throw error;
        }
    }

    /**
     * Update company information
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated company
     */
    static async update(companyId, updates) {
        try {
            const allowedFields = ['name', 'address', 'phone', 'email', 'website', 'logo_url'];
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

            values.push(companyId);

            const query = `
                UPDATE companies
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Company not found');
            }

            logger.business('company_updated', 'company', companyId, {
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating company:', error);
            if (error.code === '23505') {
                throw new Error('RUC already exists');
            }
            throw error;
        }
    }

    /**
     * Get company statistics
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Company statistics
     */
    static async getStatistics(companyId) {
        try {
            const query = `
                SELECT
                    c.*,
                    COALESCE(product_stats.total_products, 0) as total_products,
                    COALESCE(product_stats.total_stock_value, 0) as total_stock_value,
                    COALESCE(sales_stats.total_sales, 0) as total_sales,
                    COALESCE(sales_stats.total_revenue, 0) as total_revenue,
                    COALESCE(warranty_stats.active_warranties, 0) as active_warranties,
                    COALESCE(service_stats.active_services, 0) as active_services,
                    COALESCE(user_stats.total_users, 0) as total_users
                FROM companies c
                LEFT JOIN (
                    SELECT
                        company_id,
                        COUNT(*) as total_products,
                        SUM(stock * price) as total_stock_value
                    FROM products
                    WHERE is_active = true
                    GROUP BY company_id
                ) product_stats ON c.id = product_stats.company_id
                LEFT JOIN (
                    SELECT
                        company_id,
                        COUNT(*) as total_sales,
                        SUM(total_amount) as total_revenue
                    FROM sales
                    GROUP BY company_id
                ) sales_stats ON c.id = sales_stats.company_id
                LEFT JOIN (
                    SELECT
                        company_id,
                        COUNT(*) as active_warranties
                    FROM warranties
                    WHERE is_active = true AND expires_at > CURRENT_DATE
                    GROUP BY company_id
                ) warranty_stats ON c.id = warranty_stats.company_id
                LEFT JOIN (
                    SELECT
                        company_id,
                        COUNT(*) as active_services
                    FROM service_histories
                    WHERE status NOT IN ('delivered', 'cancelled')
                    GROUP BY company_id
                ) service_stats ON c.id = service_stats.company_id
                LEFT JOIN (
                    SELECT
                        company_id,
                        COUNT(*) as total_users
                    FROM user_company
                    WHERE is_active = true
                    GROUP BY company_id
                ) user_stats ON c.id = user_stats.company_id
                WHERE c.id = $1
            `;

            const result = await database.query(query, [companyId]);

            if (result.rows.length === 0) {
                throw new Error('Company not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting company statistics:', error);
            throw error;
        }
    }

    /**
     * Get companies by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Companies user belongs to
     */
    static async getByUserId(userId) {
        try {
            const query = `
                SELECT
                    c.*,
                    uc.role,
                    uc.is_active as member_active,
                    uc.joined_at
                FROM companies c
                INNER JOIN user_company uc ON c.id = uc.company_id
                WHERE uc.user_id = $1 AND uc.is_active = true
                ORDER BY uc.joined_at DESC
            `;

            const result = await database.query(query, [userId]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting companies by user ID:', error);
            throw error;
        }
    }

    /**
     * Add user to company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @param {string} role - User role in company
     * @param {string} invitedBy - User ID who sent the invitation
     * @returns {Promise<Object>} Company membership data
     */
    static async addUser(companyId, userId, role, invitedBy) {
        try {
            const query = `
                INSERT INTO user_company (user_id, company_id, role, invited_by)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, company_id)
                DO UPDATE SET
                    role = EXCLUDED.role,
                    is_active = true,
                    joined_at = NOW()
                RETURNING *
            `;

            const result = await database.query(query, [userId, companyId, role, invitedBy]);

            logger.business('user_added_to_company', 'company', companyId, {
                userId,
                role,
                invitedBy
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error adding user to company:', error);
            throw error;
        }
    }

    /**
     * Remove user from company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async removeUser(companyId, userId) {
        try {
            const query = `
                UPDATE user_company
                SET is_active = false
                WHERE company_id = $1 AND user_id = $2
            `;

            const result = await database.query(query, [companyId, userId]);

            if (result.rowCount === 0) {
                throw new Error('User is not a member of this company');
            }

            logger.business('user_removed_from_company', 'company', companyId, {
                userId
            });

            return true;
        } catch (error) {
            logger.error('Error removing user from company:', error);
            throw error;
        }
    }

    /**
     * Update user role in company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @param {string} newRole - New role
     * @returns {Promise<Object>} Updated membership data
     */
    static async updateUserRole(companyId, userId, newRole) {
        try {
            const query = `
                UPDATE user_company
                SET role = $1, updated_at = NOW()
                WHERE company_id = $2 AND user_id = $3 AND is_active = true
                RETURNING *
            `;

            const result = await database.query(query, [newRole, companyId, userId]);

            if (result.rows.length === 0) {
                throw new Error('User is not an active member of this company');
            }

            logger.business('user_role_updated', 'company', companyId, {
                userId,
                oldRole: result.rows[0].role,
                newRole
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating user role:', error);
            throw error;
        }
    }

    /**
     * Get company members with their details
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Company members
     */
    static async getMembers(companyId) {
        try {
            const query = `
                SELECT
                    u.id,
                    u.email,
                    u.name,
                    u.phone,
                    u.is_active,
                    u.last_login_at,
                    u.created_at as user_created_at,
                    uc.role,
                    uc.is_active as member_active,
                    uc.joined_at,
                    uc.invited_by,
                    inviter.name as invited_by_name
                FROM user_company uc
                INNER JOIN users u ON uc.user_id = u.id
                LEFT JOIN users inviter ON uc.invited_by = inviter.id
                WHERE uc.company_id = $1
                ORDER BY uc.joined_at DESC
            `;

            const result = await database.query(query, [companyId]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting company members:', error);
            throw error;
        }
    }

    /**
     * Deactivate company
     * @param {string} companyId - Company ID
     * @returns {Promise<void>}
     */
    static async deactivate(companyId) {
        try {
            const query = `
                UPDATE companies
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
            `;

            await database.query(query, [companyId]);

            logger.business('company_deactivated', 'company', companyId, {});
        } catch (error) {
            logger.error('Error deactivating company:', error);
            throw error;
        }
    }
}

export default CompanyModel;