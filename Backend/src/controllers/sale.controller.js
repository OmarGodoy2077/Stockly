import SaleModel from '../models/sale.model.js';
import ProductModel from '../models/product.model.js';
import OCRService from '../services/ocr.service.js';
import CloudinaryStorageService from '../services/cloudinaryStorage.service.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';
import pkg from 'jspdf';
const { jsPDF } = pkg;
import autoTable from 'jspdf-autotable';

/**
 * Sale controller - Handles sales-related HTTP requests
 */
class SaleController {

    /**
     * Get all sales with pagination and filters
     * GET /api/v1/sales
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                start_date,
                end_date,
                customer_name,
                serial_number,
                payment_method,
                sort_by = 'sale_date',
                sort_order = 'DESC'
            } = req.query;

            const filters = {
                companyId: req.companyId,
                startDate: start_date,
                endDate: end_date,
                customerName: customer_name,
                serialNumber: serial_number,
                paymentMethod: payment_method,
                userId: req.user.id, // Only show user's own sales unless admin
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: sort_by,
                sortOrder: sort_order
            };

            const result = await SaleModel.getByCompany(filters);

            logger.business('sales_listed', 'sale', req.user.id, {
                companyId: req.companyId,
                filters,
                count: result.sales.length
            });

            ResponseHandler.paginated(res, result.sales, result.pagination);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.getAll');
        }
    }

    /**
     * Get sale by ID
     * GET /api/v1/sales/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const sale = await SaleModel.findById(id, req.companyId);

            if (!sale) {
                return ResponseHandler.notFound(res, 'Sale');
            }

            logger.business('sale_viewed', 'sale', req.user.id, {
                saleId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, sale);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.getById');
        }
    }

    /**
     * Create new sale with OCR serial number extraction
     * POST /api/v1/sales
     */
    static async create(req, res) {
        try {
            const {
                customer_name,
                customer_email,
                customer_phone,
                customer_address,
                items,
                products,
                payment_method,
                sales_platform = 'direct',
                notes,
                warranty_months = 12,
                serial_image, // Base64 image for OCR
                serial_number // Direct serial number (fallback)
            } = req.body;

            // Support both 'items' and 'products' field names for backward compatibility
            const productsArray = items || products;

            // Validate required fields
            if (!customer_name || !productsArray || !Array.isArray(productsArray) || productsArray.length === 0) {
                return ResponseHandler.error(res, 'Customer name and products are required', 400);
            }

            // Calculate totals
            let subtotal = 0;
            let totalDiscounts = 0;
            const processedProducts = [];

            for (const product of productsArray) {
                if (!product.product_id || !product.quantity || !product.unit_price) {
                    return ResponseHandler.error(res, 'Invalid product data', 400);
                }

                const quantity = parseInt(product.quantity);
                const unitPrice = parseFloat(product.unit_price);
                const discount = parseFloat(product.discount || 0);

                if (quantity <= 0 || unitPrice <= 0) {
                    return ResponseHandler.error(res, 'Invalid quantity or price', 400);
                }

                const lineTotal = quantity * unitPrice;
                subtotal += lineTotal;
                totalDiscounts += discount;

                processedProducts.push({
                    product_id: product.product_id,
                    quantity,
                    unit_price: unitPrice,
                    discount: discount
                });
            }

            // Calculate totals (without taxes)
            // Formula: Total = Subtotal - Discounts
            const discountAmount = totalDiscounts;
            const totalAmount = subtotal - discountAmount;
            const taxAmount = 0;

            let extractedSerialNumber = serial_number || null;
            let serialImageUrl = null;

            // Process serial number image with OCR if provided
            if (serial_image) {
                try {
                    // Convert base64 to buffer
                    const imageBuffer = Buffer.from(serial_image, 'base64');

                    // Validate image
                    const validation = await CloudinaryStorageService.validateImageFile(imageBuffer, 'serial.jpg');
                    if (!validation.valid) {
                        logger.warn('Serial image validation failed:', {
                            error: validation.error,
                            customer: customer_name
                        });
                        // Don't fail the request, just log the warning
                    } else {
                        // Upload image to Cloudinary
                        const uploadResult = await CloudinaryStorageService.uploadSerialImage(
                            imageBuffer,
                            `serial_${Date.now()}.jpg`,
                            { companyId: req.companyId, uploadedBy: req.user.id }
                        );

                        serialImageUrl = uploadResult.publicUrl;

                        // Extract serial number using OCR
                        const ocrResult = await OCRService.extractSerialNumber(imageBuffer);

                        logger.business('ocr_attempt', 'ocr', req.user.id, {
                            saleCustomer: customer_name,
                            ocrSuccess: ocrResult.success,
                            confidence: ocrResult.confidence,
                            serialNumber: ocrResult.serialNumber,
                            candidates: ocrResult.candidates?.length || 0
                        });

                        if (ocrResult.success && ocrResult.serialNumber) {
                            extractedSerialNumber = ocrResult.serialNumber;

                            logger.business('serial_extracted_from_sale', 'ocr', req.user.id, {
                                saleCustomer: customer_name,
                                serialNumber: extractedSerialNumber,
                                confidence: ocrResult.confidence
                            });
                        } else {
                            logger.warn('OCR failed to extract serial number:', {
                                customer: customer_name,
                                error: ocrResult.error,
                                candidates: ocrResult.candidates || []
                            });
                            
                            // If OCR failed and no manual serial_number provided, log candidates for debugging
                            if (!extractedSerialNumber && ocrResult.candidates && ocrResult.candidates.length > 0) {
                                logger.warn('OCR candidates available:', {
                                    customer: customer_name,
                                    candidates: ocrResult.candidates.map(c => ({
                                        value: c.value,
                                        confidence: c.confidence
                                    }))
                                });
                            }
                        }
                    }

                } catch (error) {
                    logger.error('Error processing serial image:', error);
                    // Continue with sale creation even if OCR fails
                    // Use manual serial_number if provided
                }
            }

            // Create sale record
            const saleData = {
                companyId: req.companyId,
                userId: req.user.id,
                customerName: customer_name,
                customerEmail: customer_email,
                customerPhone: customer_phone,
                customerAddress: customer_address,
                products: processedProducts,
                subtotal,
                taxAmount,
                discountAmount,
                totalAmount,
                serialNumber: extractedSerialNumber,
                serialImageUrl,
                warrantyMonths: warranty_months,
                paymentMethod: payment_method,
                salesPlatform: sales_platform,
                notes
            };

            const sale = await SaleModel.create(saleData);

            // Update product stock
            try {
                for (const product of processedProducts) {
                    await ProductModel.updateStock(
                        product.product_id,
                        req.companyId,
                        product.quantity,
                        'subtract'
                    );
                }
            } catch (stockError) {
                logger.error('Error updating product stock:', stockError);
                // Sale was created but stock update failed
                // In production, you might want to implement compensation logic
            }

            logger.business('sale_created', 'sale', req.user.id, {
                saleId: sale.id,
                companyId: req.companyId,
                customerName: customer_name,
                totalAmount,
                serialNumber: extractedSerialNumber,
                productCount: processedProducts.length
            });

            ResponseHandler.success(res, {
                id: sale.id,
                customer_name: sale.customer_name,
                total_amount: sale.total_amount,
                serial_number: sale.serial_number,
                products: sale.products,
                created_at: sale.created_at
            }, 'Sale created successfully', 201);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.create');
        }
    }

