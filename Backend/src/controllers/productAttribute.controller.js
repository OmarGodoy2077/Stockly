import ProductAttributeModel from '../models/productAttribute.model.js';
import ProductModel from '../models/product.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * ProductAttribute controller - Handles product attribute-related HTTP requests
 */
class ProductAttributeController {

    /**
     * Get all attributes for a product
     * GET /api/v1/products/:productId/attributes
     */
    static async getByProduct(req, res) {
        try {
            const { productId } = req.params;

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            const attributes = await ProductAttributeModel.findByProductId(productId);

            logger.business('product_attributes_listed', 'product_attribute', req.user.id, {
                productId,
                companyId: req.companyId,
                count: attributes.length
            });

            ResponseHandler.success(res, attributes);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.getByProduct');
        }
    }

    /**
     * Get attribute by ID
     * GET /api/v1/products/:productId/attributes/:attributeId
     */
    static async getById(req, res) {
        try {
            const { productId, attributeId } = req.params;

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            const attribute = await ProductAttributeModel.findById(attributeId);

            if (!attribute || attribute.product_id !== productId) {
                return ResponseHandler.notFound(res, 'Product Attribute');
            }

            logger.business('product_attribute_viewed', 'product_attribute', req.user.id, {
                attributeId,
                productId,
                companyId: req.companyId
            });

            ResponseHandler.success(res, attribute);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.getById');
        }
    }

    /**
     * Create new product attribute
     * POST /api/v1/products/:productId/attributes
     */
    static async create(req, res) {
        try {
            const { productId } = req.params;
            const { name, value, order_index } = req.body;

            if (!name || name.trim() === '') {
                return ResponseHandler.badRequest(res, 'Attribute name is required');
            }

            if (!value || value.toString().trim() === '') {
                return ResponseHandler.badRequest(res, 'Attribute value is required');
            }

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            const attributeData = {
                productId,
                name: name.trim(),
                value: value.toString().trim(),
                orderIndex: order_index || 0
            };

            const attribute = await ProductAttributeModel.create(attributeData);

            logger.business('product_attribute_created', 'product_attribute', req.user.id, {
                attributeId: attribute.id,
                productId,
                companyId: req.companyId,
                name
            });

            ResponseHandler.created(
                res,
                attribute,
                'Product attribute created successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.create');
        }
    }

    /**
     * Update product attribute
     * PUT /api/v1/products/:productId/attributes/:attributeId
     */
    static async update(req, res) {
        try {
            const { productId, attributeId } = req.params;
            const { name, value, order_index } = req.body;

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            const updates = {};
            if (name !== undefined) updates.name = name.trim();
            if (value !== undefined) updates.value = value.toString().trim();
            if (order_index !== undefined) updates.order_index = order_index;

            if (Object.keys(updates).length === 0) {
                return ResponseHandler.badRequest(res, 'No fields to update');
            }

            const attribute = await ProductAttributeModel.update(attributeId, productId, updates);

            logger.business('product_attribute_updated', 'product_attribute', req.user.id, {
                attributeId,
                productId,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                attribute,
                'Product attribute updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.update');
        }
    }

    /**
     * Delete product attribute
     * DELETE /api/v1/products/:productId/attributes/:attributeId
     */
    static async delete(req, res) {
        try {
            const { productId, attributeId } = req.params;

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            await ProductAttributeModel.delete(attributeId, productId);

            logger.business('product_attribute_deleted', 'product_attribute', req.user.id, {
                attributeId,
                productId,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Product attribute deleted successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.delete');
        }
    }

    /**
     * Add multiple attributes to a product
     * POST /api/v1/products/:productId/attributes/bulk
     */
    static async createBulk(req, res) {
        try {
            const { productId } = req.params;
            const { attributes } = req.body;

            if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
                return ResponseHandler.badRequest(res, 'Attributes array is required');
            }

            // Verify product exists and belongs to company
            const product = await ProductModel.findById(productId, req.companyId);
            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            const createdAttributes = await ProductAttributeModel.createMultiple(productId, attributes);

            logger.business('product_attributes_bulk_created', 'product_attribute', req.user.id, {
                productId,
                companyId: req.companyId,
                count: createdAttributes.length
            });

            ResponseHandler.created(
                res,
                createdAttributes,
                `${createdAttributes.length} product attributes created successfully`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductAttributeController.createBulk');
        }
    }
}

export default ProductAttributeController;
