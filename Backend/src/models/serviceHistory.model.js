import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

class ServiceHistoryModel {

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
            const { data, error } = await database.supabase
                .from('service_histories')
                .insert([{
                    warranty_id: warrantyId,
                    company_id: companyId,
                    serial_number: serialNumber,
                    product_name: productName,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    entry_date: entryDate,
                    expected_delivery_date: expectedDeliveryDate,
                    status: status,
                    priority: priority,
                    reason: reason,
                    diagnosis: diagnosis,
                    solution: solution,
                    observations: observations,
                    internal_notes: internalNotes,
                    estimated_cost: estimatedCost,
                    actual_cost: actualCost,
                    photos: photos,
                    technician_id: technicianId,
                    created_by: createdBy
                }])
                .select()
                .single();

            if (error) throw error;

            logger.business('service_history_created', 'service', data.id, {
                companyId,
                serialNumber,
                status,
                createdBy
            });

            return data;
        } catch (error) {
            logger.error('Error creating service history:', error);
            throw error;
        }
    }

    static async findById(serviceId, companyId) {
        try {
            const { data: service, error } = await database.supabase
                .from('service_histories')
                .select('*, users!service_histories_technician_id_fkey (name, email), warranties (warranty_code)')
                .eq('id', serviceId)
                .eq('company_id', companyId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!service) return null;

            return {
                ...service,
                technician_name: service.users?.name,
                technician_email: service.users?.email,
                warranty_code: service.warranties?.warranty_code
            };
        } catch (error) {
            logger.error('Error finding service history by ID:', error);
            throw error;
        }
    }

    static async getByCompany({
        companyId,
        serialNumber,
        status,
        priority,
        startDate,
        endDate,
        technicianId,
        page = 1,
        limit = 20,
        sortBy = 'entry_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;

            let query = database.supabase
                .from('service_histories')
                .select('*, users!service_histories_technician_id_fkey (name)', { count: 'exact' })
                .eq('company_id', companyId);

            if (serialNumber) query = query.ilike('serial_number', `%${serialNumber}%`);
            if (status) query = query.eq('status', status);
            if (priority) query = query.eq('priority', priority);
            if (startDate) query = query.gte('entry_date', startDate);
            if (endDate) query = query.lte('entry_date', endDate);
            if (technicianId) query = query.eq('technician_id', technicianId);

            const validSortFields = ['entry_date', 'expected_delivery_date', 'status', 'priority', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'entry_date';
            const ascending = sortOrder.toUpperCase() !== 'DESC';

            query = query.order(sortField, { ascending }).range(offset, offset + limit - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            const services = (data || []).map(service => ({
                ...service,
                technician_name: service.users?.name
            }));

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            return {
                services,
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
            logger.error('Error getting service histories by company:', error);
            throw error;
        }
    }

    static async update(serviceId, companyId, updates) {
        try {
            const allowedFields = [
                'serial_number', 'product_name', 'customer_name', 'customer_email',
                'customer_phone', 'entry_date', 'expected_delivery_date', 'status',
                'priority', 'reason', 'diagnosis', 'solution', 'observations',
                'internal_notes', 'estimated_cost', 'actual_cost', 'photos',
                'technician_id', 'completed_date', 'delivery_date'
            ];

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
                .from('service_histories')
                .update(updateData)
                .eq('id', serviceId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Service history not found');

            logger.business('service_history_updated', 'service', serviceId, {
                companyId,
                updates
            });

            return data;
        } catch (error) {
            logger.error('Error updating service history:', error);
            throw error;
        }
    }

    static async delete(serviceId, companyId) {
        try {
            const { error } = await database.supabase
                .from('service_histories')
                .delete()
                .eq('id', serviceId)
                .eq('company_id', companyId);

            if (error) throw error;

            logger.business('service_history_deleted', 'service', serviceId, { companyId });
            return true;
        } catch (error) {
            logger.error('Error deleting service history:', error);
            throw error;
        }
    }

    static async getStatistics(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('service_histories')
                .select('status, priority, estimated_cost, actual_cost')
                .eq('company_id', companyId);

            if (error) throw error;

            const totalServices = data.length;
            const statusCounts = {};
            const priorityCounts = {};
            let totalEstimated = 0;
            let totalActual = 0;

            data.forEach(service => {
                const status = service.status || 'unknown';
                const priority = service.priority || 'normal';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
                priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
                totalEstimated += service.estimated_cost || 0;
                totalActual += service.actual_cost || 0;
            });

            return {
                total_services: totalServices,
                status_breakdown: statusCounts,
                priority_breakdown: priorityCounts,
                total_estimated_cost: totalEstimated,
                total_actual_cost: totalActual
            };
        } catch (error) {
            logger.error('Error getting service history statistics:', error);
            throw error;
        }
    }

    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const { data, error } = await database.supabase
                .from('service_histories')
                .select('*, users!service_histories_technician_id_fkey (name)')
                .eq('company_id', companyId)
                .ilike('serial_number', `%${serialNumber}%`)
                .order('entry_date', { ascending: false });

            if (error) throw error;

            return (data || []).map(service => ({
                ...service,
                technician_name: service.users?.name
            }));
        } catch (error) {
            logger.error('Error finding service histories by serial number:', error);
            throw error;
        }
    }
}

export default ServiceHistoryModel;
