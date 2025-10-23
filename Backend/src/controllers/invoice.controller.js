import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvoiceModel from '../models/invoice.model.js';
import SaleModel from '../models/sale.model.js';
import CloudinaryStorageService from '../services/cloudinaryStorage.service.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Invoice controller - Handles invoice generation, PDF creation, and management
 */
class InvoiceController {

    /**
     * Create invoice from sale
     * POST /api/v1/invoices
     */
    static async create(req, res) {
        try {
            const {
                sale_id,
                additional_items = [],
                payment_method,
                payment_status = 'pending',
                terms_conditions,
                notes,
                company_data = {}
            } = req.body;

            // Validate sale exists and belongs to company
            if (!sale_id) {
                return ResponseHandler.error(res, 'Sale ID is required', 400);
            }

            const sale = await SaleModel.findById(sale_id, req.companyId);
            if (!sale) {
                return ResponseHandler.notFound(res, 'Sale');
            }

            // Generate invoice number
            const numberData = await InvoiceModel.generateInvoiceNumber(req.companyId);

            // Get company info from context (you might want to store this in companies table)
            // For now, we use defaults from request
            const companyInfo = {
                name: company_data.name || 'Mi Empresa',
                address: company_data.address || '',
                phone: company_data.phone || '',
                email: company_data.email || '',
                rtc: company_data.rtc || '',
                logo_url: company_data.logo_url || null
            };

            // Calculate totals including additional items
            let additionalItemsTotal = 0;
            const processedAdditionalItems = [];
            let lineOrder = 1;

            if (Array.isArray(additional_items) && additional_items.length > 0) {
                for (const item of additional_items) {
                    if (!item.item_name || !item.unit_price || item.unit_price === undefined) {
                        return ResponseHandler.error(res, 'Additional items must have name and price', 400);
                    }

                    const quantity = parseFloat(item.quantity || 1);
                    const unitPrice = parseFloat(item.unit_price);
                    const itemTotal = quantity * unitPrice;

                    additionalItemsTotal += itemTotal;

                    processedAdditionalItems.push({
                        item_type: item.item_type || 'other',
                        item_name: item.item_name,
                        item_description: item.item_description,
                        quantity,
                        unit_price: unitPrice,
                        is_taxable: item.is_taxable || false,
                        line_order: lineOrder++,
                        line_total: itemTotal
                    });
                }
            }

            // Calculate invoice totals (without taxes)
            const subtotal = sale.subtotal + additionalItemsTotal;
            const discountAmount = sale.discount_amount || 0;
            const taxAmount = 0; // No taxes
            const taxPercentage = 0;
            const totalAmount = subtotal - discountAmount;

            // Create invoice
            const invoiceData = {
                companyId: req.companyId,
                saleId: sale_id,
                invoiceNumber: numberData.invoice_number,
                invoiceYear: numberData.invoice_year,
                invoiceSequence: numberData.sequence_number,
                customerName: sale.customer_name,
                customerEmail: sale.customer_email,
                customerPhone: sale.customer_phone,
                customerAddress: sale.customer_address,
                customerIdType: sale.customer_id_type,
                customerIdNumber: sale.customer_id_number,
                companyName: companyInfo.name,
                companyAddress: companyInfo.address,
                companyPhone: companyInfo.phone,
                companyEmail: companyInfo.email,
                companyRtc: companyInfo.rtc,
                companyLogoUrl: companyInfo.logo_url,
                subtotal,
                taxAmount,
                taxPercentage,
                additionalItemsTotal,
                discountAmount,
                totalAmount,
                paymentMethod: payment_method,
                paymentStatus,
                termsConditions: terms_conditions,
                notes,
                createdBy: req.user.id,
                isDraft: true // Create as draft first
            };

            const invoice = await InvoiceModel.create(invoiceData);

            // Add original sale products as line items
            if (sale.products && Array.isArray(sale.products)) {
                for (let i = 0; i < sale.products.length; i++) {
                    const product = sale.products[i];
                    await InvoiceModel.addLineItem({
                        invoiceId: invoice.id,
                        companyId: req.companyId,
                        itemType: 'product',
                        itemName: product.product_name || `Producto ${i + 1}`,
                        itemDescription: null,
                        productId: product.product_id,
                        quantity: product.quantity,
                        unitPrice: product.unit_price,
                        isTaxable: true,
                        lineOrder: i + 1
                    });
                }
            }

            // Add additional items
            if (processedAdditionalItems.length > 0) {
                for (const item of processedAdditionalItems) {
                    await InvoiceModel.addLineItem({
                        invoiceId: invoice.id,
                        companyId: req.companyId,
                        ...item
                    });
                }
            }

            logger.business('invoice_created', 'invoice', req.user.id, {
                invoiceId: invoice.id,
                invoiceNumber: numberData.invoice_number,
                saleId: sale_id,
                totalAmount
            });

            ResponseHandler.success(res, {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                customer_name: invoice.customer_name,
                total_amount: invoice.total_amount,
                is_draft: invoice.is_draft,
                payment_status: invoice.payment_status
            }, 'Invoice created successfully', 201);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.create');
        }
    }

