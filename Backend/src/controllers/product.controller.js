import ProductModel from '../models/product.model.js';
import { logger } from '../config/logger.js';
import { cloudinary } from '../config/cloudinary.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Product controller - Handles product-related HTTP requests
 */
class ProductController {

    /**
     * Get all products with pagination and filters
     * GET /api/v1/products
     */
    static async getAll(req, res) {
        try {
            // Parse and validate query parameters
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
            const category = req.query.category_id || req.query.category || undefined;
            const search = req.query.search ? String(req.query.search).trim() : undefined;
            const stock_status = req.query.stock_status || undefined;
            const sort_by = req.query.sort_by || 'name';
            const sort_order = req.query.sort_order || 'ASC';

            // Validate sort fields
            const validSortFields = ['name', 'sku', 'price', 'stock', 'created_at'];
            if (!validSortFields.includes(sort_by)) {
                return ResponseHandler.badRequest(res, `Invalid sort_by field. Valid options: ${validSortFields.join(', ')}`);
            }

            // Validate sort order
            if (!['ASC', 'DESC'].includes(sort_order.toUpperCase())) {
                return ResponseHandler.badRequest(res, 'Invalid sort_order. Use ASC or DESC');
            }

            // Validate stock_status if provided
            if (stock_status && !['low', 'out', 'available'].includes(stock_status)) {
                return ResponseHandler.badRequest(res, 'Invalid stock_status. Valid options: low, out, available');
            }

            const filters = {
                companyId: req.companyId,
                categoryId: category,
                search,
                stockStatus: stock_status,
                page,
                limit,
                sortBy: sort_by,
                sortOrder: sort_order.toUpperCase()
            };

            const result = await ProductModel.getByCompany(filters);

            logger.business('products_listed', 'product', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.products.length
            });

            ResponseHandler.paginated(res, result.products, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.getAll');
        }
    }

    /**
     * Get product by ID
     * GET /api/v1/products/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const product = await ProductModel.findById(id, req.companyId);

            if (!product) {
                return ResponseHandler.notFound(res, 'Product');
            }

            logger.business('product_viewed', 'product', req.user.id, {
                productId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, product);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.getById');
        }
    }

    /**
     * Create new product
     * POST /api/v1/products
     */
    static async create(req, res) {
        try {
            let imageUrl = req.body.image_url;

            // Handle image upload if file is provided
            if (req.file) {
                try {
                    const result = await new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'stockly/products',
                                public_id: `product_${Date.now()}`,
                                transformation: [
                                    { width: 800, height: 800, crop: 'limit' },
                                    { quality: 'auto' }
                                ]
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        stream.end(req.file.buffer);
                    });
                    imageUrl = result.secure_url;
                } catch (uploadError) {
                    logger.error('Image upload failed:', uploadError);
                    // Continue without image, don't fail the product creation
                }
            }

            const productData = {
                companyId: req.companyId,
                categoryId: req.body.category_id,
                sku: req.body.sku,
                name: req.body.name,
                brand: req.body.brand,
                description: req.body.description,
                price: req.body.price !== undefined && req.body.price !== null 
                    ? parseFloat(req.body.price) 
                    : 0, // Price is now optional, defaults to 0
                stock: parseInt(req.body.stock) || 0,
                minStock: parseInt(req.body.min_stock) || 5,
                imageUrl,
                barcode: req.body.barcode,
                condition: req.body.condition || 'new'
            };

            const product = await ProductModel.create(productData);

            logger.business('product_created', 'product', req.user.id, {
                productId: product.id,
                companyId: req.companyId,
                sku: product.sku,
                name: product.name,
                brand: product.brand,
                condition: product.condition
            });

