import ReportService from '../services/report.service.js';
import ProductModel from '../models/product.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';
import { database } from '../config/database.js';

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
            let query = database.supabase
                .from('sales')
                .select('*')
                .eq('company_id', req.companyId);

            if (start_date) {
                query = query.gte('sale_date', start_date);
            }

            if (end_date) {
                query = query.lte('sale_date', end_date);
            }

            if (customer_name) {
                query = query.ilike('customer_name', `%${customer_name}%`);
            }

            query = query.order('sale_date', { ascending: false });

            const { data: result, error: queryError } = await query;

            if (queryError) {
                throw queryError;
            }

            if (!result || result.length === 0) {
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
                    buffer = await ReportService.generatePDF(result, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(result, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateSalesReport(result, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('sales_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                salesCount: result.length
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
            let query = database.supabase
                .from('warranties')
                .select(`
                    *,
                    companies(name)
                `)
                .eq('company_id', req.companyId);

            // Apply status filter
            switch (status) {
                case 'active':
                    query = query
                        .eq('is_active', true)
                        .gt('expires_at', new Date().toISOString().split('T')[0]);
                    break;
                case 'expired':
                    query = query
                        .or(`is_active.eq.false,expires_at.lte.${new Date().toISOString().split('T')[0]}`);
                    break;
                case 'expiring':
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + parseInt(expiring_days || 30));
                    query = query
                        .eq('is_active', true)
                        .lte('expires_at', futureDate.toISOString().split('T')[0]);
                    break;
                // 'all' doesn't need filter
            }

            query = query.order('expires_at', { ascending: true });

            const { data: result, error: queryError } = await query;

            if (queryError) {
                throw queryError;
            }

            if (!result || result.length === 0) {
                return ResponseHandler.error(res, 'No warranties found for the report', 404);
            }

            // Map result to include computed days_to_expiry
            const mappedResult = result.map(w => ({
                ...w,
                company_name: w.companies?.name,
                days_to_expiry: Math.ceil((new Date(w.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
            }));

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
                    buffer = await ReportService.generatePDF(mappedResult, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(mappedResult, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateWarrantyReport(mappedResult, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-garantias-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('warranty_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                warrantyCount: result.length,
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
            let query = database.supabase
                .from('service_histories')
                .select(`
                    *,
                    companies(name),
                    technician_user:technician_id (name)
                `)
                .eq('company_id', req.companyId);

            if (start_date) {
                query = query.gte('entry_date', start_date);
            }

            if (end_date) {
                query = query.lte('entry_date', end_date);
            }

            if (status) {
                query = query.eq('status', status);
            }

            if (technician) {
                query = query.eq('technician_id', technician);
            }

            query = query.order('entry_date', { ascending: false });

            const { data: result, error: queryError } = await query;

            if (queryError) {
                throw queryError;
            }

            if (!result || result.length === 0) {
                return ResponseHandler.error(res, 'No service records found for the report', 404);
            }

            // Map result to include computed fields
            const mappedResult = result.map(sh => ({
                ...sh,
                company_name: sh.companies?.name,
                technician_name: sh.technician_user?.name
            }));

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
                    buffer = await ReportService.generatePDF(mappedResult, reportOptions);
                    mimeType = 'application/pdf';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.pdf`;
                    break;

                case 'csv':
                    buffer = ReportService.generateCSV(mappedResult, reportOptions);
                    mimeType = 'text/csv';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.csv`;
                    break;

                case 'excel':
                default:
                    buffer = await ReportService.generateServiceReport(mappedResult, reportOptions);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileName = `reporte-servicio-${new Date().toISOString().split('T')[0]}.xlsx`;
                    break;
            }

            logger.business('service_report_generated', 'report', req.user.id, {
                companyId: req.companyId,
                format,
                serviceCount: result.length
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

            // Get purchase data (costs)
            let purchaseQuery = database.supabase
                .from('purchases')
                .select('cost_amount, sell_amount, profit_amount, profit_margin_percent')
                .eq('company_id', req.companyId);

            if (start_date) {
                purchaseQuery = purchaseQuery.gte('purchase_date', start_date);
            }

            if (end_date) {
                purchaseQuery = purchaseQuery.lte('purchase_date', end_date);
            }

            const { data: purchaseData, error: purchaseError } = await purchaseQuery;

            if (purchaseError) {
                throw purchaseError;
            }

            // Get sales data (actual revenue)
            let salesQuery = database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', req.companyId);

            if (start_date) {
                salesQuery = salesQuery.gte('sale_date', start_date);
            } else {
                // Default to last 90 days
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                salesQuery = salesQuery.gte('sale_date', ninetyDaysAgo.toISOString());
            }

            if (end_date) {
                salesQuery = salesQuery.lte('sale_date', end_date);
            }

            const { data: salesData, error: salesError } = await salesQuery;

            if (salesError) {
                throw salesError;
            }

            // Calculate aggregates from the data
            const purchaseStats = purchaseData.reduce((acc, p) => ({
                total_cost: acc.total_cost + (p.cost_amount || 0),
                total_potential_revenue: acc.total_potential_revenue + (p.sell_amount || 0),
                total_profit: acc.total_profit + (p.profit_amount || 0),
                avg_profit_margin: acc.count > 0 ? (acc.avg_profit_margin + (p.profit_margin_percent || 0)) / (acc.count + 1) : (p.profit_margin_percent || 0),
                count: acc.count + 1
            }), { total_cost: 0, total_potential_revenue: 0, total_profit: 0, avg_profit_margin: 0, count: 0 });

            const salesStats = salesData.reduce((acc, s) => ({
                total_revenue: acc.total_revenue + (s.total_amount || 0),
                count: acc.count + 1,
                avg_sale_amount: acc.total_revenue / (acc.count || 1)
            }), { total_revenue: 0, count: 0, avg_sale_amount: 0 });

            const totalCost = purchaseStats.total_cost;
            const potentialRevenue = purchaseStats.total_potential_revenue;
            const actualRevenue = salesStats.total_revenue;
            const projectedProfit = potentialRevenue - totalCost;
            const actualGain = actualRevenue - totalCost;
            const profitMargin = totalCost > 0 ? ((projectedProfit / totalCost) * 100) : 0;

            // Get monthly breakdown if requested
            let monthlyData = [];
            if (include_monthly_breakdown === 'true' || include_monthly_breakdown === true) {
                // Get purchase data by month
                let monthPurchaseQuery = database.supabase
                    .from('purchases')
                    .select('purchase_date, cost_amount, sell_amount')
                    .eq('company_id', req.companyId);

                if (start_date) {
                    monthPurchaseQuery = monthPurchaseQuery.gte('purchase_date', start_date);
                }

                if (end_date) {
                    monthPurchaseQuery = monthPurchaseQuery.lte('purchase_date', end_date);
                }

                const { data: monthPurchaseData } = await monthPurchaseQuery;

                // Get sales data by month
                let monthSalesQuery = database.supabase
                    .from('sales')
                    .select('sale_date, total_amount')
                    .eq('company_id', req.companyId);

                if (start_date) {
                    monthSalesQuery = monthSalesQuery.gte('sale_date', start_date);
                }

                if (end_date) {
                    monthSalesQuery = monthSalesQuery.lte('sale_date', end_date);
                }

                const { data: monthSalesData } = await monthSalesQuery;

                // Group by month
                const monthlyMap = {};

                (monthPurchaseData || []).forEach(p => {
                    const month = new Date(p.purchase_date).toISOString().split('T')[0].substring(0, 7);
                    if (!monthlyMap[month]) {
                        monthlyMap[month] = { cost: 0, revenue: 0 };
                    }
                    monthlyMap[month].cost += p.cost_amount || 0;
                });

                (monthSalesData || []).forEach(s => {
                    const month = new Date(s.sale_date).toISOString().split('T')[0].substring(0, 7);
                    if (!monthlyMap[month]) {
                        monthlyMap[month] = { cost: 0, revenue: 0 };
                    }
                    monthlyMap[month].revenue += s.total_amount || 0;
                });

                monthlyData = Object.entries(monthlyMap)
                    .map(([month, data]) => ({
                        month: month + '-01',
                        cost: data.cost,
                        revenue: data.revenue,
                        gain: data.revenue - data.cost,
                        margin_percent: data.cost > 0 ? ((data.revenue - data.cost) / data.cost * 100) : 0
                    }))
                    .sort((a, b) => new Date(b.month) - new Date(a.month));
            }

            // Build response
            const summary = {
                period: {
                    start_date: start_date || 'N/A',
                    end_date: end_date || 'N/A'
                },
                cost_summary: {
                    total_purchase_cost: totalCost,
                    total_purchases: purchaseStats.count || 0,
                    avg_purchase_cost: purchaseStats.count > 0 ? totalCost / purchaseStats.count : 0
                },
                revenue_summary: {
                    total_actual_revenue: actualRevenue,
                    total_sales: salesStats.count || 0,
                    avg_sale_amount: salesStats.avg_sale_amount || 0,
                    total_potential_revenue: potentialRevenue
                },
                profit_analysis: {
                    projected_profit: projectedProfit,
                    actual_gain: actualGain,
                    profit_margin_percent: parseFloat(profitMargin.toFixed(2)),
                    avg_profit_margin_percent: parseFloat(purchaseStats.avg_profit_margin.toFixed(2)) || 0
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

    /**
     * Get dashboard metrics and summary
     * GET /api/v1/reports/dashboard
     */
    static async getDashboard(req, res) {
        try {
            const companyId = req.companyId;

            if (!companyId) {
                console.log('[DASHBOARD] ERROR - No companyId found:', {
                    reqCompanyId: req.companyId,
                    userCompanyId: req.user?.companyId,
                    user: req.user,
                    hasUser: !!req.user
                });
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required',
                    debug: {
                        hasCompanyId: !!req.companyId,
                        hasUser: !!req.user,
                        hasUserCompanyId: !!req.user?.companyId,
                        message: 'Make sure you are logged in with a company selected'
                    }
                });
            }

            // Get total products
            const { data: productsData, error: productsError } = await database.supabase
                .from('products')
                .select('id, stock, price', { count: 'exact' })
                .eq('company_id', companyId)
                .eq('is_active', true);

            const totalProducts = productsData?.length || 0;
            const totalInventoryValue = productsData?.reduce((sum, p) => sum + (p.stock * p.price), 0) || 0;

            // Get low stock products
            const { data: lowStockData } = await database.supabase
                .from('products')
                .select('id, name, stock, min_stock')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .lt('stock', 'min_stock');

            const lowStockCount = lowStockData?.length || 0;

            // Get recent sales (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: salesData } = await database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', companyId)
                .gte('sale_date', sevenDaysAgo.toISOString())
                .eq('is_active', true);

            const totalSales = salesData?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
            const salesCount = salesData?.length || 0;

            // Get categories count
            const { data: categoriesData } = await database.supabase
                .from('categories')
                .select('id', { count: 'exact' })
                .eq('company_id', companyId)
                .eq('is_active', true);

            const totalCategories = categoriesData?.length || 0;

            // Get active warranties (expiring in next 30 days)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const { data: warrantiesData } = await database.supabase
                .from('warranties')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .lte('expires_at', thirtyDaysFromNow.toISOString())
                .gte('expires_at', new Date().toISOString());

            const expiringSoonCount = warrantiesData?.length || 0;

            // Get recent service tickets
            const { data: servicesData } = await database.supabase
                .from('service_history')
                .select('status')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(10);

            const pendingServices = servicesData?.filter(s => s.status === 'pending')?.length || 0;
            const inRepairServices = servicesData?.filter(s => s.status === 'in_repair')?.length || 0;

            // Get sales data for different periods
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            monthAgo.setHours(0, 0, 0, 0);

            const { data: salesToday } = await database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('sale_date', today.toISOString());

            const { data: salesWeek } = await database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('sale_date', weekAgo.toISOString());

            const { data: salesMonth } = await database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('sale_date', monthAgo.toISOString());

            const outOfStockCount = productsData?.filter(p => p.stock === 0)?.length || 0;

            // Get active warranties count
            const { data: activeWarrantiesData } = await database.supabase
                .from('warranties')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString());

            const activeWarrantiesCount = activeWarrantiesData?.length || 0;

            logger.business('dashboard_viewed', 'report', req.user.id, {
                companyId
            });

            const dashboardMetrics = {
                sales: {
                    today: salesToday?.length || 0,
                    week: salesWeek?.length || 0,
                    month: salesMonth?.length || 0,
                    revenue: {
                        today: parseFloat((salesToday?.reduce((sum, s) => sum + s.total_amount, 0) || 0).toFixed(2)),
                        week: parseFloat((salesWeek?.reduce((sum, s) => sum + s.total_amount, 0) || 0).toFixed(2)),
                        month: parseFloat((salesMonth?.reduce((sum, s) => sum + s.total_amount, 0) || 0).toFixed(2))
                    }
                },
                products: {
                    total: totalProducts,
                    lowStock: lowStockCount,
                    outOfStock: outOfStockCount
                },
                warranties: {
                    active: activeWarrantiesCount,
                    expiring: expiringSoonCount
                },
                services: {
                    pending: pendingServices,
                    inRepair: inRepairServices
                }
            };

            ResponseHandler.success(res, dashboardMetrics, 'Dashboard metrics retrieved successfully');

        } catch (error) {
            logger.error('Error getting dashboard metrics:', error);
            ResponseHandler.handleError(res, error, 'ReportController.getDashboard');
        }
    }
}

export default ReportController;