    /**
     * Update sale
     * PUT /api/v1/sales/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;

            const updates = {};

            // Only allow certain fields to be updated
            const allowedFields = [
                'customer_name', 'customer_email', 'customer_phone', 'customer_address',
                'payment_method', 'notes'
            ];

            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            });

            const sale = await SaleModel.update(id, req.companyId, updates);

            logger.business('sale_updated', 'sale', req.user.id, {
                saleId: id,
                companyId: req.companyId,
                updatedFields: Object.keys(updates)
            });

            ResponseHandler.success(res, sale, 'Sale updated successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.update');
        }
    }

    /**
     * Delete sale
     * DELETE /api/v1/sales/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await SaleModel.delete(id, req.companyId);

            logger.business('sale_deleted', 'sale', req.user.id, {
                saleId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, null, 'Sale deleted successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.delete');
        }
    }

    /**
     * Get sales statistics
     * GET /api/v1/sales/statistics
     */
    static async getStatistics(req, res) {
        try {
            const { period = 'month' } = req.query;

            const dateRange = DateUtils.getDateRange(period);
            const stats = await SaleModel.getStatistics(req.companyId, dateRange);

            logger.business('sales_statistics_viewed', 'sale', req.user.id, {
                companyId: req.companyId,
                period
            });

            ResponseHandler.success(res, {
                period,
                date_range: dateRange,
                total_sales: parseInt(stats.total_sales) || 0,
                total_revenue: parseFloat(stats.total_revenue) || 0,
                average_sale: parseFloat(stats.average_sale) || 0,
                unique_sellers: parseInt(stats.unique_sellers) || 0,
                unique_customers: parseInt(stats.unique_customers) || 0,
                total_discounts: parseFloat(stats.total_discounts) || 0,
                sales_with_serial: parseInt(stats.sales_with_serial) || 0,
                sales_with_warranty: parseInt(stats.sales_with_warranty) || 0
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.getStatistics');
        }
    }

    /**
     * Get top selling products
     * GET /api/v1/sales/top-products
     */
    static async getTopProducts(req, res) {
        try {
            const { limit = 10, period = 'month' } = req.query;

            const dateRange = DateUtils.getDateRange(period);
            const topProducts = await SaleModel.getTopSellingProducts(
                req.companyId,
                parseInt(limit),
                dateRange
            );

            logger.business('top_products_viewed', 'sale', req.user.id, {
                companyId: req.companyId,
                limit: parseInt(limit),
                period
            });

            ResponseHandler.success(res, {
                period,
                date_range: dateRange,
                products: topProducts
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.getTopProducts');
        }
    }

    /**
     * Get sales performance by seller
     * GET /api/v1/sales/by-seller
     */
    static async getSalesBySeller(req, res) {
        try {
            const { period = 'month' } = req.query;

            const dateRange = DateUtils.getDateRange(period);
            const salesBySeller = await SaleModel.getSalesBySeller(req.companyId, dateRange);

            logger.business('sales_by_seller_viewed', 'sale', req.user.id, {
                companyId: req.companyId,
                period
            });

            ResponseHandler.success(res, {
                period,
                date_range: dateRange,
                sellers: salesBySeller
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.getSalesBySeller');
        }
    }

    /**
     * Search sale by serial number
     * GET /api/v1/sales/search/serial/:serialNumber
     */
    static async searchBySerialNumber(req, res) {
        try {
            const { serialNumber } = req.params;

            if (!serialNumber || serialNumber.trim().length === 0) {
                return ResponseHandler.error(res, 'Serial number is required', 400);
            }

            const sale = await SaleModel.findBySerialNumber(req.companyId, serialNumber.trim());

            if (!sale) {
                return ResponseHandler.notFound(res, 'Sale');
            }

            logger.business('sale_searched_by_serial', 'sale', req.user.id, {
                companyId: req.companyId,
                serialNumber: serialNumber,
                saleId: sale.id
            });

            ResponseHandler.success(res, sale);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.searchBySerialNumber');
        }
    }

    /**
     * Generate receipt PDF for a sale
     * GET /api/v1/sales/:id/receipt-pdf
     */
    static async generateReceiptPdf(req, res) {
        try {
            const { id } = req.params;

            const sale = await SaleModel.findById(id, req.companyId);
            if (!sale) {
                return ResponseHandler.notFound(res, 'Sale');
            }

            // Validate and enrich products
            if (!sale.products || !Array.isArray(sale.products) || sale.products.length === 0) {
                return ResponseHandler.error(res, 'Sale has no products. Cannot generate receipt.', 400);
            }

            // Enrich products with product names
            const enrichedProducts = [];
            for (const product of sale.products) {
                if (!product.product_id || product.quantity === undefined || product.unit_price === undefined) {
                    logger.warn('Invalid product data in sale:', {
                        saleId: id,
                        product
                    });
                    return ResponseHandler.error(res, 'Invalid product data in sale', 400);
                }

                try {
                    const productDetails = await ProductModel.findById(product.product_id, req.companyId);
                    enrichedProducts.push({
                        ...product,
                        product_name: productDetails?.name || product.product_name || 'Producto sin nombre'
                    });
                } catch (error) {
                    logger.warn('Could not fetch product details:', {
                        productId: product.product_id,
                        error: error.message
                    });
                    // Continue with available data
                    enrichedProducts.push({
                        ...product,
                        product_name: product.product_name || 'Producto'
                    });
                }
            }

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });

            const margin = 15;
            const pageWidth = pdf.internal.pageSize.getWidth();
            let yPosition = margin;

            // Title
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text('RECIBO DE VENTA', margin, yPosition);
            yPosition += 15;

            // Sale info
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Número: ${sale.id.substring(0, 8).toUpperCase()}`, margin, yPosition);
            yPosition += 6;
            pdf.text(`Fecha: ${new Date(sale.created_at).toLocaleDateString('es-ES')}`, margin, yPosition);
            yPosition += 10;

            // Customer info
            pdf.setFont(undefined, 'bold');
            pdf.text('CLIENTE:', margin, yPosition);
            yPosition += 6;
            pdf.setFont(undefined, 'normal');
            pdf.text(sale.customer_name, margin + 5, yPosition);
            yPosition += 5;
            if (sale.customer_email) {
                pdf.text(`Email: ${sale.customer_email}`, margin + 5, yPosition);
                yPosition += 5;
            }
            if (sale.customer_phone) {
                pdf.text(`Teléfono: ${sale.customer_phone}`, margin + 5, yPosition);
                yPosition += 5;
            }
            yPosition += 5;

            // Items table
            const tableData = [];
            const columns = ['Producto', 'Cantidad', 'Precio Unit.', 'Descuento', 'Total'];

            for (const product of enrichedProducts) {
                const quantity = product.quantity || 0;
                const unitPrice = product.unit_price || 0;
                const discount = product.discount || 0;
                const lineTotal = (quantity * unitPrice) - discount;

                tableData.push([
                    `${product.product_name}`,
                    quantity.toString(),
                    `$${unitPrice.toFixed(2)}`,
                    `$${discount.toFixed(2)}`,
                    `$${lineTotal.toFixed(2)}`
                ]);
            }

            autoTable(pdf, {
                head: [columns],
                body: tableData,
                startY: yPosition,
                margin: { left: margin, right: margin },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    textColor: 50
                },
                alternateRowStyles: {
                    fillColor: [242, 242, 242]
                }
            });

            yPosition = pdf.lastAutoTable.finalY + 10;

            // Totals section
            const totalsX = pageWidth - margin - 50;
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);

            pdf.text('Subtotal:', totalsX, yPosition);
            pdf.text(`$${(sale.subtotal || 0).toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 6;

            if (sale.discount_amount && sale.discount_amount > 0) {
                pdf.text('Descuento:', totalsX, yPosition);
                pdf.text(`-$${sale.discount_amount.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 6;
            }

            // Total
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(12);
            pdf.text('TOTAL:', totalsX, yPosition);
            pdf.text(`$${(sale.total_amount || 0).toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 10;

            // Payment method
            if (sale.payment_method) {
                pdf.setFont(undefined, 'normal');
                pdf.setFontSize(10);
                pdf.text(`Método de Pago: ${sale.payment_method}`, margin, yPosition);
                yPosition += 8;
            }

            // Notes
            if (sale.notes) {
                pdf.setFont(undefined, 'bold');
                pdf.text('Notas:', margin, yPosition);
                yPosition += 5;
                pdf.setFont(undefined, 'normal');
                const noteLines = pdf.splitTextToSize(sale.notes, pageWidth - 2 * margin);
                pdf.text(noteLines, margin, yPosition);
                yPosition += noteLines.length * 4;
            }

            // Footer
            pdf.setFont(undefined, 'italic');
            pdf.setFontSize(8);
            pdf.text('Gracias por su compra', margin, pageWidth - 10, { align: 'center' });

            // Return PDF as buffer (not blob for Node.js)
            const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

            // Check if this is a preview request
            const isPreview = req.query.preview === 'true';

            res.setHeader('Content-Type', 'application/pdf');
            if (isPreview) {
                res.setHeader('Content-Disposition', `inline; filename="Receipt-${sale.customer_name}-${new Date().toISOString().split('T')[0]}.pdf"`);
            } else {
                res.setHeader('Content-Disposition', `attachment; filename="Receipt-${sale.customer_name}-${new Date().toISOString().split('T')[0]}.pdf"`);
            }

            res.send(pdfBuffer);

            logger.business('receipt_downloaded', 'sale', req.user.id, {
                saleId: id,
                companyId: req.companyId
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.generateReceiptPdf');
        }
    }

    /**
     * Generate receipt (for API compatibility)
     * POST /api/v1/sales/:id/receipt
     */
    static async generateReceipt(req, res) {
        try {
            const { id } = req.params;

            const sale = await SaleModel.findById(id, req.companyId);
            if (!sale) {
                return ResponseHandler.notFound(res, 'Sale');
            }

            // For now, just return success
            // In a real implementation, you might want to store the PDF URL
            ResponseHandler.success(res, {
                pdf_url: `/sales/${id}/receipt-pdf?preview=true`,
                message: 'Receipt generated successfully'
            });

            logger.business('receipt_generated', 'sale', req.user.id, {
                saleId: id,
                companyId: req.companyId
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.generateReceipt');
        }
    }

    /**
     * Extract serial number from image using OCR
     * POST /api/v1/sales/ocr
     */
    static async extractSerialNumberOCR(req, res) {
        try {
            // Check if file was uploaded
            if (!req.file) {
                return ResponseHandler.error(res, 'No image file provided', 400);
            }

            const imageBuffer = req.file.buffer;

            // Validate image
            const validation = await CloudinaryStorageService.validateImageFile(
                imageBuffer,
                req.file.originalname
            );

            if (!validation.valid) {
                return ResponseHandler.error(res, validation.error, 400);
            }

            // Extract serial number using OCR
            const ocrResult = await OCRService.extractSerialNumber(imageBuffer);

            if (!ocrResult.success) {
                return ResponseHandler.error(res, ocrResult.error || 'Failed to extract serial number', 400);
            }

            logger.business('ocr_serial_extracted', 'ocr', req.user.id, {
                companyId: req.companyId,
                serialNumber: ocrResult.serialNumber,
                confidence: ocrResult.confidence
            });

            ResponseHandler.success(res, {
                serial_number: ocrResult.serialNumber,
                confidence: ocrResult.confidence,
                candidates: ocrResult.candidates || [],
                ocr_text: ocrResult.ocrText
            });

        } catch (error) {
            ResponseHandler.handleError(res, error, 'SaleController.extractSerialNumberOCR');
        }
    }
}

export default SaleController;