            ResponseHandler.success(res, product, 'Product created successfully', 201);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.create');
        }
    }

    /**
     * Update product
     * PUT /api/v1/products/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;

            const updates = {};

            // Only include fields that are provided
            if (req.body.category_id !== undefined) updates.category_id = req.body.category_id;
            if (req.body.sku !== undefined) updates.sku = req.body.sku;
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
            if (req.body.min_stock !== undefined) updates.min_stock = parseInt(req.body.min_stock);
            if (req.body.image_url !== undefined) updates.image_url = req.body.image_url;
            if (req.body.barcode !== undefined) updates.barcode = req.body.barcode;
            if (req.body.condition !== undefined) updates.condition = req.body.condition;

            const product = await ProductModel.update(id, req.companyId, updates);

            logger.business('product_updated', 'product', req.user.id, {
                productId: id,
                companyId: req.companyId,
                updatedFields: Object.keys(updates)
            });

            ResponseHandler.success(res, product, 'Product updated successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.update');
        }
    }

    /**
     * Update product stock
     * PATCH /api/v1/products/:id/stock
     */
    static async updateStock(req, res) {
        try {
            const { id } = req.params;
            const { stock, operation = 'set' } = req.body;

            if (stock === undefined || stock === null) {
                return ResponseHandler.error(res, 'Stock value is required', 400);
            }

            const newStock = parseInt(stock);
            if (isNaN(newStock)) {
                return ResponseHandler.error(res, 'Stock must be a valid number', 400);
            }

            const product = await ProductModel.updateStock(id, req.companyId, newStock, operation);

            logger.business('product_stock_updated', 'product', req.user.id, {
                productId: id,
                companyId: req.companyId,
                newStock: product.stock,
                operation,
                quantity: newStock
            });

            ResponseHandler.success(res, {
                product: {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    stock: product.stock,
                    stock_status: product.stock_status
                }
            }, 'Stock updated successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.updateStock');
        }
    }

    /**
     * Delete product (soft delete)
     * DELETE /api/v1/products/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await ProductModel.delete(id, req.companyId);

            logger.business('product_deleted', 'product', req.user.id, {
                productId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, null, 'Product deleted successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.delete');
        }
    }

    /**
     * Get low stock products
     * GET /api/v1/products/low-stock
     */
    static async getLowStock(req, res) {
        try {
            const products = await ProductModel.getLowStockProducts(req.companyId);

            logger.business('low_stock_products_viewed', 'product', req.user.id, {
                companyId: req.companyId,
                count: products.length
            });

            ResponseHandler.success(res, {
                products,
                count: products.length
            }, 'Low stock products retrieved successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.getLowStock');
        }
    }

    /**
     * Get product statistics
     * GET /api/v1/products/statistics
     */
    static async getStatistics(req, res) {
        try {
            const stats = await ProductModel.getStatistics(req.companyId);

            logger.business('product_statistics_viewed', 'product', req.user.id, {
                companyId: req.companyId
            });

            ResponseHandler.success(res, {
                total_products: parseInt(stats.total_products) || 0,
                out_of_stock: parseInt(stats.out_of_stock) || 0,
                low_stock: parseInt(stats.low_stock) || 0,
                available: parseInt(stats.available) || 0,
                average_price: parseFloat(stats.average_price) || 0,
                total_stock_value: parseFloat(stats.total_stock_value) || 0
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.getStatistics');
        }
    }

    /**
     * Get complete stock summary
     * GET /api/v1/products/stock/complete
     */
    static async getCompleteStock(req, res) {
        try {
            const {
                category,
                search,
                min_stock_only = false,
                sort_by = 'name',
                sort_order = 'ASC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                categoryId: category,
                search,
                limit: 10000 // Get all products
            };

            const result = await ProductModel.getByCompany(filters);

            // Process and consolidate stock
            const stockSummary = result.products
                .filter(product => {
                    if (min_stock_only) {
                        return product.stock <= product.min_stock;
                    }
                    return true;
                })
                .map(product => ({
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    category: product.category_name,
                    current_stock: product.stock,
                    min_stock: product.min_stock,
                    stock_status: product.stock_status,
                    price: product.price,
                    stock_value: product.stock * product.price,
                    condition: product.condition,
                    created_at: product.created_at
                }));

            // Calculate totals
            const totals = {
                total_items: stockSummary.reduce((sum, p) => sum + p.current_stock, 0),
                total_value: stockSummary.reduce((sum, p) => sum + p.stock_value, 0),
                products_count: stockSummary.length,
                low_stock_count: stockSummary.filter(p => p.stock_status === 'low').length,
                out_of_stock_count: stockSummary.filter(p => p.stock_status === 'out').length
            };

            logger.business('stock_complete_viewed', 'product', req.user.id, {
                companyId: req.companyId,
                productsCount: stockSummary.length,
                totalValue: totals.total_value
            });

            ResponseHandler.success(res, {
                summary: totals,
                products: stockSummary
            }, 'Complete stock summary retrieved successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.getCompleteStock');
        }
    }

    /**
     * Bulk update products
     * POST /api/v1/products/bulk-update
     */
    static async bulkUpdate(req, res) {
        try {
            const { products } = req.body;

            if (!Array.isArray(products)) {
                return ResponseHandler.error(res, 'Products must be an array', 400);
            }

            const results = [];
            const errors = [];

            for (const productUpdate of products) {
                try {
                    const updated = await ProductModel.update(
                        productUpdate.id,
                        req.companyId,
                        productUpdate.updates
                    );
                    results.push(updated);
                } catch (error) {
                    errors.push({
                        productId: productUpdate.id,
                        error: error.message
                    });
                }
            }

            logger.business('products_bulk_updated', 'product', req.user.id, {
                companyId: req.companyId,
                successCount: results.length,
                errorCount: errors.length
            });

            ResponseHandler.success(res, {
                success: results.length,
                errors: errors.length,
                results,
                errors: errors.length > 0 ? errors : undefined
            }, `Bulk update completed: ${results.length} success, ${errors.length} errors`);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ProductController.bulkUpdate');
        }
    }
}

export default ProductController;