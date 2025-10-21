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
            const query = `
                SELECT * FROM generate_invoice_number($1)
            `;

            const result = await database.query(query, [companyId]);

            if (result.rows.length === 0) {
                throw new Error('Failed to generate invoice number');
            }

            return result.rows[0];
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

            const query = `
                INSERT INTO invoices (
                    company_id, sale_id, invoice_number, invoice_year, invoice_sequence,
                    customer_name, customer_email, customer_phone, customer_address,
                    customer_id_type, customer_id_number,
                    company_name, company_address, company_phone, company_email,
                    company_rtc, company_logo_url,
                    subtotal, tax_amount, tax_percentage, additional_items_total,
                    discount_amount, total_amount,
                    payment_method, payment_status,
                    terms_conditions, notes,
                    is_draft, created_by
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9,
                    $10, $11,
                    $12, $13, $14, $15,
                    $16, $17,
                    $18, $19, $20, $21,
                    $22, $23,
                    $24, $25,
                    $26, $27,
                    $28, $29
                )
                RETURNING *
            `;

            const result = await database.query(query, [
                companyId, saleId, invoiceNumber, invoiceYear, invoiceSequence,
                customerName, customerEmail, customerPhone, customerAddress,
                customerIdType, customerIdNumber,
                companyName, companyAddress, companyPhone, companyEmail,
                companyRtc, companyLogoUrl,
                subtotal, taxAmount, taxPercentage, additionalItemsTotal,
                discountAmount, totalAmount,
                paymentMethod, paymentStatus,
                termsConditions, notes,
                isDraft, createdBy
            ]);

            logger.business('invoice_created', 'invoice', createdBy, {
                invoiceId: result.rows[0].id,
                invoiceNumber,
                companyId,
                saleId,
                totalAmount
            });

            return result.rows[0];
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

            const query = `
                INSERT INTO invoice_line_items (
                    invoice_id, company_id, item_type, item_name, item_description,
                    product_id, quantity, unit_price, is_taxable, line_order
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const result = await database.query(query, [
                invoiceId, companyId, itemType, itemName, itemDescription,
                productId, quantity, unitPrice, isTaxable, lineOrder
            ]);

            return result.rows[0];
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
            const query = `
                SELECT
                    i.*,
                    u.name as creator_name,
                    u.email as creator_email,
                    s.id as sale_id
                FROM invoices i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN sales s ON i.sale_id = s.id
                WHERE i.id = $1 AND i.company_id = $2
            `;

            const result = await database.query(query, [invoiceId, companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
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

            let query = `
                SELECT
                    i.id,
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_name,
                    i.customer_email,
                    i.total_amount,
                    i.payment_status,
                    i.is_draft,
                    i.is_cancelled,
                    i.created_at,
                    COUNT(*) OVER() as total_count
                FROM invoices i
                WHERE i.company_id = $1 AND i.is_cancelled = false
            `;

            const params = [companyId];
            let paramCount = 1;

            if (startDate) {
                paramCount++;
                query += ` AND i.invoice_date >= $${paramCount}`;
                params.push(startDate);
            }

            if (endDate) {
                paramCount++;
                query += ` AND i.invoice_date <= $${paramCount}`;
                params.push(endDate);
            }

            if (invoiceNumber) {
                paramCount++;
                query += ` AND i.invoice_number ILIKE $${paramCount}`;
                params.push(`%${invoiceNumber}%`);
            }

            if (paymentStatus) {
                paramCount++;
                query += ` AND i.payment_status = $${paramCount}`;
                params.push(paymentStatus);
            }

            if (isDraft !== null) {
                paramCount++;
                query += ` AND i.is_draft = $${paramCount}`;
                params.push(isDraft);
            }

            query += ` ORDER BY i.${sortBy} ${sortOrder}`;

            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(limit, offset);

            const result = await database.query(query, params);

            const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return {
                invoices: result.rows.map(row => {
                    const { total_count, ...invoice } = row;
                    return invoice;
                }),
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
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
            const query = `
                SELECT
                    ili.*,
                    p.sku,
                    p.name as product_name
                FROM invoice_line_items ili
                LEFT JOIN products p ON ili.product_id = p.id
                WHERE ili.invoice_id = $1
                ORDER BY ili.line_order ASC
            `;

            const result = await database.query(query, [invoiceId]);
            return result.rows;
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
            // Only allow draft invoices to be updated
            const invoiceQuery = `
                SELECT is_draft FROM invoices
                WHERE id = $1 AND company_id = $2
            `;

            const invoiceResult = await database.query(invoiceQuery, [invoiceId, companyId]);

            if (invoiceResult.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            if (!invoiceResult.rows[0].is_draft) {
                throw new Error('Cannot update finalized invoices');
            }

            const allowedFields = [
                'payment_method', 'payment_status', 'terms_conditions',
                'notes', 'tax_percentage'
            ];

            let query = 'UPDATE invoices SET ';
            const params = [invoiceId, companyId];
            let paramCount = 2;

            const updateParts = [];
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    paramCount++;
                    updateParts.push(`${field} = $${paramCount}`);
                    params.push(updates[field]);
                }
            }

            if (updateParts.length === 0) {
                throw new Error('No valid fields to update');
            }

            query += updateParts.join(', ');
            query += ` WHERE id = $1 AND company_id = $2 RETURNING *`;

            const result = await database.query(query, params);

            logger.business('invoice_updated', 'invoice', null, {
                invoiceId,
                companyId,
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
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
            const query = `
                UPDATE invoices
                SET pdf_url = $1, pdf_generated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;

            const result = await database.query(query, [pdfUrl, invoiceId]);
            return result.rows[0];
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
            const query = `
                UPDATE invoices
                SET is_draft = false
                WHERE id = $1 AND company_id = $2 AND is_draft = true
                RETURNING *
            `;

            const result = await database.query(query, [invoiceId, companyId]);

            if (result.rows.length === 0) {
                throw new Error('Invoice not found or already finalized');
            }

            logger.business('invoice_finalized', 'invoice', null, {
                invoiceId,
                companyId
            });

            return result.rows[0];
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
            const query = `
                UPDATE invoices
                SET is_cancelled = true
                WHERE id = $1 AND company_id = $2
                RETURNING *
            `;

            const result = await database.query(query, [invoiceId, companyId]);

            if (result.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            logger.business('invoice_cancelled', 'invoice', null, {
                invoiceId,
                companyId
            });

            return result.rows[0];
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
            const query = `
                DELETE FROM invoice_line_items
                WHERE id = $1 AND invoice_id = $2
                RETURNING id
            `;

            const result = await database.query(query, [lineItemId, invoiceId]);

            if (result.rows.length === 0) {
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
            let query = `
                SELECT
                    COUNT(*) as total_invoices,
                    SUM(CASE WHEN is_draft = true THEN 1 ELSE 0 END) as draft_count,
                    SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                    SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_invoice_amount
                FROM invoices
                WHERE company_id = $1 AND is_cancelled = false
            `;

            const params = [companyId];

            if (startDate && endDate) {
                query += ` AND invoice_date BETWEEN $2 AND $3`;
                params.push(startDate, endDate);
            }

            const result = await database.query(query, params);
            return result.rows[0] || {};
        } catch (error) {
            logger.error('Error getting invoice statistics:', error);
            throw error;
        }
    }
}

export default InvoiceModel;
