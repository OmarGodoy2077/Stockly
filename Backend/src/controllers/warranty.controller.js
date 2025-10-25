import WarrantyModel from '../models/warranty.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Warranty controller - Handles warranty-related HTTP requests
 */
class WarrantyController {

    /**
     * Get all warranties with pagination and filters
     * GET /api/v1/warranties
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status = 'all',
                serial_number,
                customer_name,
                sort_by = 'expires_at',
                sort_order = 'ASC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                status,
                serialNumber: serial_number,
                customerName: customer_name,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: sort_by,
                sortOrder: sort_order
            };

            const result = await WarrantyModel.getByCompany(filters);

            logger.business('warranties_listed', 'warranty', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.warranties.length
            });

            ResponseHandler.paginated(res, result.warranties, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getAll');
        }
    }

    /**
     * Get warranty by ID
     * GET /api/v1/warranties/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const warranty = await WarrantyModel.findById(id, req.companyId);

            if (!warranty) {
                return ResponseHandler.notFound(res, 'Warranty');
            }

            logger.business('warranty_viewed', 'warranty', req.user.id, {
                warrantyId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, warranty);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getById');
        }
    }

    /**
     * Get warranty by serial number
     * GET /api/v1/warranties/serial/:serialNumber
     */
    static async getBySerialNumber(req, res) {
        try {
            const { serialNumber } = req.params;

            const warranty = await WarrantyModel.findBySerialNumber(req.companyId, serialNumber);

            if (!warranty) {
                return ResponseHandler.notFound(res, 'Warranty with that serial number');
            }

            logger.business('warranty_searched_by_serial', 'warranty', req.user.id, {
                serialNumber,
                companyId: req.companyId
            });

            ResponseHandler.success(res, warranty);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getBySerialNumber');
        }
    }

    /**
     * Update warranty
     * PUT /api/v1/warranties/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const warranty = await WarrantyModel.update(id, req.companyId, updates);

            logger.business('warranty_updated', 'warranty', req.user.id, {
                warrantyId: id,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                warranty,
                'Warranty updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.update');
        }
    }

    /**
     * Deactivate warranty
     * DELETE /api/v1/warranties/:id
     */
    static async deactivate(req, res) {
        try {
            const { id } = req.params;

            await WarrantyModel.deactivate(id, req.companyId);

            logger.business('warranty_deactivated', 'warranty', req.user.id, {
                warrantyId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Warranty deactivated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.deactivate');
        }
    }

    /**
     * Get expiring warranties (for alerts)
     * GET /api/v1/warranties/expiring/:days
     */
    static async getExpiring(req, res) {
        try {
            const { days = 30 } = req.params;

            const warranties = await WarrantyModel.getExpiring(req.companyId, parseInt(days));

            logger.business('expiring_warranties_checked', 'warranty', req.user.id, {
                companyId: req.companyId,
                days,
                count: warranties.length
            });

            ResponseHandler.success(
                res,
                warranties,
                `Found ${warranties.length} warranties expiring in the next ${days} days`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getExpiring');
        }
    }

    /**
     * Get warranty statistics
     * GET /api/v1/warranties/statistics
     */
    static async getStatistics(req, res) {
        try {
            const statistics = await WarrantyModel.getStatistics(req.companyId);

            logger.business('warranty_statistics_viewed', 'warranty', req.user.id, {
                companyId: req.companyId
            });

            ResponseHandler.success(res, statistics);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getStatistics');
        }
    }

    /**
     * Diagnostic endpoint - Check warranty system status
     * GET /api/v1/warranties/diagnostic
     */
    static async getDiagnostic(req, res) {
        try {
            const companyId = req.companyId;
            
            // Get warranties count
            const allWarranties = await WarrantyModel.getByCompany({
                companyId,
                status: 'all',
                page: 1,
                limit: 1000
            });

            const totalWarranties = allWarranties.pagination.total;
            const warrantiesList = allWarranties.warranties.map(w => ({
                id: w.id,
                serial_number: w.serial_number,
                product_name: w.product_name,
                customer_name: w.customer_name,
                warranty_status: w.warranty_status,
                days_remaining: w.days_remaining,
                sale_products_count: w.sale_products?.length || 0,
                sale_products: w.sale_products || []
            }));

            const diagnostic = {
                timestamp: new Date().toISOString(),
                company_id: companyId,
                warranty_system: {
                    total_warranties: totalWarranties,
                    warranties: warrantiesList,
                    sample_warranty: warrantiesList[0] || null
                }
            };

            ResponseHandler.success(res, diagnostic);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'WarrantyController.getDiagnostic');
        }
    }
}

export default WarrantyController;