    /**
     * Get all invoices
     * GET /api/v1/invoices
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                start_date,
                end_date,
                invoice_number,
                payment_status,
                is_draft,
                sort_by = 'invoice_date',
                sort_order = 'DESC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                page: parseInt(page),
                limit: parseInt(limit),
                startDate: start_date,
                endDate: end_date,
                invoiceNumber: invoice_number,
                paymentStatus: payment_status,
                isDraft: is_draft === 'true' ? true : (is_draft === 'false' ? false : null),
                sortBy: sort_by === 'date' ? 'invoice_date' : sort_by,
                sortOrder: sort_order
            };

            const result = await InvoiceModel.getByCompany(filters);

            logger.business('invoices_listed', 'invoice', req.user.id, {
                companyId: req.companyId,
                count: result.invoices.length
            });

            ResponseHandler.paginated(res, result.invoices, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.getAll');
        }
    }

    /**
     * Get invoice by ID with details
     * GET /api/v1/invoices/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const invoice = await InvoiceModel.findById(id, req.companyId);

            if (!invoice) {
                return ResponseHandler.notFound(res, 'Invoice');
            }

            const lineItems = await InvoiceModel.getLineItems(id);

            logger.business('invoice_viewed', 'invoice', req.user.id, {
                invoiceId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, {
                ...invoice,
                line_items: lineItems
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.getById');
        }
    }

    /**
     * Add line item to invoice
     * POST /api/v1/invoices/:id/line-items
     */
    static async addLineItem(req, res) {
        try {
            const { id: invoiceId } = req.params;
            const {
                item_type,
                item_name,
                item_description,
                product_id,
                quantity = 1,
                unit_price,
                is_taxable = false
            } = req.body;

            // Validate invoice exists and is draft
            const invoice = await InvoiceModel.findById(invoiceId, req.companyId);
            if (!invoice) {
                return ResponseHandler.notFound(res, 'Invoice');
            }

            if (!invoice.is_draft) {
                return ResponseHandler.error(res, 'Cannot add items to finalized invoices', 400);
            }

            // Validate required fields
            if (!item_type || !item_name || unit_price === undefined) {
                return ResponseHandler.error(res, 'Item type, name, and price are required', 400);
            }

            // Get next line order
            const lineItems = await InvoiceModel.getLineItems(invoiceId);
            const nextLineOrder = lineItems.length + 1;

            const lineItem = await InvoiceModel.addLineItem({
                invoiceId,
                companyId: req.companyId,
                itemType: item_type,
                itemName: item_name,
                itemDescription: item_description,
                productId: product_id,
                quantity: parseFloat(quantity),
                unitPrice: parseFloat(unit_price),
                isTaxable: is_taxable,
                lineOrder: nextLineOrder
            });

            logger.business('invoice_line_item_added', 'invoice', req.user.id, {
                invoiceId,
                itemType: item_type,
                itemName: item_name
            });

            ResponseHandler.success(res, lineItem, 'Line item added successfully', 201);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.addLineItem');
        }
    }

    /**
     * Delete line item from invoice
     * DELETE /api/v1/invoices/:id/line-items/:itemId
     */
    static async deleteLineItem(req, res) {
        try {
            const { id: invoiceId, itemId } = req.params;

            // Verify invoice is draft
            const invoice = await InvoiceModel.findById(invoiceId, req.companyId);
            if (!invoice) {
                return ResponseHandler.notFound(res, 'Invoice');
            }

            if (!invoice.is_draft) {
                return ResponseHandler.error(res, 'Cannot modify finalized invoices', 400);
            }

            await InvoiceModel.deleteLineItem(itemId, invoiceId);

            logger.business('invoice_line_item_deleted', 'invoice', req.user.id, {
                invoiceId,
                itemId
            });

            ResponseHandler.success(res, null, 'Line item deleted successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.deleteLineItem');
        }
    }

