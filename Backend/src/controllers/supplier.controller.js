import SupplierModel from '../models/supplier.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Supplier controller - Handles supplier-related HTTP requests
 */
class SupplierController {

    /**
     * Get all suppliers with pagination and filters
     * GET /api/v1/suppliers
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                sort_by = 'name',
                sort_order = 'ASC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                search,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: sort_by,
                sortOrder: sort_order
            };

            const result = await SupplierModel.getByCompany(filters);

            logger.business('suppliers_listed', 'supplier', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.suppliers.length
            });

            ResponseHandler.paginated(res, result.suppliers, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.getAll');
        }
    }

    /**
     * Get supplier by ID
     * GET /api/v1/suppliers/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const supplier = await SupplierModel.findById(id, req.companyId);

            if (!supplier) {
                return ResponseHandler.notFound(res, 'Supplier');
            }

            logger.business('supplier_viewed', 'supplier', req.user.id, {
                supplierId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, supplier);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.getById');
        }
    }

    /**
     * Create new supplier
     * POST /api/v1/suppliers
     */
    static async create(req, res) {
        try {
            const {
                name,
                contact_person,
                email,
                phone,
                address,
                ruc
            } = req.body;

            if (!name || name.trim() === '') {
                return ResponseHandler.badRequest(res, 'Supplier name is required');
            }

            const supplierData = {
                companyId: req.companyId,
                name: name.trim(),
                contactPerson: contact_person,
                email,
                phone,
                address,
                ruc
            };

            const supplier = await SupplierModel.create(supplierData);

            logger.business('supplier_created', 'supplier', req.user.id, {
                supplierId: supplier.id,
                companyId: req.companyId,
                name
            });

            ResponseHandler.created(
                res,
                supplier,
                'Supplier created successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.create');
        }
    }

    /**
     * Update supplier
     * PUT /api/v1/suppliers/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = { ...req.body };

            // Trim name if provided
            if (updates.name) {
                updates.name = updates.name.trim();
            }

            if (Object.keys(updates).length === 0) {
                return ResponseHandler.badRequest(res, 'No fields to update');
            }

            const supplier = await SupplierModel.update(id, req.companyId, updates);

            logger.business('supplier_updated', 'supplier', req.user.id, {
                supplierId: id,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                supplier,
                'Supplier updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.update');
        }
    }

    /**
     * Delete supplier (soft delete)
     * DELETE /api/v1/suppliers/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await SupplierModel.delete(id, req.companyId);

            logger.business('supplier_deleted', 'supplier', req.user.id, {
                supplierId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Supplier deleted successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.delete');
        }
    }

    /**
     * Get top suppliers by purchase amount
     * GET /api/v1/suppliers/top/:limit?
     */
    static async getTopSuppliers(req, res) {
        try {
            const { limit = 10 } = req.params;

            const suppliers = await SupplierModel.getTopSuppliers(
                req.companyId,
                parseInt(limit)
            );

            logger.business('top_suppliers_viewed', 'supplier', req.user.id, {
                companyId: req.companyId,
                limit,
                count: suppliers.length
            });

            ResponseHandler.success(
                res,
                suppliers,
                `Top ${suppliers.length} suppliers by purchase amount`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SupplierController.getTopSuppliers');
        }
    }
}

export default SupplierController;
