import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Purchase model - Handles purchase-related database operations
 */
class PurchaseModel {

    /**
     * Create a new purchase
     * @param {Object} purchaseData - Purchase data
     * @returns {Promise<Object>} Created purchase
     */
    static async create({
        companyId,
        userId,
        supplierId = null,
        supplierName,
        invoiceNumber = null,
        products,
        totalAmount,
        costAmount = 0,
        sellAmount = 0,
        purchaseDate,
        notes = null
    }) {
        try {
            let profitAmount = 0;
            let profitMarginPercent = 0;
            
            if (costAmount > 0 && sellAmount > 0) {
                profitAmount = sellAmount - costAmount;
                profitMarginPercent = (profitAmount / costAmount) * 100;
            }

            const { data, error } = await database.supabase
                .from('purchases')
                .insert([{
                    company_id: companyId,
                    user_id: userId,
                    supplier_id: supplierId,
                    supplier_name: supplierName,
                    invoice_number: invoiceNumber,
                    products: products,
                    total_amount: totalAmount,
                    cost_amount: costAmount,
                    sell_amount: sellAmount,
                    profit_amount: profitAmount,
                    profit_margin_percent: profitMarginPercent,
                    purchase_date: purchaseDate,
                    notes: notes
                }])
                .select()
                .single();

            if (error) throw error;

            logger.business('purchase_created', 'purchase', data.id, {
                companyId,
                userId,
                supplierName,
                totalAmount,
                costAmount,
                sellAmount,
                profitAmount,
                productCount: products.length
            });

            return data;
        } catch (error) {
            logger.error('Error creating purchase:', error);
            throw error;
        }
    }

    static async findById(purchaseId, companyId) {
        try {
            const { data: purchase, error } = await database.supabase
                .from('purchases')
                .select('*, users!purchases_user_id_fkey (name, email), suppliers!purchases_supplier_id_fkey (name, contact_person)')
                .eq('id', purchaseId)
                .eq('company_id', companyId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!purchase) return null;

            return {
                ...purchase,
                buyer_name: purchase.users?.name,
                buyer_email: purchase.users?.email,
                supplier_full_name: purchase.suppliers?.name,
                supplier_contact: purchase.suppliers?.contact_person
            };
        } catch (error) {
            logger.error('Error finding purchase by ID:', error);
            throw error;
        }
    }

    static async getByCompany({
        companyId,
        supplierId = null,
        supplierName = null,
        startDate = null,
        endDate = null,
        page = 1,
        limit = 20,
        sortBy = 'purchase_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;

            let query = database.supabase
                .from('purchases')
                .select('*, users!purchases_user_id_fkey (name), suppliers!purchases_supplier_id_fkey (name)', { count: 'exact' })
                .eq('company_id', companyId);

            if (supplierId) query = query.eq('supplier_id', supplierId);
            if (supplierName) query = query.ilike('supplier_name', `%${supplierName}%`);
            if (startDate) query = query.gte('purchase_date', startDate);
            if (endDate) query = query.lte('purchase_date', endDate);

            const validSortFields = ['purchase_date', 'total_amount', 'supplier_name', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'purchase_date';
            const ascending = sortOrder.toUpperCase() !== 'DESC';
            
            query = query.order(sortField, { ascending }).range(offset, offset + limit - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            const purchases = (data || []).map(p => ({
                ...p,
                buyer_name: p.users?.name,
                supplier_full_name: p.suppliers?.name,
                product_count: Array.isArray(p.products) ? p.products.length : 0
            }));

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            return {
                purchases,
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
            logger.error('Error getting purchases by company:', error);
            throw error;
        }
    }

    static async update(purchaseId, companyId, updates) {
        try {
            const allowedFields = ['supplier_id', 'supplier_name', 'invoice_number', 'products', 'total_amount', 'purchase_date', 'notes'];
            const updateData = {};
            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) updateData[key] = updates[key];
            });

            if (Object.keys(updateData).length === 0) throw new Error('No valid fields to update');

            const { data, error } = await database.supabase
                .from('purchases')
                .update(updateData)
                .eq('id', purchaseId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Purchase not found');

            logger.business('purchase_updated', 'purchase', purchaseId, { companyId, updates });
            return data;
        } catch (error) {
            logger.error('Error updating purchase:', error);
            throw error;
        }
    }

    static async delete(purchaseId, companyId) {
        try {
            const { error } = await database.supabase
                .from('purchases')
                .delete()
                .eq('id', purchaseId)
                .eq('company_id', companyId);

            if (error) throw error;
            logger.business('purchase_deleted', 'purchase', purchaseId, { companyId });
            return true;
        } catch (error) {
            logger.error('Error deleting purchase:', error);
            throw error;
        }
    }

    static async getStatistics(companyId, startDate = null, endDate = null) {
        try {
            let query = database.supabase
                .from('purchases')
                .select('total_amount, supplier_id')
                .eq('company_id', companyId);

            if (startDate) query = query.gte('purchase_date', startDate);
            if (endDate) query = query.lte('purchase_date', endDate);

            const { data, error } = await query;
            if (error) throw error;

            const totalPurchases = data.length;
            const totalSpent = data.reduce((sum, p) => sum + (p.total_amount || 0), 0);
            const avgPurchase = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
            const uniqueSuppliers = new Set(data.map(p => p.supplier_id).filter(Boolean)).size;
            const amounts = data.map(p => p.total_amount || 0).filter(a => a > 0);
            const largestPurchase = amounts.length > 0 ? Math.max(...amounts) : 0;
            const smallestPurchase = amounts.length > 0 ? Math.min(...amounts) : 0;

            return {
                total_purchases: totalPurchases,
                total_spent: totalSpent,
                average_purchase: avgPurchase,
                unique_suppliers: uniqueSuppliers,
                largest_purchase: largestPurchase,
                smallest_purchase: smallestPurchase
            };
        } catch (error) {
            logger.error('Error getting purchase statistics:', error);
            throw error;
        }
    }

    static async getBySupplier(companyId, supplierId) {
        try {
            const { data, error } = await database.supabase
                .from('purchases')
                .select('*, users!purchases_user_id_fkey (name), suppliers!purchases_supplier_id_fkey (name)')
                .eq('company_id', companyId)
                .eq('supplier_id', supplierId)
                .order('purchase_date', { ascending: false });

            if (error) throw error;

            return (data || []).map(p => ({
                ...p,
                buyer_name: p.users?.name,
                supplier_full_name: p.suppliers?.name
            }));
        } catch (error) {
            logger.error('Error getting purchases by supplier:', error);
            throw error;
        }
    }
}

export default PurchaseModel;
