import ServiceHistoryModel from '../models/serviceHistory.model.js';
import CloudinaryStorageService from '../services/cloudinaryStorage.service.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * ServiceHistory controller - Handles service history HTTP requests
 */
class ServiceHistoryController {

    /**
     * Get all service histories with pagination and filters
     * GET /api/v1/services
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                priority,
                serial_number,
                customer_name,
                technician_id,
                start_date,
                end_date,
                sort_by = 'entry_date',
                sort_order = 'DESC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                status,
                priority,
                serialNumber: serial_number,
                customerName: customer_name,
                technicianId: technician_id,
                startDate: start_date,
                endDate: end_date,
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: sort_by,
                sortOrder: sort_order
            };

            const result = await ServiceHistoryModel.getByCompany(filters);

            logger.business('service_histories_listed', 'service', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.services.length
            });

            ResponseHandler.paginated(res, result.services, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.getAll');
        }
    }

    /**
     * Get service history by ID
     * GET /api/v1/services/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const service = await ServiceHistoryModel.findById(id, req.companyId);

            if (!service) {
                return ResponseHandler.notFound(res, 'Service history');
            }

            logger.business('service_history_viewed', 'service', req.user.id, {
                serviceId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, service);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.getById');
        }
    }

    /**
     * Get service histories by serial number
     * GET /api/v1/services/serial/:serialNumber
     */
    static async getBySerialNumber(req, res) {
        try {
            const { serialNumber } = req.params;

            const services = await ServiceHistoryModel.findBySerialNumber(req.companyId, serialNumber);

            logger.business('service_histories_searched_by_serial', 'service', req.user.id, {
                serialNumber,
                companyId: req.companyId,
                count: services.length
            });

            ResponseHandler.success(
                res,
                services,
                `Found ${services.length} service records for serial number ${serialNumber}`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.getBySerialNumber');
        }
    }

    /**
     * Create new service history
     * POST /api/v1/services
     */
    static async create(req, res) {
        try {
            const {
                warranty_id,
                serial_number,
                product_name,
                customer_name,
                customer_email,
                customer_phone,
                entry_date,
                expected_delivery_date,
                status = 'received',
                priority = 'normal',
                reason,
                diagnosis,
                solution,
                observations,
                internal_notes,
                estimated_cost,
                actual_cost,
                technician_id
            } = req.body;

            // Handle photo uploads if any
            let photoUrls = [];
            if (req.files && req.files.length > 0) {
                try {
                    const uploadPromises = req.files.map(file =>
                        CloudinaryStorageService.uploadServiceImage(
                            file.buffer,
                            file.originalname,
                            serial_number || 'unknown',
                            { companyId: req.companyId, uploadedBy: req.user.id }
                        )
                    );
                    const uploadResults = await Promise.all(uploadPromises);
                    photoUrls = uploadResults.map(result => result.publicUrl);

                    logger.info(`Uploaded ${photoUrls.length} photos for service history`);
                } catch (uploadError) {
                    logger.error('Error uploading service photos:', uploadError);
                    // Continue without photos
                }
            }

            const serviceData = {
                warrantyId: warranty_id,
                companyId: req.companyId,
                serialNumber: serial_number,
                productName: product_name,
                customerName: customer_name,
                customerEmail: customer_email,
                customerPhone: customer_phone,
                entryDate: entry_date || new Date().toISOString().split('T')[0],
                expectedDeliveryDate: expected_delivery_date,
                status,
                priority,
                reason,
                diagnosis,
                solution,
                observations,
                internalNotes: internal_notes,
                estimatedCost: estimated_cost ? parseFloat(estimated_cost) : null,
                actualCost: actual_cost ? parseFloat(actual_cost) : null,
                photos: photoUrls,
                technicianId: technician_id,
                createdBy: req.user.id
            };

            const service = await ServiceHistoryModel.create(serviceData);

            logger.business('service_history_created', 'service', req.user.id, {
                serviceId: service.id,
                companyId: req.companyId,
                serialNumber: serial_number,
                status
            });

            ResponseHandler.created(
                res,
                service,
                'Service history created successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.create');
        }
    }

    /**
     * Update service history
     * PUT /api/v1/services/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updates = { ...req.body };

            // Handle photo uploads if any
            if (req.files && req.files.length > 0) {
                try {
                    // Get existing service to get serial number
                    const existingService = await ServiceHistoryModel.findById(id, req.companyId);
                    const serialNumber = existingService?.serial_number || 'unknown';

                    const uploadPromises = req.files.map(file =>
                        CloudinaryStorageService.uploadServiceImage(
                            file.buffer,
                            file.originalname,
                            serialNumber,
                            { companyId: req.companyId, uploadedBy: req.user.id }
                        )
                    );
                    const uploadResults = await Promise.all(uploadPromises);
                    const newPhotoUrls = uploadResults.map(result => result.publicUrl);

                    // Merge with existing photos
                    if (existingService) {
                        const existingPhotos = existingService.photos || [];
                        updates.photos = [...existingPhotos, ...newPhotoUrls];
                    } else {
                        updates.photos = newPhotoUrls;
                    }

                    logger.info(`Added ${newPhotoUrls.length} new photos to service history`);
                } catch (uploadError) {
                    logger.error('Error uploading service photos:', uploadError);
                    // Continue without adding new photos
                }
            }

            const service = await ServiceHistoryModel.update(id, req.companyId, updates);

            logger.business('service_history_updated', 'service', req.user.id, {
                serviceId: id,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                service,
                'Service history updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.update');
        }
    }

    /**
     * Delete service history
     * DELETE /api/v1/services/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await ServiceHistoryModel.delete(id, req.companyId);

            logger.business('service_history_deleted', 'service', req.user.id, {
                serviceId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Service history deleted successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.delete');
        }
    }

    /**
     * Get service statistics
     * GET /api/v1/services/statistics
     */
    static async getStatistics(req, res) {
        try {
            const statistics = await ServiceHistoryModel.getStatistics(req.companyId);

            logger.business('service_statistics_viewed', 'service', req.user.id, {
                companyId: req.companyId
            });

            ResponseHandler.success(res, statistics);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.getStatistics');
        }
    }

    /**
     * Update service status
     * PATCH /api/v1/services/:id/status
     */
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, actual_delivery_date } = req.body;

            if (!status) {
                return ResponseHandler.badRequest(res, 'Status is required');
            }

            const validStatuses = ['received', 'in_repair', 'waiting_parts', 'ready', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return ResponseHandler.badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }

            const updates = { status };
            if (status === 'delivered' && actual_delivery_date) {
                updates.actual_delivery_date = actual_delivery_date;
            }

            const service = await ServiceHistoryModel.update(id, req.companyId, updates);

            logger.business('service_status_updated', 'service', req.user.id, {
                serviceId: id,
                companyId: req.companyId,
                newStatus: status
            });

            ResponseHandler.success(
                res,
                service,
                `Service status updated to ${status}`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ServiceHistoryController.updateStatus');
        }
    }
}

export default ServiceHistoryController;
