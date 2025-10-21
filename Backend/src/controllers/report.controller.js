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
                },
                {
                    id: 'cost-vs-revenue',
                    name: 'Resumen Ejecutivo: Costo vs Facturación',
                    description: 'Análisis de costo de compras vs ingresos por ventas',
                    formats: ['excel', 'pdf', 'json'],
                    filters: ['start_date', 'end_date', 'category', 'include_monthly_breakdown']
                }
            ];

            ResponseHandler.success(res, reportTypes);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.getReportTypes');
        }
    }

    /**
     * Generate executive summary: Cost vs Revenue
     * GET /api/v1/reports/cost-vs-revenue
     */
    static async generateCostVsRevenueReport(req, res) {
        try {
            const {
                start_date,
                end_date,
                category,
                format = 'json',
                include_monthly_breakdown = true
            } = req.query;

            // Import database for raw queries
            const { database } = await import('../config/database.js');

            // Build date filters
            let dateFilter = '';
            const params = [req.companyId];

            if (start_date) {
                dateFilter += ` AND p.purchase_date >= $${params.length + 1}`;
                params.push(start_date);
            }

            if (end_date) {
                dateFilter += ` AND p.purchase_date <= $${params.length + 1}`;
                params.push(end_date);
            }

            // Get purchase data (costs)
            const purchaseQuery = `
                SELECT
                    SUM(p.cost_amount) as total_cost,
                    SUM(p.sell_amount) as total_potential_revenue,
                    SUM(p.profit_amount) as total_profit,
                    AVG(p.profit_margin_percent) as avg_profit_margin,
                    COUNT(p.id) as total_purchases
                FROM purchases p
                WHERE p.company_id = $1 ${dateFilter}
            `;

            const purchaseResult = await database.query(purchaseQuery, params);

            // Get sales data (actual revenue)
            const salesQuery = `
                SELECT
                    SUM(s.total_amount) as total_revenue,
                    COUNT(s.id) as total_sales,
                    AVG(s.total_amount) as avg_sale_amount
                FROM sales s
                WHERE s.company_id = $1 AND s.sale_date >= COALESCE(
                    $${params.length === 1 ? 2 : params.length + 1}::DATE, 
                    s.sale_date - INTERVAL '90 days'
                )
                ${end_date ? `AND s.sale_date <= $${params.length + (start_date ? 3 : 2)}::DATE` : ''}
            `;

            const salesParams = [req.companyId, start_date || null, end_date || null];
            const salesResult = await database.query(salesQuery, salesParams);

            // Calculate executive summary
            const purchaseData = purchaseResult.rows[0];
            const salesData = salesResult.rows[0];

            const totalCost = parseFloat(purchaseData.total_cost) || 0;
            const potentialRevenue = parseFloat(purchaseData.total_potential_revenue) || 0;
            const actualRevenue = parseFloat(salesData.total_revenue) || 0;
            const projectedProfit = potentialRevenue - totalCost;
            const actualGain = actualRevenue - totalCost;
            const profitMargin = totalCost > 0 ? ((projectedProfit / totalCost) * 100) : 0;

            // Get monthly breakdown if requested
            let monthlyData = [];
            if (include_monthly_breakdown === 'true' || include_monthly_breakdown === true) {
                const monthlyQuery = `
                    SELECT
                        DATE_TRUNC('month', COALESCE(p.purchase_date, s.sale_date))::DATE as month,
                        SUM(CASE WHEN p.id IS NOT NULL THEN p.cost_amount ELSE 0 END) as cost,
                        SUM(CASE WHEN s.id IS NOT NULL THEN s.total_amount ELSE 0 END) as revenue
                    FROM purchases p
                    FULL OUTER JOIN sales s ON DATE_TRUNC('month', p.purchase_date) = DATE_TRUNC('month', s.sale_date)
                        AND p.company_id = s.company_id
                    WHERE (p.company_id = $1 OR s.company_id = $1)
                    GROUP BY DATE_TRUNC('month', COALESCE(p.purchase_date, s.sale_date))
                    ORDER BY month DESC
                `;

                const monthlyResult = await database.query(monthlyQuery, [req.companyId]);
                monthlyData = monthlyResult.rows.map(row => ({
                    month: row.month,
                    cost: parseFloat(row.cost) || 0,
                    revenue: parseFloat(row.revenue) || 0,
                    gain: (parseFloat(row.revenue) || 0) - (parseFloat(row.cost) || 0),
                    margin_percent: (parseFloat(row.cost) || 0) > 0 
                        ? (((parseFloat(row.revenue) || 0) - (parseFloat(row.cost) || 0)) / (parseFloat(row.cost) || 0) * 100)
                        : 0
                }));
            }

            // Build response
            const summary = {
                period: {
                    start_date: start_date || 'N/A',
                    end_date: end_date || 'N/A'
                },
                cost_summary: {
                    total_purchase_cost: totalCost,
                    total_purchases: parseInt(purchaseData.total_purchases) || 0,
                    avg_purchase_cost: totalCost / (parseInt(purchaseData.total_purchases) || 1)
                },
                revenue_summary: {
                    total_actual_revenue: actualRevenue,
                    total_sales: parseInt(salesData.total_sales) || 0,
                    avg_sale_amount: parseFloat(salesData.avg_sale_amount) || 0,
                    total_potential_revenue: potentialRevenue
                },
                profit_analysis: {
                    projected_profit: projectedProfit,
                    actual_gain: actualGain,
                    profit_margin_percent: parseFloat(profitMargin.toFixed(2)),
                    avg_profit_margin_percent: parseFloat(purchaseData.avg_profit_margin) || 0
                },
                monthly_breakdown: monthlyData
            };

            logger.business('cost_vs_revenue_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                totalCost,
                actualRevenue,
                actualGain,
                format
            });

            if (format.toLowerCase() === 'json') {
                ResponseHandler.success(res, summary, 'Executive summary generated successfully');
            } else if (format.toLowerCase() === 'excel' || format.toLowerCase() === 'pdf') {
                // For Excel/PDF, you would generate file here
                ResponseHandler.success(res, summary, 'Report format will be exported soon');
            } else {
                ResponseHandler.badRequest(res, 'Unsupported format. Use: json, excel, pdf');
            }

        } catch (error) {
            ResponseHandler.handleError(res, error, 'ReportController.generateCostVsRevenueReport');
        }
    }
}

export default ReportController;