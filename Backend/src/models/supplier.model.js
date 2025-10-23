import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Supplier model - Handles supplier-related database operations
 */
class SupplierModel {

    /**
     * Create a new supplier
     * @param {Object} supplierData - Supplier data
     * @returns {Promise<Object>} Created supplier
     */
    static async create({
        companyId,
        name,
        contactPerson = null,
        email = null,
        phone = null,
        address = null,
        ruc = null
    }) {
        try {
            const { data, error } = await database.supabase
                .from('suppliers')
                .insert([{
                    company_id: companyId,
                    name,
                    contact_person: contactPerson,
                    email,
                    phone,
                    address,
                    ruc
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Supplier name already exists in this company');
                }
                throw error;
            }

            logger.business('supplier_created', 'supplier', data.id, {
                companyId,
                name
            });

            return data;
        } catch (error) {
            logger.error('Error creating supplier:', error);
            throw error;
        }
    }

    /**
     * Find supplier by ID
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Supplier data or null
     */
    static async findById(supplierId, companyId) {
        try {
            // Get supplier basic info
            const { data: supplier, error: supplierError } = await database.supabase
                .from('suppliers')
                .select('*')
                .eq('id', supplierId)
                .eq('company_id', companyId)
                .single();

            if (supplierError || !supplier) {
                return null;
            }

            // Get purchase stats
            const { data: purchases, error: purchaseError } = await database.supabase
                .from('purchases')
                .select('total_amount')
                .eq('supplier_id', supplierId);

            if (!purchaseError && purchases) {
                supplier.purchase_count = purchases.length;
                supplier.total_purchased = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
            } else {
                supplier.purchase_count = 0;
                supplier.total_purchased = 0;
            }

            return supplier;
        } catch (error) {
            logger.error('Error finding supplier by ID:', error);
            throw error;
        }
    }

    /**
     * Get all suppliers for a company with pagination
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Suppliers with pagination
     */
    static async getByCompany({
        companyId,
        search = null,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'ASC'
    }) {
        try {
            const offset = (page - 1) * limit;

            // Build query
            let query = database.supabase
                .from('suppliers')
                .select('*', { count: 'exact' })
                .eq('company_id', companyId)
                .eq('is_active', true);

            // Add search filter
            if (search) {
                query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%`);
            }

            // Add sorting
            const validSortFields = ['name', 'contact_person', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
            const ascending = sortOrder.toUpperCase() !== 'DESC';
            
            query = query.order(sortField, { ascending });

            // Add pagination
            query = query.range(offset, offset + limit - 1);

            const { data: suppliers, error, count } = await query;

            if (error) throw error;

            // Get purchase stats for each supplier (in parallel)
            const suppliersWithStats = await Promise.all(
                (suppliers || []).map(async (supplier) => {
                    const { data: purchases } = await database.supabase
                        .from('purchases')
                        .select('total_amount')
                        .eq('supplier_id', supplier.id);

                    return {
                        ...supplier,
                        purchase_count: purchases ? purchases.length : 0,
                        total_purchased: purchases ? purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0) : 0
                    };
                })
            );

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            return {
                suppliers: suppliersWithStats,
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
            logger.error('Error getting suppliers by company:', error);
            throw error;
        }
    }

    /**
     * Update supplier
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated supplier
     */
    static async update(supplierId, companyId, updates) {
        try {
            const allowedFields = [
                'name', 'contact_person', 'email', 'phone', 'address', 'ruc'
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

            updateData.updated_at = new Date().toISOString();

            const { data, error } = await database.supabase
                .from('suppliers')
                .update(updateData)
                .eq('id', supplierId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Supplier not found');

            logger.business('supplier_updated', 'supplier', supplierId, {
                companyId,
                updates
            });

            return data;
        } catch (error) {
            logger.error('Error updating supplier:', error);
            throw error;
        }
    }

    /**
     * Delete supplier (soft delete)
     * @param {string} supplierId - Supplier ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(supplierId, companyId) {
        try {
            const { error } = await database.supabase
                .from('suppliers')
                .update({ 
                    is_active: false, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', supplierId)
                .eq('company_id', companyId);

            if (error) throw error;

            logger.business('supplier_deleted', 'supplier', supplierId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting supplier:', error);
            throw error;
        }
    }

    /**
     * Get top suppliers by purchase amount
     * @param {string} companyId - Company ID
     * @param {number} limit - Number of suppliers to return
     * @returns {Promise<Array>} Top suppliers
     */
    static async getTopSuppliers(companyId, limit = 10) {
        try {
            // Get all suppliers for the company
            const { data: suppliers, error: supplierError } = await database.supabase
                .from('suppliers')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (supplierError) throw supplierError;

            // Get purchase stats for each supplier
            const suppliersWithStats = await Promise.all(
                (suppliers || []).map(async (supplier) => {
                    const { data: purchases } = await database.supabase
                        .from('purchases')
                        .select('total_amount')
                        .eq('supplier_id', supplier.id);

                    const purchase_count = purchases ? purchases.length : 0;
                    const total_purchased = purchases ? purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0) : 0;

                    return {
                        ...supplier,
                        purchase_count,
                        total_purchased
                    };
                })
            );

            // Filter suppliers with purchases and sort by total
            return suppliersWithStats
                .filter(s => s.purchase_count > 0)
                .sort((a, b) => b.total_purchased - a.total_purchased)
                .slice(0, limit);
        } catch (error) {
            logger.error('Error getting top suppliers:', error);
            throw error;
        }
    }
}

export default SupplierModel;
