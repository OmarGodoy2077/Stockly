import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * ProductAttribute model - Handles product attributes operations
 */
class ProductAttributeModel {

    /**
     * Create a new product attribute
     * @param {Object} attributeData - Attribute data
     * @returns {Promise<Object>} Created attribute
     */
    static async create({
        productId,
        name,
        value,
        orderIndex = 0
    }) {
        try {
            const query = `
                INSERT INTO product_attributes (
                    product_id, name, value, order_index
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const result = await database.query(query, [
                productId, name, value, orderIndex
            ]);

            logger.business('product_attribute_created', 'product_attribute', result.rows[0].id, {
                productId,
                name,
                value
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating product attribute:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error(`Attribute "${name}" already exists for this product`);
            }
            throw error;
        }
    }

    /**
     * Find attributes by product ID
     * @param {string} productId - Product ID
     * @returns {Promise<Array>} Product attributes
     */
    static async findByProductId(productId) {
        try {
            const query = `
                SELECT *
                FROM product_attributes
                WHERE product_id = $1
                ORDER BY order_index ASC, name ASC
            `;

            const result = await database.query(query, [productId]);

            return result.rows;
        } catch (error) {
            logger.error('Error finding product attributes:', error);
            throw error;
        }
    }

    /**
     * Find attribute by ID
     * @param {string} attributeId - Attribute ID
     * @returns {Promise<Object|null>} Attribute data or null
     */
    static async findById(attributeId) {
        try {
            const query = `
                SELECT *
                FROM product_attributes
                WHERE id = $1
            `;

            const result = await database.query(query, [attributeId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error finding product attribute by ID:', error);
            throw error;
        }
    }

    /**
     * Update product attribute
     * @param {string} attributeId - Attribute ID
     * @param {string} productId - Product ID (for security)
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated attribute
     */
    static async update(attributeId, productId, updates) {
        try {
            const allowedFields = ['name', 'value', 'order_index'];
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

            values.push(attributeId);
            values.push(productId);

            const query = `
                UPDATE product_attributes
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount} AND product_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Product attribute not found');
            }

            logger.business('product_attribute_updated', 'product_attribute', attributeId, {
                productId,
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating product attribute:', error);
            if (error.code === '23505') {
                throw new Error('Attribute name already exists for this product');
            }
            throw error;
        }
    }

    /**
     * Delete product attribute
     * @param {string} attributeId - Attribute ID
     * @param {string} productId - Product ID (for security)
     * @returns {Promise<boolean>} Success status
     */
    static async delete(attributeId, productId) {
        try {
            const query = `
                DELETE FROM product_attributes
                WHERE id = $1 AND product_id = $2
            `;

            const result = await database.query(query, [attributeId, productId]);

            if (result.rowCount === 0) {
                throw new Error('Product attribute not found');
            }

            logger.business('product_attribute_deleted', 'product_attribute', attributeId, {
                productId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting product attribute:', error);
            throw error;
        }
    }

    /**
     * Add multiple attributes to a product
     * @param {string} productId - Product ID
     * @param {Array} attributes - Array of {name, value} objects
     * @returns {Promise<Array>} Created attributes
     */
    static async createMultiple(productId, attributes) {
        try {
            const createdAttributes = [];

            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                const attribute = await this.create({
                    productId,
                    name: attr.name,
                    value: attr.value,
                    orderIndex: i
                });
                createdAttributes.push(attribute);
            }

            return createdAttributes;
        } catch (error) {
            logger.error('Error creating multiple product attributes:', error);
            throw error;
        }
    }

    /**
     * Delete all attributes for a product
     * @param {string} productId - Product ID
     * @returns {Promise<number>} Number of deleted attributes
     */
    static async deleteByProductId(productId) {
        try {
            const query = `
                DELETE FROM product_attributes
                WHERE product_id = $1
            `;

            const result = await database.query(query, [productId]);

            return result.rowCount;
        } catch (error) {
            logger.error('Error deleting product attributes:', error);
            throw error;
        }
    }
}

export default ProductAttributeModel;
