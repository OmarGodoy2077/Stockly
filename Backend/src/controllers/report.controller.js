import ReportService from '../services/report.service.js';
import ProductModel from '../models/product.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Report controller - Handles report generation requests
 */
class ReportController {

    /**
     * Generate inventory report
     * GET /api/v1/reports/inventory
     */
    static async generateInventoryReport(req, res) {
        try {
            const {
                format = 'excel',
                category,
                search,
                stock_status,
                include_company_info = true
            } = req.query;

            // Get products data
            const result = await ProductModel.getByCompany({
                companyId: req.companyId,
                categoryId: category,
                search,
                stockStatus: stock_status,
                limit: 10000 // Large limit for reports
            });

            if (result.products.length === 0) {
                return ResponseHandler.error(res, 'No products found for the report', 404);
            }

            // Generate report
            let buffer;
            let mimeType;
            let fileName;

            const reportOptions = {
                companyName: include_company_info ? 'Empresa Demo' : '', // In real app, get from company data
                includeTimestamp: true
            };

            switch (format.toLowerCase()) {
                case 'pdf':
                    buffer = await ReportService.generatePDF(result.products, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-inventario-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(result.products, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-inventario-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateInventoryReport(result.products, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-inventario-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('inventory_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                productCount: result.products.length
            });

            ResponseHandler.fileDownload(res, buffer, fileName, mimeType);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.generateInventoryReport');
        }
    }

    /**
     * Generate sales report
     * GET /api/v1/reports/sales
     */
    static async generateSalesReport(req, res) {
        try {
            const {
                format = 'excel',
                start_date,
                end_date,
                customer_name,
                include_company_info = true
            } = req.query;

            // Build date filter
            let dateFilter = '';
            const params = [req.companyId];

            if (start_date || end_date) {
                if (start_date) {
                    dateFilter += ` AND s.sale_date >= $${params.length + 1}`;
                    params.push(start_date);
                }
                if (end_date) {
                    dateFilter += ` AND s.sale_date <= $${params.length + 1}`;
                    params.push(end_date);
                }
            }

            // Build customer filter
            if (customer_name) {
                dateFilter += ` AND s.customer_name ILIKE $${params.length + 1}`;
                params.push(`%${customer_name}%`);
            }

            // Get sales data
            const query = `
                SELECT
                    s.*,
                    p.name as product_name,
                    p.sku
                FROM sales s
                LEFT JOIN products p ON s.products->0->>'product_id' = p.id::text
                WHERE s.company_id = $1${dateFilter}
                ORDER BY s.sale_date DESC
            `;

            const result = await database.query(query, params);

            if (result.rows.length === 0) {
                return ResponseHandler.error(res, 'No sales found for the report', 404);
            }

            // Generate report
            let buffer;
            let mimeType;
            let fileName;

            const reportOptions = {
                companyName: include_company_info ? 'Empresa Demo' : '',
                includeTimestamp: true
            };

            switch (format.toLowerCase()) {
                case 'pdf':
                    buffer = await ReportService.generatePDF(result.rows, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(result.rows, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateSalesReport(result.rows, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('sales_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                salesCount: result.rows.length
            });

            ResponseHandler.fileDownload(res, buffer, fileName, mimeType);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.generateSalesReport');
        }
    }

    /**
     * Generate warranty report
     * GET /api/v1/reports/warranties
     */
    static async generateWarrantyReport(req, res) {
        try {
            const {
                format = 'excel',
                status = 'active', // active, expired, all
                expiring_days = 30,
                include_company_info = true
            } = req.query;

            // Build status filter
            let statusFilter = '';
            const params = [];

            switch (status) {
                case 'active':
                    statusFilter = 'AND w.is_active = true AND w.expires_at > CURRENT_DATE';
                    break;
                case 'expired':
                    statusFilter = 'AND (w.is_active = false OR w.expires_at <= CURRENT_DATE)';
                    break;
                case 'expiring':
                    statusFilter = `AND w.is_active = true AND w.expires_at <= CURRENT_DATE + INTERVAL '${expiring_days} days'`;
                    break;
                // 'all' doesn't need filter
            }

            // Get warranties data
            const query = `
                SELECT
                    w.*,
                    c.name as company_name,
                    EXTRACT(DAYS FROM (w.expires_at - CURRENT_DATE)) as days_to_expiry
                FROM warranties w
                JOIN companies c ON w.company_id = c.id
                WHERE w.company_id = $1 ${statusFilter}
                ORDER BY w.expires_at ASC
            `;

            const result = await database.query(query, [req.companyId]);

            if (result.rows.length === 0) {
                return ResponseHandler.error(res, 'No warranties found for the report', 404);
            }

            // Generate report
            let buffer;
            let mimeType;
            let fileName;

            const reportOptions = {
                companyName: include_company_info ? 'Empresa Demo' : '',
                includeTimestamp: true
            };

            switch (format.toLowerCase()) {
                case 'pdf':
                    buffer = await ReportService.generatePDF(result.rows, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(result.rows, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateWarrantyReport(result.rows, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('warranty_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                warrantyCount: result.rows.length,
                status
            });

            ResponseHandler.fileDownload(res, buffer, fileName, mimeType);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.generateWarrantyReport');
        }
    }

    /**
     * Generate service history report
     * GET /api/v1/reports/services
     */
    static async generateServiceReport(req, res) {
        try {
            const {
                format = 'excel',
                start_date,
                end_date,
                status,
                technician,
                include_company_info = true
            } = req.query;

            // Build filters
            let filters = '';
            const params = [req.companyId];
            let paramCount = 2;

            if (start_date) {
                filters += ` AND sh.entry_date >= $${paramCount}`;
                params.push(start_date);
                paramCount++;
            }

            if (end_date) {
                filters += ` AND sh.entry_date <= $${paramCount}`;
                params.push(end_date);
                paramCount++;
            }

            if (status) {
                filters += ` AND sh.status = $${paramCount}`;
                params.push(status);
                paramCount++;
            }

            if (technician) {
                filters += ` AND sh.technician_id = $${paramCount}`;
                params.push(technician);
            }

            // Get service history data
            const query = `
                SELECT
                    sh.*,
                    c.name as company_name,
                    u.name as technician_name
                FROM service_histories sh
                JOIN companies c ON sh.company_id = c.id
                LEFT JOIN users u ON sh.technician_id = u.id
                WHERE sh.company_id = $1${filters}
                ORDER BY sh.entry_date DESC
            `;

            const result = await database.query(query, params);

            if (result.rows.length === 0) {
                return ResponseHandler.error(res, 'No service records found for the report', 404);
            }

            // Generate report
            let buffer;
            let mimeType;
            let fileName;

            const reportOptions = {
                companyName: include_company_info ? 'Empresa Demo' : '',
                includeTimestamp: true
            };

            switch (format.toLowerCase()) {
                case 'pdf':
                    buffer = await ReportService.generatePDF(result.rows, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(result.rows, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateServiceReport(result.rows, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('service_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                serviceCount: result.rows.length
            });

            ResponseHandler.fileDownload(res, buffer, fileName, mimeType);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.generateServiceReport');
        }
    }

    /**
     * Get available report types
     * GET /api/v1/reports/types
     */
    static async getReportTypes(req, res) {
        try {
            const reportTypes = [
                {
                    id: 'inventory',
                    name: 'Reporte de Inventario',
                    description: 'Lista completa de productos con stock y precios',
                    formats: ['excel', 'pdf', 'csv'],
                    filters: ['category', 'stock_status', 'search']
                },
                {
                    id: 'sales',
                    name: 'Reporte de Ventas',
                    description: 'Historial de ventas con clientes y productos',
                    formats: ['excel', 'pdf', 'csv'],
                    filters: ['start_date', 'end_date', 'customer_name']
                },
                {
                    id: 'warranties',
                    name: 'Reporte de Garantías',
                    description: 'Garantías activas, próximas a vencer y vencidas',
                    formats: ['excel', 'pdf', 'csv'],
                    filters: ['status', 'expiring_days']
                },
                {
                    id: 'services',
                    name: 'Reporte de Servicio Técnico',
                    description: 'Historial de reparaciones y mantenimientos',
                    formats: ['excel', 'pdf', 'csv'],
                    filters: ['start_date', 'end_date', 'status', 'technician']
                }
            ];

            ResponseHandler.success(res, reportTypes);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.getReportTypes');
        }
    }
}

export default ReportController;