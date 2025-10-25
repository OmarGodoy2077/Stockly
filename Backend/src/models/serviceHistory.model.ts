import pool from '../config/database.js';
import { logger } from '../config/logger.js';

// Interfaces
interface ServiceHistoryFilters {
    companyId: string;
    status?: string;
    priority?: string;
    warrantyId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

interface ServiceHistoryData {
    warranty_id?: string;
    company_id: string;
    serial_number: string;
    product_name: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    entry_date: string;
    expected_delivery_date?: string;
    status: string;
    priority?: string;
    reason: string;
    diagnosis?: string;
    solution?: string;
    observations?: string;
    internal_notes?: string;
    estimated_cost?: number;
    actual_cost?: number;
    photos?: any;
    technician_id?: string;
    created_by: string;
}

interface WarrantyInfo {
    expires_at: string | null;
    days_remaining: number | null;
    is_active: boolean | null;
}

interface ServiceHistoryWithWarranty extends ServiceHistoryData {
    id: string;
    created_at: string;
    updated_at: string;
    warranty_info: WarrantyInfo;
}

interface PaginatedResult<T> {
    services: T[];
    pagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}

class ServiceHistoryModel {
    static async getAll(filters: ServiceHistoryFilters): Promise<PaginatedResult<ServiceHistoryWithWarranty>> {
        try {
            const {
                companyId,
                status = 'all',
                priority = 'all',
                warrantyId = null,
                search = '',
                page = 1,
                limit = 20,
                sortBy = 'entry_date',
                sortOrder = 'DESC'
            } = filters;

            const supabase = pool.getClient();
            let query = supabase
                .from('service_histories')
                .select(`
                    *,
                    warranties!inner(
                        expires_at,
                        is_active
                    )
                `, { count: 'exact' })
                .eq('company_id', companyId);

            // Add status filter
            if (status !== 'all') {
                query = query.eq('status', status);
            }

            // Add priority filter
            if (priority !== 'all') {
                query = query.eq('priority', priority);
            }

            // Add warranty filter
            if (warrantyId) {
                query = query.eq('warranty_id', warrantyId);
            }

            // Add search filter
            if (search) {
                query = query.or(`serial_number.ilike.%${search}%,customer_name.ilike.%${search}%,product_name.ilike.%${search}%`);
            }

            // Add sorting
            query = query.order(sortBy, { ascending: sortOrder === 'ASC' });

            // Add pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            const { data: services, error, count } = await query;

            if (error) {
                throw error;
            }

            const totalItems = count || 0;
            const totalPages = Math.ceil(totalItems / limit);

            // Process services to add warranty info
            const processedServices = (services || []).map((service: any) => ({
                ...service,
                warranty_info: {
                    expires_at: service.warranties?.expires_at || null,
                    days_remaining: service.warranties?.expires_at
                        ? Math.max(0, Math.floor((new Date(service.warranties.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                        : null,
                    is_active: service.warranties?.is_active || false
                }
            }));

            return {
                services: processedServices,
                pagination: {
                    currentPage: page,
                    pageSize: limit,
                    totalItems,
                    totalPages
                }
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.getAll:', { error: errorMessage });
            throw error;
        }
    }    static async getById(serviceId: string, companyId: string): Promise<ServiceHistoryWithWarranty | null> {
        try {
            const supabase = pool.getClient();

            const { data: service, error } = await supabase
                .from('service_histories')
                .select(`
                    *,
                    warranties!inner(
                        expires_at,
                        is_active
                    )
                `)
                .eq('id', serviceId)
                .eq('company_id', companyId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                throw error;
            }

            return {
                ...service,
                warranty_info: {
                    expires_at: service.warranties?.expires_at || null,
                    days_remaining: service.warranties?.expires_at
                        ? Math.max(0, Math.floor((new Date(service.warranties.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                        : null,
                    is_active: service.warranties?.is_active || false
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.getById:', { error: errorMessage });
            throw error;
        }
    }

    static async create(serviceData: ServiceHistoryData): Promise<any> {
        try {
            const supabase = await pool.getClient();

            const { data, error } = await supabase
                .from('service_histories')
                .insert(serviceData)
                .select()
                .single();

            if (error) {
                logger.error('Error in ServiceHistoryModel.create:', error);
                throw error;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.create:', { error: errorMessage });
            throw error;
        }
    }

    static async update(serviceId: string, serviceData: Partial<ServiceHistoryData>): Promise<any> {
        try {
            const supabase = await pool.getClient();

            const { data, error } = await supabase
                .from('service_histories')
                .update(serviceData)
                .eq('id', serviceId)
                .select()
                .single();

            if (error) {
                logger.error('Error in ServiceHistoryModel.update:', error);
                throw error;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.update:', { error: errorMessage });
            throw error;
        }
    }

    static async updateStatus(serviceId: string, status: string): Promise<any> {
        try {
            const supabase = await pool.getClient();

            const { data, error } = await supabase
                .from('service_histories')
                .update({ status })
                .eq('id', serviceId)
                .select()
                .single();

            if (error) {
                logger.error('Error in ServiceHistoryModel.updateStatus:', error);
                throw error;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.updateStatus:', { error: errorMessage });
            throw error;
        }
    }

    static async delete(serviceId: string, companyId: string): Promise<any> {
        try {
            const supabase = await pool.getClient();

            const { data, error } = await supabase
                .from('service_histories')
                .delete()
                .eq('id', serviceId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                logger.error('Error in ServiceHistoryModel.delete:', error);
                throw error;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error in ServiceHistoryModel.delete:', { error: errorMessage });
            throw error;
        }
    }
}

export default ServiceHistoryModel;