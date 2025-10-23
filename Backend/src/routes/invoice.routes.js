import express from 'express';
import InvoiceController from '../controllers/invoice.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';

const router = express.Router();

// All invoice routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * Create new invoice from a sale
 * POST /api/v1/invoices
 * 
 * Body:
 * {
 *   "sale_id": "uuid",
 *   "additional_items": [
 *     {
 *       "item_type": "shipping|commission|discount|other",
 *       "item_name": "Envío a domicilio",
 *       "item_description": "Descripción opcional",
 *       "quantity": 1,
 *       "unit_price": 50.00,
 *       "is_taxable": false
 *     }
 *   ],
 *   "payment_method": "cash|transfer|card|cod",
 *   "payment_status": "pending|paid|partial",
 *   "terms_conditions": "Texto de términos",
 *   "notes": "Notas adicionales",
 *   "company_data": {
 *     "name": "Mi Empresa",
 *     "address": "Calle 123",
 *     "phone": "+502...",
 *     "email": "contacto@...",
 *     "rtc": "RTC123456",
 *     "logo_url": "https://..."
 *   }
 * }
 */
router.post('/', checkResourcePermission('invoice', 'create'), InvoiceController.create);

/**
 * Get all invoices for company
 * GET /api/v1/invoices
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - start_date: YYYY-MM-DD
 * - end_date: YYYY-MM-DD
 * - invoice_number: string (search)
 * - payment_status: pending|paid|partial
 * - is_draft: true|false
 * - sort_by: invoice_date|total_amount|created_at (default: invoice_date)
 * - sort_order: ASC|DESC (default: DESC)
 */
router.get('/', checkResourcePermission('invoice', 'read'), InvoiceController.getAll);

/**
 * Get invoice statistics
 * GET /api/v1/invoices/statistics
 * 
 * Query params:
 * - start_date: YYYY-MM-DD (optional)
 * - end_date: YYYY-MM-DD (optional)
 * 
 * NOTE: This route must come BEFORE /:id to be matched correctly
 */
router.get('/statistics', checkResourcePermission('invoice', 'read'), InvoiceController.getStatistics);

/**
 * Get invoice by ID with line items
 * GET /api/v1/invoices/:id
 */
router.get('/:id', checkResourcePermission('invoice', 'read'), InvoiceController.getById);

/**
 * Add line item to invoice (draft only)
 * POST /api/v1/invoices/:id/line-items
 * 
 * Body:
 * {
 *   "item_type": "shipping|commission|discount|other|product",
 *   "item_name": "Nombre del item",
 *   "item_description": "Descripción",
 *   "product_id": "uuid (opcional, solo para productos)",
 *   "quantity": 1,
 *   "unit_price": 50.00,
 *   "is_taxable": true|false
 * }
 */
router.post('/:id/line-items', checkResourcePermission('invoice', 'update'), InvoiceController.addLineItem);

/**
 * Generate PDF for invoice
 * POST /api/v1/invoices/:id/generate-pdf
 * 
 * Genera el PDF del recibo y lo almacena en Cloudinary
 * Retorna: { invoice_id, invoice_number, pdf_url }
 */
router.post('/:id/generate-pdf', checkResourcePermission('invoice', 'update'), InvoiceController.generatePdf);

/**
 * Download PDF invoice
 * GET /api/v1/invoices/:id/download-pdf
 * 
 * Redirige al PDF almacenado en Cloudinary
 */
router.get('/:id/download-pdf', checkResourcePermission('invoice', 'read'), InvoiceController.downloadPdf);

/**
 * Finalize invoice (mark as not draft)
 * PATCH /api/v1/invoices/:id/finalize
 * 
 * Una vez finalizado, el recibo no puede ser editado
 */
router.patch('/:id/finalize', checkResourcePermission('invoice', 'update'), InvoiceController.finalize);

/**
 * Update invoice details (draft only)
 * PUT /api/v1/invoices/:id
 * 
 * Body (todos opcionales):
 * {
 *   "payment_method": "cash|transfer|card|cod",
 *   "payment_status": "pending|paid|partial",
 *   "terms_conditions": "Texto",
 *   "notes": "Notas"
 * }
 */
router.put('/:id', checkResourcePermission('invoice', 'update'), InvoiceController.update);

/**
 * Delete line item from invoice
 * DELETE /api/v1/invoices/:id/line-items/:itemId
 */
router.delete('/:id/line-items/:itemId', checkResourcePermission('invoice', 'delete'), InvoiceController.deleteLineItem);

export default router;
