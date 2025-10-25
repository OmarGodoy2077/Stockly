import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Warranty model - Handles warranty-related database operations
 */
class WarrantyModel {

    /**
     * Create a new warranty (usually called automatically when creating a sale)
     * @param {Object} warrantyData - Warranty data
     * @returns {Promise<Object>} Created warranty
     */
    static async create({
        saleId,
        companyId,
        serialNumber,
        productName,
        customerName,
        customerEmail,
        customerPhone,
        warrantyMonths,
        startDate,
        expiresAt
    }) {
        try {
            const { data, error } = await database.supabase
                .from('warranties')
                .insert([{
                    sale_id: saleId,
                    company_id: companyId,
                    serial_number: serialNumber,
                    product_name: productName,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    warranty_months: warrantyMonths,
                    start_date: startDate,
                    expires_at: expiresAt
                }])
                .select()
                .single();

            if (error) throw error;

            logger.business('warranty_created', 'warranty', data.id, {
                companyId,
                saleId,
                serialNumber,
                expiresAt
            });

            return data;
        } catch (error) {
            logger.error('Error creating warranty:', error);
            throw error;
        }
    }

    /**
     * Find warranty by ID
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Warranty data or null
     */
    static async findById(warrantyId, companyId) {
        try {
            const { data: warranty, error } = await database.supabase
                .from('warranties')
                .select('*, sales(*)')
                .eq('id', warrantyId)
                .eq('company_id', companyId)
                .single();

            if (error || !warranty) return null;

            // Calculate days remaining and status using correct date format
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const expiresAtDate = warranty.expires_at; // Already YYYY-MM-DD format
            
            // Convert to Date objects at midnight for accurate day calculation
            const expiresAt = new Date(expiresAtDate + 'T00:00:00Z');
            const today = new Date(todayDate + 'T00:00:00Z');
            const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));

            let warrantyStatus = 'active';
            if (expiresAt < today) {
                warrantyStatus = 'expired';
            } else if (daysRemaining <= 30) {
                warrantyStatus = 'expiring_soon';
            }

            // Parse sale_products from the JSONB products field
            const saleProducts = warranty.sales?.products 
                ? (Array.isArray(warranty.sales.products) ? warranty.sales.products : JSON.parse(warranty.sales.products || '[]'))
                : [];

