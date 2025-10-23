import express from 'express';
import ReportController from '../controllers/report.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, requireInventoryAccess } from '../middlewares/role.middleware.js';

const router = express.Router();

// All report routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/reports/types:
 *   get:
 *     summary: Get available report types
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report types retrieved successfully
 */
router.get('/types', ReportController.getReportTypes);

/**
 * @swagger
 * /api/v1/reports/dashboard:
 *   get:
 *     summary: Get dashboard metrics and summary
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 */
router.get('/dashboard', ReportController.getDashboard);

/**
 * @swagger
 * /api/v1/reports/inventory:
 *   get:
 *     summary: Generate inventory report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *         default: excel
 *         description: Report format
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name or SKU
 *       - in: query
 *         name: stock_status
 *         schema:
 *           type: string
 *           enum: [low, out, available]
 *         description: Filter by stock status
 *       - in: query
 *         name: include_company_info
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include company information in report
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             description: Excel file
 *           application/pdf:
 *             description: PDF file
 *           text/csv:
 *             description: CSV file
 */
router.get('/inventory', requireInventoryAccess, ReportController.generateInventoryReport);

/**
 * @swagger
 * /api/v1/reports/sales:
 *   get:
 *     summary: Generate sales report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *         default: excel
 *         description: Report format
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: customer_name
 *         schema:
 *           type: string
 *         description: Filter by customer name
 *       - in: query
 *         name: include_company_info
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include company information in report
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             description: Excel file
 *           application/pdf:
 *             description: PDF file
 *           text/csv:
 *             description: CSV file
 */
router.get('/sales', requireInventoryAccess, ReportController.generateSalesReport);

/**
 * @swagger
 * /api/v1/reports/warranties:
 *   get:
 *     summary: Generate warranty report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *         default: excel
 *         description: Report format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, expiring, all]
 *         default: active
 *         description: Warranty status filter
 *       - in: query
 *         name: expiring_days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Days threshold for expiring warranties
 *       - in: query
 *         name: include_company_info
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include company information in report
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             description: Excel file
 *           application/pdf:
 *             description: PDF file
 *           text/csv:
 *             description: CSV file
 */
router.get('/warranties', requireInventoryAccess, ReportController.generateWarrantyReport);

/**
 * @swagger
 * /api/v1/reports/services:
 *   get:
 *     summary: Generate service history report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *         default: excel
 *         description: Report format
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [received, in_repair, waiting_parts, ready, delivered, cancelled]
 *         description: Filter by service status
 *       - in: query
 *         name: technician
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by technician ID
 *       - in: query
 *         name: include_company_info
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include company information in report
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             description: Excel file
 *           application/pdf:
 *             description: PDF file
 *           text/csv:
 *             description: CSV file
 */
router.get('/services', requireInventoryAccess, ReportController.generateServiceReport);

/**
 * @swagger
 * /api/v1/reports/cost-vs-revenue:
 *   get:
 *     summary: Generate executive summary - Cost vs Revenue
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, excel, pdf]
 *         default: json
 *         description: Report format
 *       - in: query
 *         name: include_monthly_breakdown
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include monthly breakdown in report
 *     responses:
 *       200:
 *         description: Executive summary generated successfully
 */
router.get('/cost-vs-revenue', requireInventoryAccess, ReportController.generateCostVsRevenueReport);

export default router;