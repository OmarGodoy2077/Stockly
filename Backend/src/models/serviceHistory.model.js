import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * ServiceHistory model - Handles service history database operations
 */
class ServiceHistoryModel {

    /**
     * Create a new service history record
     * @param {Object} serviceData - Service data
     * @returns {Promise<Object>} Created service history
     */
    static async create({
        warrantyId = null,
        companyId,
        serialNumber,
        productName,
        customerName,
        customerEmail = null,
        customerPhone = null,
        entryDate,
        expectedDeliveryDate = null,
        status = 'received',
        priority = 'normal',
        reason,
        diagnosis = null,
        solution = null,
        observations = null,
        internalNotes = null,
        estimatedCost = null,
        actualCost = null,
        photos = [],
        technicianId = null,
        createdBy
    }) {
        try {
            const query = `
                INSERT INTO service_histories (
                    warranty_id, company_id, serial_number, product_name,
                    customer_name, customer_email, customer_phone,
                    entry_date, expected_delivery_date, status, priority,
                    reason, diagnosis, solution, observations, internal_notes,
                    estimated_cost, actual_cost, photos, technician_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                RETURNING *
            `;

            const result = await database.query(query, [
                warrantyId, companyId, serialNumber, productName,
                customerName, customerEmail, customerPhone,
                entryDate, expectedDeliveryDate, status, priority,
                reason, diagnosis, solution, observations, internalNotes,
                estimatedCost, actualCost, JSON.stringify(photos), technicianId, createdBy
            ]);

            logger.business('service_history_created', 'service', result.rows[0].id, {
                companyId,
                serialNumber,
                status,
                createdBy
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating service history:', error);
            throw error;
        }
    }

    /**
     * Find service history by ID
     * @param {string} serviceId - Service ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Service history or null
     */
    static async findById(serviceId, companyId) {
        try {
            const query = `
                SELECT
                    sh.*,
                    w.warranty_months,
                    w.expires_at as warranty_expires,
                    creator.name as created_by_name,
                    creator.email as created_by_email,
                    tech.name as technician_name,
                    tech.email as technician_email,
                    CASE
                        WHEN sh.status = 'delivered' AND sh.actual_delivery_date IS NOT NULL
                        THEN sh.actual_delivery_date - sh.entry_date
                        ELSE NULL
                    END as repair_days
                FROM service_histories sh
                LEFT JOIN warranties w ON sh.warranty_id = w.id
                LEFT JOIN users creator ON sh.created_by = creator.id
                LEFT JOIN users tech ON sh.technician_id = tech.id
                WHERE sh.id = $1 AND sh.company_id = $2
            `;

            const result = await database.query(query, [serviceId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            // Parse photos JSON
            const service = result.rows[0];
            if (service.photos) {
                service.photos = typeof service.photos === 'string' 
                    ? JSON.parse(service.photos) 
                    : service.photos;
            }

            return service;
        } catch (error) {
            logger.error('Error finding service history by ID:', error);
            throw error;
        }
    }

    /**
     * Get service histories by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Service histories with pagination
     */
    static async getByCompany({
        companyId,
        status = null,
        priority = null,
        serialNumber = null,
        customerName = null,
        technicianId = null,
        startDate = null,
        endDate = null,
        page = 1,
        limit = 20,
        sortBy = 'entry_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;
            const params = [companyId];
            let paramCount = 1;

            // Build WHERE clause
            let whereConditions = ['sh.company_id = $1'];

            if (status) {
                paramCount++;
                whereConditions.push(`sh.status = $${paramCount}`);
                params.push(status);
            }

            if (priority) {
                paramCount++;
                whereConditions.push(`sh.priority = $${paramCount}`);
                params.push(priority);
            }

            if (serialNumber) {
                paramCount++;
                whereConditions.push(`sh.serial_number ILIKE $${paramCount}`);
                params.push(`%${serialNumber}%`);
            }

            if (customerName) {
                paramCount++;
                whereConditions.push(`sh.customer_name ILIKE $${paramCount}`);
                params.push(`%${customerName}%`);
            }

            if (technicianId) {
                paramCount++;
                whereConditions.push(`sh.technician_id = $${paramCount}`);
                params.push(technicianId);
            }

            if (startDate) {
                paramCount++;
                whereConditions.push(`sh.entry_date >= $${paramCount}`);
                params.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereConditions.push(`sh.entry_date <= $${paramCount}`);
                params.push(endDate);
            }

            const whereClause = whereConditions.join(' AND ');

            // Validate sort fields
            const validSortFields = {
                'entry_date': 'sh.entry_date',
                'expected_delivery_date': 'sh.expected_delivery_date',
                'status': 'sh.status',
                'priority': 'sh.priority',
                'customer_name': 'sh.customer_name',
                'created_at': 'sh.created_at'
            };
            const sortField = validSortFields[sortBy] || 'sh.entry_date';
            const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Main query
            const query = `
                SELECT
                    sh.*,
                    creator.name as created_by_name,
                    tech.name as technician_name,
                    w.warranty_months,
                    w.expires_at as warranty_expires
                FROM service_histories sh
                LEFT JOIN users creator ON sh.created_by = creator.id
                LEFT JOIN users tech ON sh.technician_id = tech.id
                LEFT JOIN warranties w ON sh.warranty_id = w.id
                WHERE ${whereClause}
                ORDER BY ${sortField} ${order}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM service_histories sh
                WHERE ${whereClause}
            `;

            params.push(limit, offset);

            const [services, countResult] = await Promise.all([
                database.query(query, params),
                database.query(countQuery, params.slice(0, paramCount))
            ]);

            // Parse photos JSON for each service
            const servicesWithPhotos = services.rows.map(service => ({
                ...service,
                photos: service.photos && typeof service.photos === 'string'
                    ? JSON.parse(service.photos)
                    : (service.photos || [])
            }));

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                services: servicesWithPhotos,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Error getting service histories:', error);
            throw error;
        }
    }

    /**
     * Update service history
     * @param {string} serviceId - Service ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated service history
     */
    static async update(serviceId, companyId, updates) {
        try {
            const allowedFields = [
                'status', 'priority', 'expected_delivery_date', 'actual_delivery_date',
                'diagnosis', 'solution', 'observations', 'internal_notes',
                'estimated_cost', 'actual_cost', 'technician_id', 'photos'
            ];

            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    if (key === 'photos') {
                        fields.push(`photos = $${paramCount}`);
                        values.push(JSON.stringify(updates[key]));
                    } else {
                        fields.push(`${key} = $${paramCount}`);
                        values.push(updates[key]);
                    }
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            fields.push('updated_at = NOW()');
            values.push(serviceId, companyId);

            const query = `
                UPDATE service_histories
                SET ${fields.join(', ')}
                WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
                RETURNING *
            `;

            const result = await database.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Service history not found');
            }

            logger.business('service_history_updated', 'service', serviceId, {
                companyId,
                updates
            });

            const service = result.rows[0];
            if (service.photos) {
                service.photos = typeof service.photos === 'string'
                    ? JSON.parse(service.photos)
                    : service.photos;
            }

            return service;
        } catch (error) {
            logger.error('Error updating service history:', error);
            throw error;
        }
    }

    /**
     * Delete service history
     * @param {string} serviceId - Service ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(serviceId, companyId) {
        try {
            const query = `
                DELETE FROM service_histories
                WHERE id = $1 AND company_id = $2
            `;

            const result = await database.query(query, [serviceId, companyId]);

            if (result.rowCount === 0) {
                throw new Error('Service history not found');
            }

            logger.business('service_history_deleted', 'service', serviceId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting service history:', error);
            throw error;
        }
    }

    /**
     * Get service statistics for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(companyId) {
        try {
            const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'received') as received,
                    COUNT(*) FILTER (WHERE status = 'in_repair') as in_repair,
                    COUNT(*) FILTER (WHERE status = 'waiting_parts') as waiting_parts,
                    COUNT(*) FILTER (WHERE status = 'ready') as ready,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
                    AVG(CASE
                        WHEN status = 'delivered' AND actual_delivery_date IS NOT NULL
                        THEN actual_delivery_date - entry_date
                        ELSE NULL
                    END) as avg_repair_days
                FROM service_histories
                WHERE company_id = $1
            `;

            const result = await database.query(query, [companyId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting service statistics:', error);
            throw error;
        }
    }

    /**
     * Find services by serial number
     * @param {string} companyId - Company ID
     * @param {string} serialNumber - Serial number
     * @returns {Promise<Array>} Service histories
     */
    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const query = `
                SELECT
                    sh.*,
                    creator.name as created_by_name,
                    tech.name as technician_name
                FROM service_histories sh
                LEFT JOIN users creator ON sh.created_by = creator.id
                LEFT JOIN users tech ON sh.technician_id = tech.id
                WHERE sh.company_id = $1 AND sh.serial_number = $2
                ORDER BY sh.entry_date DESC
            `;

            const result = await database.query(query, [companyId, serialNumber]);

            return result.rows.map(service => ({
                ...service,
                photos: service.photos && typeof service.photos === 'string'
                    ? JSON.parse(service.photos)
                    : (service.photos || [])
            }));
        } catch (error) {
            logger.error('Error finding services by serial number:', error);
            throw error;
        }
    }
}

export default ServiceHistoryModel;
