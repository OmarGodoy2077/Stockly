import { database } from '../config/database.js';
import { logger } from '../config/logger.js';
import DateUtils from '../utils/dateUtils.js';

/**
 * Invoice model - Handles invoice-related database operations
 */
class InvoiceModel {

    /**
     * Generate next invoice number for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} { invoice_number, sequence_number, invoice_year }
     */
    static async generateInvoiceNumber(companyId) {
        try {
            const { data, error } = await database.supabase
                .rpc('generate_invoice_number', { 
                    company_id: companyId 
                });

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('Failed to generate invoice number');
            }

            return data[0];
        } catch (error) {
            logger.error('Error generating invoice number:', error);
            throw error;
        }
    }

    /**
     * Create a new invoice from a sale
     * @param {Object} invoiceData - Invoice data
     * @returns {Promise<Object>} Created invoice
     */
    static async create(invoiceData) {
        try {
            const {
                companyId,
                saleId,
                invoiceNumber,
                invoiceYear,
                invoiceSequence,
                customerName,
                customerEmail,
                customerPhone,
                customerAddress,
                customerIdType,
                customerIdNumber,
                companyName,
                companyAddress,
                companyPhone,
                companyEmail,
                companyRtc,
                companyLogoUrl,
                subtotal,
                taxAmount,
                taxPercentage,
                additionalItemsTotal,
                discountAmount,
                totalAmount,
                paymentMethod,
                paymentStatus,
                termsConditions,
                notes,
                createdBy,
                isDraft = true
            } = invoiceData;

            const { data, error } = await database.supabase
                .from('invoices')
                .insert({
                    company_id: companyId,
                    sale_id: saleId,
                    invoice_number: invoiceNumber,
                    invoice_year: invoiceYear,
                    invoice_sequence: invoiceSequence,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    customer_address: customerAddress,
                    customer_id_type: customerIdType,
                    customer_id_number: customerIdNumber,
                    company_name: companyName,
                    company_address: companyAddress,
                    company_phone: companyPhone,
                    company_email: companyEmail,
                    company_rtc: companyRtc,
                    company_logo_url: companyLogoUrl,
                    subtotal,
                    tax_amount: taxAmount,
                    tax_percentage: taxPercentage,
                    additional_items_total: additionalItemsTotal,
                    discount_amount: discountAmount,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    payment_status: paymentStatus,
                    terms_conditions: termsConditions,
                    notes,
                    is_draft: isDraft,
                    created_by: createdBy
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            logger.business('invoice_created', 'invoice', createdBy, {
                invoiceId: data.id,
                invoiceNumber,
                companyId,
                saleId,
                totalAmount
            });

            return data;
        } catch (error) {
            logger.error('Error creating invoice:', error);
            throw error;
        }
    }

    /**
     * Add line item to invoice
     * @param {Object} lineItemData - Line item data
     * @returns {Promise<Object>} Created line item
     */
    static async addLineItem(lineItemData) {
        try {
            const {
                invoiceId,
                companyId,
                itemType,
                itemName,
                itemDescription,
                productId,
                quantity,
                unitPrice,
                isTaxable,
                lineOrder
            } = lineItemData;

            const { data, error } = await database.supabase
                .from('invoice_line_items')
                .insert({
                    invoice_id: invoiceId,
                    company_id: companyId,
                    item_type: itemType,
                    item_name: itemName,
                    item_description: itemDescription,
                    product_id: productId,
                    quantity,
                    unit_price: unitPrice,
                    is_taxable: isTaxable,
                    line_order: lineOrder
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error adding line item:', error);
            throw error;
        }
    }

    /**
     * Find invoice by ID
     * @param {string} invoiceId - Invoice ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Invoice data or null
     */
    static async findById(invoiceId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('invoices')
                .select(`
                    *,
                    created_by_user:created_by (
                        id,
                        name,
                        email
                    )
                `)
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found
                    return null;
                }
                throw error;
            }

            // Map the response to match old format
            if (data && data.created_by_user) {
                data.creator_name = data.created_by_user.name;
                data.creator_email = data.created_by_user.email;
            }

            return data;
        } catch (error) {
            logger.error('Error finding invoice:', error);
            throw error;
        }
    }

    /**
     * Get invoices by company with filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} { invoices, pagination }
     */
    static async getByCompany(filters) {
        try {
            const {
                companyId,
                page = 1,
                limit = 20,
                startDate,
                endDate,
                invoiceNumber,
                paymentStatus,
                isDraft = null,
                sortBy = 'invoice_date',
                sortOrder = 'DESC'
            } = filters;

            let query = database.supabase
                .from('invoices')
                .select('id, invoice_number, invoice_date, customer_name, customer_email, total_amount, payment_status, is_draft, is_cancelled, created_at', { count: 'exact' })
                .eq('company_id', companyId)
                .eq('is_cancelled', false);

            if (startDate) {
                query = query.gte('invoice_date', startDate);
            }

            if (endDate) {
                query = query.lte('invoice_date', endDate);
            }

            if (invoiceNumber) {
                query = query.ilike('invoice_number', `%${invoiceNumber}%`);
            }

            if (paymentStatus) {
                query = query.eq('payment_status', paymentStatus);
            }

            if (isDraft !== null) {
                query = query.eq('is_draft', isDraft);
            }

            const offset = (page - 1) * limit;
            query = query
                .order(sortBy, { ascending: sortOrder === 'ASC' })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) {
                logger.error('Supabase error getting invoices by company:', error);
                throw error;
            }

            return {
                invoices: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting invoices by company:', error);
            throw error;
        }
    }

    /**
     * Get line items for an invoice
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Array>} Line items
     */
    static async getLineItems(invoiceId) {
        try {
            const { data, error } = await database.supabase
                .from('invoice_line_items')
                .select(`
                    *,
                    products(sku, name)
                `)
                .eq('invoice_id', invoiceId)
                .order('line_order', { ascending: true });

            if (error) {
                throw error;
            }

            return (data || []).map(item => ({
                ...item,
                sku: item.products?.sku,
                product_name: item.products?.name
            }));
        } catch (error) {
            logger.error('Error getting line items:', error);
            throw error;
        }
    }

    /**
     * Update invoice
     * @param {string} invoiceId - Invoice ID
     * @param {string} companyId - Company ID (for security)
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated invoice
     */
    static async update(invoiceId, companyId, updates) {
        try {
            // Only allow draft invoices to be updated - check first
            const { data: invoiceData, error: checkError } = await database.supabase
                .from('invoices')
                .select('is_draft')
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .single();

            if (checkError) {
                throw new Error('Invoice not found');
            }

            if (!invoiceData.is_draft) {
                throw new Error('Cannot update finalized invoices');
            }

            const allowedFields = [
                'payment_method', 'payment_status', 'terms_conditions',
                'notes', 'tax_percentage'
            ];

            // Build update object with only allowed fields
            const updateObj = {};
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateObj[field] = updates[field];
                }
            }

            if (Object.keys(updateObj).length === 0) {
                throw new Error('No valid fields to update');
            }

            const { data, error } = await database.supabase
                .from('invoices')
                .update(updateObj)
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            logger.business('invoice_updated', 'invoice', null, {
                invoiceId,
                companyId,
                updatedFields: Object.keys(updateObj)
            });

            return data;
        } catch (error) {
            logger.error('Error updating invoice:', error);
            throw error;
        }
    }

    /**
     * Update PDF URL in invoice
     * @param {string} invoiceId - Invoice ID
     * @param {string} pdfUrl - PDF URL
     * @returns {Promise<Object>} Updated invoice
     */
    static async updatePdfUrl(invoiceId, pdfUrl) {
        try {
            const { data, error } = await database.supabase
                .from('invoices')
                .update({
                    pdf_url: pdfUrl,
                    pdf_generated_at: new Date().toISOString()
                })
                .eq('id', invoiceId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error updating PDF URL:', error);
            throw error;
        }
    }

    /**
     * Finalize invoice (mark as not draft)
     * @param {string} invoiceId - Invoice ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Finalized invoice
     */
    static async finalize(invoiceId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('invoices')
                .update({ is_draft: false })
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .eq('is_draft', true)
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Invoice not found or already finalized');
            }

            logger.business('invoice_finalized', 'invoice', null, {
                invoiceId,
                companyId
            });

            return data;
        } catch (error) {
            logger.error('Error finalizing invoice:', error);
            throw error;
        }
    }

    /**
     * Cancel invoice
     * @param {string} invoiceId - Invoice ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Cancelled invoice
     */
    static async cancel(invoiceId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('invoices')
                .update({ is_cancelled: true })
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Invoice not found');
            }

            logger.business('invoice_cancelled', 'invoice', null, {
                invoiceId,
                companyId
            });

            return data;
        } catch (error) {
            logger.error('Error cancelling invoice:', error);
            throw error;
        }
    }

    /**
     * Delete line item from invoice
     * @param {string} lineItemId - Line item ID
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<void>}
     */
    static async deleteLineItem(lineItemId, invoiceId) {
        try {
            const { data, error } = await database.supabase
                .from('invoice_line_items')
                .delete()
                .eq('id', lineItemId)
                .eq('invoice_id', invoiceId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Line item not found');
            }
        } catch (error) {
            logger.error('Error deleting line item:', error);
            throw error;
        }
    }

    /**
     * Get invoice statistics for a company
     * @param {string} companyId - Company ID
     * @param {string} startDate - Start date (optional)
     * @param {string} endDate - End date (optional)
     * @returns {Promise<Object>} Invoice statistics
     */
    static async getStatistics(companyId, startDate, endDate) {
        try {
            let query = database.supabase
                .from('invoices')
                .select('*', { count: 'exact' })
                .eq('company_id', companyId)
                .eq('is_cancelled', false);

            if (startDate && endDate) {
                query = query
                    .gte('invoice_date', startDate)
                    .lte('invoice_date', endDate);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            // Calculate statistics from the data
            const invoices = data || [];
            const stats = {
                total_invoices: invoices.length,
                draft_count: invoices.filter(i => i.is_draft).length,
                paid_count: invoices.filter(i => i.payment_status === 'paid').length,
                pending_count: invoices.filter(i => i.payment_status === 'pending').length,
                total_revenue: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
                avg_invoice_amount: 0
            };

            if (stats.total_invoices > 0) {
                stats.avg_invoice_amount = stats.total_revenue / stats.total_invoices;
            }

            return stats;
        } catch (error) {
            logger.error('Error getting invoice statistics:', error);
            throw error;
        }
    }
}

export default InvoiceModel;
