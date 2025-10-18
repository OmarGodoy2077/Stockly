import SaleModel from '../models/sale.model.js';
import ProductModel from '../models/product.model.js';
import OCRService from '../services/ocr.service.js';
import CloudinaryStorageService from '../services/cloudinaryStorage.service.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

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
                startDate,
                endDate,
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
                products,
                payment_method,
                notes,
                warranty_months = 12,
                serial_image // Base64 image for OCR
            } = req.body;

            // Validate required fields
            if (!customer_name || !products || !Array.isArray(products) || products.length === 0) {
                return ResponseHandler.error(res, 'Customer name and products are required', 400);
            }

            // Calculate totals
            let subtotal = 0;
            const processedProducts = [];

            for (const product of products) {
                if (!product.product_id || !product.quantity || !product.unit_price) {
                    return ResponseHandler.error(res, 'Invalid product data', 400);
                }

                const quantity = parseInt(product.quantity);
                const unitPrice = parseFloat(product.unit_price);

                if (quantity <= 0 || unitPrice <= 0) {
                    return ResponseHandler.error(res, 'Invalid quantity or price', 400);
                }

                subtotal += quantity * unitPrice;

                processedProducts.push({
                    product_id: product.product_id,
                    quantity,
                    unit_price: unitPrice,
                    discount: product.discount || 0
                });
            }

            // Calculate tax and discount
            const taxRate = 0.12; // 12% IVA for Guatemala
            const taxAmount = (subtotal - parseFloat(req.body.discount_amount || 0)) * taxRate;
            const discountAmount = parseFloat(req.body.discount_amount || 0);
            const totalAmount = subtotal + taxAmount - discountAmount;

            let serialNumber = null;
            let serialImageUrl = null;

            // Process serial number image with OCR if provided
            if (serial_image) {
                try {
                    // Convert base64 to buffer
                    const imageBuffer = Buffer.from(serial_image, 'base64');

                    // Validate image
                    const validation = await CloudinaryStorageService.validateImageFile(imageBuffer, 'serial.jpg');
                    if (!validation.valid) {
                        return ResponseHandler.error(res, validation.error, 400);
                    }

                    // Upload image to Cloudinary
                    const uploadResult = await CloudinaryStorageService.uploadSerialImage(
                        imageBuffer,
                        `serial_${Date.now()}.jpg`,
                        { companyId: req.companyId, uploadedBy: req.user.id }
                    );

                    serialImageUrl = uploadResult.publicUrl;

                    // Extract serial number using OCR
                    const ocrResult = await OCRService.extractSerialNumber(imageBuffer);

                    if (ocrResult.success && ocrResult.serialNumber) {
                        serialNumber = ocrResult.serialNumber;

                        logger.business('serial_extracted_from_sale', 'ocr', req.user.id, {
                            saleCustomer: customer_name,
                            serialNumber,
                            confidence: ocrResult.confidence
                        });
                    } else {
                        logger.warn('OCR failed to extract serial number:', {
                            customer: customer_name,
                            error: ocrResult.error
                        });
                    }

                } catch (error) {
                    logger.error('Error processing serial image:', error);
                    // Continue with sale creation even if OCR fails
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
                serialNumber,
                serialImageUrl,
                warrantyMonths: warranty_months,
                paymentMethod: payment_method,
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
                serialNumber,
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
}

export default SaleController;