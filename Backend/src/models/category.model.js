import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Category model - Handles category-related database operations
 */
class CategoryModel {

    /**
     * Create a new category
     * @param {Object} categoryData - Category data
     * @returns {Promise<Object>} Created category
     */
    static async create({ companyId, name, description }) {
        try {
            const query = `
                INSERT INTO categories (company_id, name, description)
                VALUES ($1, $2, $3)
                RETURNING *
            `;

            const result = await database.query(query, [companyId, name, description]);

            logger.business('category_created', 'category', result.rows[0].id, {
                companyId,
                name
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating category:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error('Category name already exists in this company');
            }
            throw error;
        }
    }

    /**
     * Find category by ID
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Category data or null
     */
    static async findById(categoryId, companyId) {
        try {
            const query = `
                SELECT
                    c.*,
                    COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
                WHERE c.id = $1 AND c.company_id = $2
                GROUP BY c.id
            `;

            const result = await database.query(query, [categoryId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error finding category by ID:', error);
            throw error;
        }
    }

    /**
     * Get all categories for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Categories with product counts
     */
    static async getByCompany(companyId) {
        try {
            const query = `
                SELECT
                    c.*,
                    COUNT(p.id) as product_count,
                    COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) as low_stock_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
                WHERE c.company_id = $1 AND c.is_active = true
                GROUP BY c.id
                ORDER BY c.name ASC
            `;

            const result = await database.query(query, [companyId]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting categories by company:', error);
            throw error;
        }
    }

    /**
     * Update category
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated category
     */
    static async update(categoryId, companyId, updates) {
        try {
            const allowedFields = ['name', 'description'];
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

            values.push(categoryId);
            values.push(companyId);

            const query = `
                UPDATE categories
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Category not found');
            }

            logger.business('category_updated', 'category', categoryId, {
                companyId,
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating category:', error);
            if (error.code === '23505') {
                throw new Error('Category name already exists in this company');
            }
            throw error;
        }
    }

    /**
     * Delete category (soft delete)
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(categoryId, companyId) {
        try {
            // Check if category has products
            const checkQuery = `
                SELECT COUNT(*) as product_count
                FROM products
                WHERE category_id = $1 AND company_id = $2 AND is_active = true
            `;

            const checkResult = await database.query(checkQuery, [categoryId, companyId]);

            if (parseInt(checkResult.rows[0].product_count) > 0) {
                throw new Error('Cannot delete category with existing products. Please move or delete products first.');
            }

            const deleteQuery = `
                UPDATE categories
                SET is_active = false, updated_at = NOW()
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(deleteQuery, [categoryId, companyId]);

            if (result.rowCount === 0) {
                throw new Error('Category not found');
            }

            logger.business('category_deleted', 'category', categoryId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Get category statistics
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Category statistics
     */
    static async getStatistics(companyId) {
        try {
            const query = `
                SELECT
                    COUNT(*) as total_categories,
                    COUNT(CASE WHEN product_count > 0 THEN 1 END) as categories_with_products,
                    AVG(product_count) as average_products_per_category,
                    MAX(product_count) as max_products_in_category,
                    MIN(product_count) as min_products_in_category
                FROM (
                    SELECT
                        c.id,
                        COUNT(p.id) as product_count
                    FROM categories c
                    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
                    WHERE c.company_id = $1 AND c.is_active = true
                    GROUP BY c.id
                ) category_products
            `;

            const result = await database.query(query, [companyId]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting category statistics:', error);
            throw error;
        }
    }

    /**
     * Get categories with low stock products
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Categories with low stock issues
     */
    static async getCategoriesWithLowStock(companyId) {
        try {
            const query = `
                SELECT
                    c.id,
                    c.name,
                    c.description,
                    COUNT(p.id) as total_products,
                    COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) as low_stock_products,
                    COUNT(CASE WHEN p.stock = 0 THEN 1 END) as out_of_stock_products
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
                WHERE c.company_id = $1 AND c.is_active = true
                GROUP BY c.id, c.name, c.description
                HAVING COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) > 0
                ORDER BY low_stock_products DESC, out_of_stock_products DESC
            `;

            const result = await database.query(query, [companyId]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting categories with low stock:', error);
            throw error;
        }
    }

    /**
     * Search categories by name
     * @param {string} companyId - Company ID
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} Matching categories
     */
    static async search(companyId, searchTerm) {
        try {
            const query = `
                SELECT
                    c.*,
                    COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
                WHERE c.company_id = $1
                  AND c.is_active = true
                  AND (c.name ILIKE $2 OR c.description ILIKE $2)
                GROUP BY c.id
                ORDER BY c.name ASC
            `;

            const result = await database.query(query, [companyId, `%${searchTerm}%`]);

            return result.rows;
        } catch (error) {
            logger.error('Error searching categories:', error);
            throw error;
        }
    }
}

export default CategoryModel;