            return {
                ...warranty,
                sale_total: warranty.sales?.total_amount,
                sale_date: warranty.sales?.sale_date,
                sale_products: saleProducts,
                days_remaining: daysRemaining,
                warranty_status: warrantyStatus
            };
        } catch (error) {
            logger.error('Error finding warranty by ID:', error);
            throw error;
        }
    }

    /**
     * Get warranties by company with pagination and filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Warranties with pagination info
     */
    static async getByCompany({
        companyId,
        status = 'all', // all, active, expired, expiring_soon
        serialNumber,
        customerName,
        page = 1,
        limit = 20,
        sortBy = 'expires_at',
        sortOrder = 'ASC'
    }) {
        try {
            const offset = (page - 1) * limit;
            // Use DATE format for comparison since expires_at is a DATE column, not TIMESTAMP
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const thirtyDaysLaterDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            logger.debug(`🔍 Warranty Query - Company: ${companyId}, Status: ${status}, Today: ${todayDate}`);

            // Build base query
            let query = database.supabase
                .from('warranties')
                .select('*, sales(*)', { count: 'exact' })
                .eq('company_id', companyId);

            // Apply status filter - compare dates correctly
            if (status === 'active') {
                // Active: expiration date >= today AND is_active = true
                query = query.gte('expires_at', todayDate).eq('is_active', true);
            } else if (status === 'expired') {
                // Expired: expiration date < today
                query = query.lt('expires_at', todayDate);
            } else if (status === 'expiring_soon') {
                // Expiring soon: expiration date >= today AND expiration date <= today + 30 days AND is_active = true
                query = query.gte('expires_at', todayDate)
                    .lte('expires_at', thirtyDaysLaterDate)
                    .eq('is_active', true);
            }

            // Apply search filters
            if (serialNumber) {
                query = query.ilike('serial_number', `%${serialNumber}%`);
            }

            if (customerName) {
                query = query.ilike('customer_name', `%${customerName}%`);
            }

            // Apply sorting
            const validSortFields = ['expires_at', 'start_date', 'customer_name', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'expires_at';
            const ascending = sortOrder.toUpperCase() !== 'DESC';
            
            query = query.order(sortField, { ascending });

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            const { data: warranties, error, count } = await query;

            if (error) throw error;

            // Get service counts for each warranty and format products
            const warrantiesWithStats = await Promise.all(
                (warranties || []).map(async (warranty) => {
                    const { count: serviceCount } = await database.supabase
                        .from('service_histories')
                        .select('*', { count: 'exact', head: true })
                        .eq('warranty_id', warranty.id);

                    // Parse date correctly: expires_at is a DATE string (YYYY-MM-DD)
                    // Calculate days remaining using date strings for accurate comparison
                    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                    const expiresAtDate = warranty.expires_at; // Already YYYY-MM-DD format
                    
                    // Convert to Date objects at midnight for accurate day calculation
                    const expiresAt = new Date(expiresAtDate + 'T00:00:00Z');
                    const today = new Date(todayDate + 'T00:00:00Z');
                    const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));

                    let warrantyStatus = 'active';
                    if (expiresAt < today) {
                        warrantyStatus = 'expired';
                    } else if (daysRemaining <= 30) {
                        warrantyStatus = 'expiring_soon';
                    }

                    // Parse sale_products from the JSONB products field
                    const saleProducts = warranty.sales?.products 
                        ? (Array.isArray(warranty.sales.products) ? warranty.sales.products : JSON.parse(warranty.sales.products || '[]'))
                        : [];

                    return {
                        ...warranty,
                        sale_total: warranty.sales?.total_amount,
                        sale_date: warranty.sales?.sale_date,
                        sale_products: saleProducts,
                        days_remaining: daysRemaining,
                        warranty_status: warrantyStatus,
                        service_count: serviceCount || 0
                    };
                })
            );

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            logger.debug(`✅ Warranty Query Result - Total: ${total}, Returned: ${warrantiesWithStats.length}, Pages: ${totalPages}`);

            return {
                warranties: warrantiesWithStats,
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
            logger.error('❌ Error getting warranties by company:', error);
            throw error;
        }
    }

    /**
     * Find warranty by serial number
     * @param {string} companyId - Company ID
     * @param {string} serialNumber - Serial number
     * @returns {Promise<Object|null>} Warranty or null
     */
    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const { data: warranties, error } = await database.supabase
                .from('warranties')
                .select('*, sales(*)')
                .eq('company_id', companyId)
                .eq('serial_number', serialNumber)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !warranties || warranties.length === 0) return null;

            const warranty = warranties[0];
            
            // Calculate days remaining and status using correct date format
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const expiresAtDate = warranty.expires_at; // Already YYYY-MM-DD format
            
            // Convert to Date objects at midnight for accurate day calculation
            const expiresAt = new Date(expiresAtDate + 'T00:00:00Z');
            const today = new Date(todayDate + 'T00:00:00Z');
            const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));

            let warrantyStatus = 'active';
            if (expiresAt < today) {
                warrantyStatus = 'expired';
            } else if (daysRemaining <= 30) {
                warrantyStatus = 'expiring_soon';
            }

            // Parse sale_products from the JSONB products field
            const saleProducts = warranty.sales?.products 
                ? (Array.isArray(warranty.sales.products) ? warranty.sales.products : JSON.parse(warranty.sales.products || '[]'))
                : [];

            return {
                ...warranty,
                sale_total: warranty.sales?.total_amount,
                sale_date: warranty.sales?.sale_date,
                sale_products: saleProducts,
                days_remaining: daysRemaining,
                warranty_status: warrantyStatus
            };
        } catch (error) {
            logger.error('Error finding warranty by serial number:', error);
            throw error;
        }
    }

    /**
     * Update warranty
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated warranty
     */
    static async update(warrantyId, companyId, updates) {
        try {
            const allowedFields = [
                'customer_name', 'customer_email', 'customer_phone',
                'is_active', 'warranty_months', 'expires_at'
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
                .from('warranties')
                .update(updateData)
                .eq('id', warrantyId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Warranty not found');

            logger.business('warranty_updated', 'warranty', warrantyId, {
                companyId,
                updates
            });

            return data;
        } catch (error) {
            logger.error('Error updating warranty:', error);
            throw error;
        }
    }

    /**
     * Deactivate warranty
     * @param {string} warrantyId - Warranty ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async deactivate(warrantyId, companyId) {
        try {
            const { error } = await database.supabase
                .from('warranties')
                .update({ is_active: false })
                .eq('id', warrantyId)
                .eq('company_id', companyId);

            if (error) throw error;

            logger.business('warranty_deactivated', 'warranty', warrantyId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deactivating warranty:', error);
            throw error;
        }
    }

    /**
     * Get expiring warranties (for alerts)
     * @param {string} companyId - Company ID
     * @param {number} daysThreshold - Days threshold (default 30)
     * @returns {Promise<Array>} Expiring warranties
     */
    static async getExpiring(companyId, daysThreshold = 30) {
        try {
            // Use DATE format for comparison
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const thresholdDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data, error } = await database.supabase
                .from('warranties')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('expires_at', todayDate)
                .lte('expires_at', thresholdDate)
                .order('expires_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(warranty => {
                // Parse date correctly using DATE format
                const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const expiresAtDate = warranty.expires_at; // Already YYYY-MM-DD format
                
                // Convert to Date objects at midnight for accurate day calculation
                const expiresAt = new Date(expiresAtDate + 'T00:00:00Z');
                const today = new Date(todayDate + 'T00:00:00Z');
                const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));
                
                return {
                    ...warranty,
                    days_remaining: daysRemaining
                };
            });
        } catch (error) {
            logger.error('Error getting expiring warranties:', error);
            throw error;
        }
    }

    /**
     * Get warranty statistics for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(companyId) {
        try {
            // Use DATE format for comparison
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const thirtyDaysLaterDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Get all warranties for the company
            const { data: warranties, error } = await database.supabase
                .from('warranties')
                .select('*')
                .eq('company_id', companyId);

            if (error) throw error;

            const total = warranties ? warranties.length : 0;
            const active = warranties ? warranties.filter(w => 
                w.expires_at >= todayDate && w.is_active
            ).length : 0;
            const expired = warranties ? warranties.filter(w => 
                w.expires_at < todayDate
            ).length : 0;
            const expiringSoon = warranties ? warranties.filter(w => 
                w.expires_at >= todayDate &&
                w.expires_at <= thirtyDaysLaterDate &&
                w.is_active
            ).length : 0;

            return {
                total,
                active,
                expired,
                expiring_soon: expiringSoon
            };
        } catch (error) {
            logger.error('Error getting warranty statistics:', error);
            throw error;
        }
    }
}

export default WarrantyModel;
