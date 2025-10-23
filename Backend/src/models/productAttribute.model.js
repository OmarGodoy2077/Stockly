import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

class ProductAttributeModel {

    static async create({ productId, name, value, orderIndex = 0 }) {
        try {
            const { data, error } = await database.supabase
                .from('product_attributes')
                .insert([{
                    product_id: productId,
                    name,
                    value,
                    order_index: orderIndex
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error(`Attribute "${name}" already exists for this product`);
                }
                throw error;
            }

            logger.business('product_attribute_created', 'product_attribute', data.id, {
                productId,
                name,
                value
            });

            return data;
        } catch (error) {
            logger.error('Error creating product attribute:', error);
            throw error;
        }
    }

    static async findByProductId(productId) {
        try {
            const { data, error } = await database.supabase
                .from('product_attributes')
                .select('*')
                .eq('product_id', productId)
                .order('order_index', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            logger.error('Error finding product attributes:', error);
            throw error;
        }
    }

    static async findById(attributeId) {
        try {
            const { data, error } = await database.supabase
                .from('product_attributes')
                .select('*')
                .eq('id', attributeId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data || null;
        } catch (error) {
            logger.error('Error finding product attribute by ID:', error);
            throw error;
        }
    }

    static async update(attributeId, productId, updates) {
        try {
            const allowedFields = ['name', 'value', 'order_index'];
            const updateData = {};
            
            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const { data, error } = await database.supabase
                .from('product_attributes')
                .update(updateData)
                .eq('id', attributeId)
                .eq('product_id', productId)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Attribute name already exists for this product');
                }
                throw error;
            }

            if (!data) {
                throw new Error('Product attribute not found');
            }

            logger.business('product_attribute_updated', 'product_attribute', attributeId, {
                productId,
                updatedFields: Object.keys(updates)
            });

            return data;
        } catch (error) {
            logger.error('Error updating product attribute:', error);
            throw error;
        }
    }

    static async delete(attributeId, productId) {
        try {
            const { error } = await database.supabase
                .from('product_attributes')
                .delete()
                .eq('id', attributeId)
                .eq('product_id', productId);

            if (error) throw error;

            logger.business('product_attribute_deleted', 'product_attribute', attributeId, {
                productId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting product attribute:', error);
            throw error;
        }
    }

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

    static async deleteByProductId(productId) {
        try {
            const { data, error } = await database.supabase
                .from('product_attributes')
                .delete()
                .eq('product_id', productId)
                .select();

            if (error) throw error;

            return data ? data.length : 0;
        } catch (error) {
            logger.error('Error deleting product attributes:', error);
            throw error;
        }
    }
}

export default ProductAttributeModel;
