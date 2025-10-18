import PurchaseModel from '../models/purchase.model.js';
import ProductModel from '../models/product.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Purchase controller - Handles purchase-related HTTP requests
 */
class PurchaseController {

    /**
     * Get all purchases with pagination and filters
     * GET /api/v1/purchases
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                supplier_id,
                supplier_name,
                start_date,
                end_date,
                sort_by = 'purchase_date',
                sort_order = 'DESC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                supplierId: supplier_id,
                supplierName: supplier_name,
                startDate: start_date,
                endDate: end_date,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: sort_by,
                sortOrder: sort_order
            };

            const result = await PurchaseModel.getByCompany(filters);

            logger.business('purchases_listed', 'purchase', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.purchases.length
            });

            ResponseHandler.paginated(res, result.purchases, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.getAll');
        }
    }

    /**
     * Get purchase by ID
     * GET /api/v1/purchases/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const purchase = await PurchaseModel.findById(id, req.companyId);

            if (!purchase) {
                return ResponseHandler.notFound(res, 'Purchase');
            }

            logger.business('purchase_viewed', 'purchase', req.user.id, {
                purchaseId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, purchase);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.getById');
        }
    }

    /**
     * Create new purchase and update stock
     * POST /api/v1/purchases
     */
    static async create(req, res) {
        try {
            const {
                supplier_id,
                supplier_name,
                invoice_number,
                products,
                purchase_date,
                notes
            } = req.body;

            // Validate products
            if (!products || !Array.isArray(products) || products.length === 0) {
                return ResponseHandler.badRequest(res, 'Products array is required');
            }

            // Calculate total amount
            let totalAmount = 0;
            const processedProducts = products.map(product => {
                const quantity = parseInt(product.quantity);
                const unitPrice = parseFloat(product.unit_price);
                
                if (isNaN(quantity) || quantity <= 0) {
                    throw new Error(`Invalid quantity for product ${product.product_id}`);
                }
                if (isNaN(unitPrice) || unitPrice < 0) {
                    throw new Error(`Invalid unit price for product ${product.product_id}`);
                }

                const subtotal = quantity * unitPrice;
                totalAmount += subtotal;

                return {
                    product_id: product.product_id,
                    quantity,
                    unit_price: unitPrice,
                    subtotal
                };
            });

            const purchaseData = {
                companyId: req.companyId,
                userId: req.user.id,
                supplierId: supplier_id,
                supplierName: supplier_name,
                invoiceNumber: invoice_number,
                products: processedProducts,
                totalAmount,
                purchaseDate: purchase_date || new Date().toISOString().split('T')[0],
                notes
            };

            const purchase = await PurchaseModel.create(purchaseData);

            // Update product stock
            try {
                for (const product of processedProducts) {
                    await ProductModel.updateStock(
                        product.product_id,
                        req.companyId,
                        product.quantity,
                        'add'
                    );
                }
            } catch (stockError) {
                logger.error('Error updating stock after purchase:', stockError);
                // Purchase was created but stock update failed
                return ResponseHandler.success(
                    res,
                    purchase,
                    'Purchase created but stock update failed. Please update stock manually.'
                );
            }

            logger.business('purchase_created', 'purchase', req.user.id, {
                purchaseId: purchase.id,
                companyId: req.companyId,
                totalAmount,
                productCount: processedProducts.length
            });

            ResponseHandler.created(
                res,
                purchase,
                'Purchase created and stock updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.create');
        }
    }

    /**
     * Update purchase
     * PUT /api/v1/purchases/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = { ...req.body };

            // If products are updated, recalculate total amount
            if (updates.products && Array.isArray(updates.products)) {
                let totalAmount = 0;
                updates.products.forEach(product => {
                    const quantity = parseInt(product.quantity);
                    const unitPrice = parseFloat(product.unit_price);
                    totalAmount += quantity * unitPrice;
                });
                updates.total_amount = totalAmount;
            }

            const purchase = await PurchaseModel.update(id, req.companyId, updates);

            logger.business('purchase_updated', 'purchase', req.user.id, {
                purchaseId: id,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                purchase,
                'Purchase updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.update');
        }
    }

    /**
     * Delete purchase
     * DELETE /api/v1/purchases/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await PurchaseModel.delete(id, req.companyId);

            logger.business('purchase_deleted', 'purchase', req.user.id, {
                purchaseId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Purchase deleted successfully. Note: Stock was not adjusted.'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.delete');
        }
    }

    /**
     * Get purchase statistics
     * GET /api/v1/purchases/statistics
     */
    static async getStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;

            const statistics = await PurchaseModel.getStatistics(
                req.companyId,
                start_date,
                end_date
            );

            logger.business('purchase_statistics_viewed', 'purchase', req.user.id, {
                companyId: req.companyId,
                startDate: start_date,
                endDate: end_date
            });

            ResponseHandler.success(res, statistics);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.getStatistics');
        }
    }

    /**
     * Get purchases by supplier
     * GET /api/v1/purchases/supplier/:supplierId
     */
    static async getBySupplier(req, res) {
        try {
            const { supplierId } = req.params;

            const purchases = await PurchaseModel.getBySupplier(req.companyId, supplierId);

            logger.business('purchases_by_supplier_viewed', 'purchase', req.user.id, {
                companyId: req.companyId,
                supplierId,
                count: purchases.length
            });

            ResponseHandler.success(
                res,
                purchases,
                `Found ${purchases.length} purchases from this supplier`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'PurchaseController.getBySupplier');
        }
    }
}

export default PurchaseController;