    /**
     * Generate PDF for invoice
     * POST /api/v1/invoices/:id/generate-pdf
     */
    static async generatePdf(req, res) {
        try {
            const { id: invoiceId } = req.params;

            // Get invoice with details
            const invoice = await InvoiceModel.findById(invoiceId, req.companyId);
            if (!invoice) {
                return ResponseHandler.notFound(res, 'Invoice');
            }

            const lineItems = await InvoiceModel.getLineItems(invoiceId);

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;

            let yPosition = margin;

            // Header with company info
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(invoice.company_name || 'Invoice', margin, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            if (invoice.company_address) {
                pdf.text(`Address: ${invoice.company_address}`, margin, yPosition);
                yPosition += 6;
            }
            if (invoice.company_phone) {
                pdf.text(`Phone: ${invoice.company_phone}`, margin, yPosition);
                yPosition += 6;
            }
            if (invoice.company_email) {
                pdf.text(`Email: ${invoice.company_email}`, margin, yPosition);
                yPosition += 6;
            }
            if (invoice.company_rtc) {
                pdf.text(`RTC: ${invoice.company_rtc}`, margin, yPosition);
                yPosition += 6;
            }

            yPosition += 5;

            // Invoice title and details
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text('INVOICE / RECIBO', margin, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const rightColumn = pageWidth - margin - 50;

            // Invoice number and date
            pdf.text(`Invoice #: ${invoice.invoice_number}`, margin, yPosition);
            pdf.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, rightColumn, yPosition);
            yPosition += 6;

            // Customer info section
            yPosition += 4;
            pdf.setFont(undefined, 'bold');
            pdf.text('Customer:', margin, yPosition);
            yPosition += 6;

            pdf.setFont(undefined, 'normal');
            pdf.text(`Name: ${invoice.customer_name}`, margin, yPosition);
            yPosition += 5;
            if (invoice.customer_email) {
                pdf.text(`Email: ${invoice.customer_email}`, margin, yPosition);
                yPosition += 5;
            }
            if (invoice.customer_phone) {
                pdf.text(`Phone: ${invoice.customer_phone}`, margin, yPosition);
                yPosition += 5;
            }
            if (invoice.customer_address) {
                pdf.text(`Address: ${invoice.customer_address}`, margin, yPosition);
                yPosition += 5;
            }

            yPosition += 5;

            // Items table
            const tableData = lineItems.map((item, idx) => [
                item.line_order,
                item.item_name,
                item.item_description || '',
                item.quantity.toFixed(2),
                `$${item.unit_price.toFixed(2)}`,
                `$${item.line_total.toFixed(2)}`
            ]);

            autoTable(pdf, {
                head: [['#', 'Item', 'Description', 'Qty', 'Unit Price', 'Total']],
                body: tableData,
                startY: yPosition,
                margin: margin,
                columnStyles: {
                    0: { halign: 'center' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right' }
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                }
            });

            yPosition = pdf.lastAutoTable.finalY + 10;

            // Totals section
            const totalsX = pageWidth - margin - 50;
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);

            pdf.text('Subtotal:', totalsX, yPosition);
            pdf.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 6;

            if (invoice.additional_items_total > 0) {
                pdf.text('Additional Items:', totalsX, yPosition);
                pdf.text(`$${invoice.additional_items_total.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 6;
            }

            if (invoice.tax_amount > 0) {
                pdf.text(`Tax (${invoice.tax_percentage}%):`, totalsX, yPosition);
                pdf.text(`$${invoice.tax_amount.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 6;
            }

            if (invoice.discount_amount > 0) {
                pdf.text('Discount:', totalsX, yPosition);
                pdf.text(`-$${invoice.discount_amount.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 6;
            }

            // Total
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(12);
            pdf.text('TOTAL:', totalsX, yPosition);
            pdf.text(`$${invoice.total_amount.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 8;

            // Payment method
            if (invoice.payment_method) {
                pdf.setFont(undefined, 'normal');
                pdf.setFontSize(10);
                pdf.text(`Payment Method: ${invoice.payment_method}`, margin, yPosition);
                yPosition += 6;
            }

            // Terms and notes
            if (invoice.terms_conditions) {
                pdf.setFont(undefined, 'bold');
                pdf.text('Terms & Conditions:', margin, yPosition);
                yPosition += 5;
                pdf.setFont(undefined, 'normal');
                const splitText = pdf.splitTextToSize(invoice.terms_conditions, pageWidth - 2 * margin);
                pdf.text(splitText, margin, yPosition);
                yPosition += splitText.length * 4;
            }

            if (invoice.notes) {
                pdf.setFont(undefined, 'bold');
                pdf.text('Notes:', margin, yPosition);
                yPosition += 5;
                pdf.setFont(undefined, 'normal');
                const splitText = pdf.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
                pdf.text(splitText, margin, yPosition);
            }

            // Convert PDF to buffer
            const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

            // Upload to Cloudinary
            const fileName = `invoice_${invoice.invoice_number.replace(/-/g, '_')}_${Date.now()}.pdf`;
            const uploadResult = await CloudinaryStorageService.uploadInvoicePdf(
                pdfBuffer,
                fileName,
                {
                    companyId: req.companyId,
                    invoiceId,
                    invoiceNumber: invoice.invoice_number
                }
            );

            // Update invoice with PDF URL
            await InvoiceModel.updatePdfUrl(invoiceId, uploadResult.publicUrl);

            logger.business('invoice_pdf_generated', 'invoice', req.user.id, {
                invoiceId,
                invoiceNumber: invoice.invoice_number,
                pdfUrl: uploadResult.publicUrl
            });

            ResponseHandler.success(res, {
                invoice_id: invoiceId,
                invoice_number: invoice.invoice_number,
                pdf_url: uploadResult.publicUrl,
                message: 'PDF generated successfully'
            }, 'PDF generated and stored successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.generatePdf');
        }
    }

    /**
     * Download PDF invoice
     * GET /api/v1/invoices/:id/download-pdf
     */
    static async downloadPdf(req, res) {
        try {
            const { id: invoiceId } = req.params;

            const invoice = await InvoiceModel.findById(invoiceId, req.companyId);
            if (!invoice) {
                return ResponseHandler.notFound(res, 'Invoice');
            }

            if (!invoice.pdf_url) {
                return ResponseHandler.error(res, 'PDF has not been generated yet', 400);
            }

            // Redirect to PDF URL
            res.redirect(invoice.pdf_url);

            logger.business('invoice_pdf_downloaded', 'invoice', req.user.id, {
                invoiceId,
                invoiceNumber: invoice.invoice_number
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.downloadPdf');
        }
    }

    /**
     * Finalize invoice (mark as not draft)
     * PATCH /api/v1/invoices/:id/finalize
     */
    static async finalize(req, res) {
        try {
            const { id: invoiceId } = req.params;

            const invoice = await InvoiceModel.finalize(invoiceId, req.companyId);

            logger.business('invoice_finalized', 'invoice', req.user.id, {
                invoiceId,
                invoiceNumber: invoice.invoice_number
            });

            ResponseHandler.success(res, {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                is_draft: invoice.is_draft,
                finalized_at: new Date()
            }, 'Invoice finalized successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.finalize');
        }
    }

    /**
     * Update invoice details
     * PUT /api/v1/invoices/:id
     */
    static async update(req, res) {
        try {
            const { id: invoiceId } = req.params;
            const { payment_method, payment_status, terms_conditions, notes } = req.body;

            const updates = {};
            if (payment_method) updates.payment_method = payment_method;
            if (payment_status) updates.payment_status = payment_status;
            if (terms_conditions) updates.terms_conditions = terms_conditions;
            if (notes) updates.notes = notes;

            const invoice = await InvoiceModel.update(invoiceId, req.companyId, updates);

            logger.business('invoice_updated', 'invoice', req.user.id, {
                invoiceId,
                updatedFields: Object.keys(updates)
            });

            ResponseHandler.success(res, invoice, 'Invoice updated successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.update');
        }
    }

    /**
     * Get invoice statistics
     * GET /api/v1/invoices/statistics
     */
    static async getStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;

            const stats = await InvoiceModel.getStatistics(
                req.companyId,
                start_date,
                end_date
            );

            ResponseHandler.success(res, stats);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'InvoiceController.getStatistics');
        }
    }
}

export default InvoiceController;
