import express from 'express';
import multer from 'multer';
import SaleController from '../controllers/sale.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { schemas } from '../validations/sale.schema.js';

const router = express.Router();

// Configure multer for file uploads (memory storage for OCR)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// All sale routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/sales/ocr:
 *   post:
 *     summary: Extract serial number from image using OCR
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file containing serial number
 *     responses:
 *       200:
 *         description: Serial number extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serial_number:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 candidates:
 *                   type: array
 *       400:
 *         description: Invalid image or OCR failed
 */
router.post('/ocr', checkResourcePermission('sale', 'create'), upload.single('image'), SaleController.extractSerialNumberOCR);

/**
 * @swagger
 * /api/v1/sales:
 *   get:
 *     summary: Get all sales for the company
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: customer_name
 *         schema:
 *           type: string
 *         description: Filter by customer name
 *       - in: query
 *         name: serial_number
 *         schema:
 *           type: string
 *         description: Filter by serial number
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 */
router.get('/', checkResourcePermission('sale', 'read'), SaleController.getAll);

/**
 * @swagger
 * /api/v1/sales/statistics:
 *   get:
 *     summary: Get sales statistics
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', checkResourcePermission('sale', 'read'), SaleController.getStatistics);

/**
 * @swagger
 * /api/v1/sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sale retrieved successfully
 *       404:
 *         description: Sale not found
 */
router.get('/:id', checkResourcePermission('sale', 'read'), SaleController.getById);

/**
 * @swagger
 * /api/v1/sales:
 *   post:
 *     summary: Create new sale with OCR serial number extraction
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_name
 *               - products
 *             properties:
 *               customer_name:
 *                 type: string
 *               customer_email:
 *                 type: string
 *               customer_phone:
 *                 type: string
 *               customer_address:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     unit_price:
 *                       type: number
 *               payment_method:
 *                 type: string
 *               warranty_months:
 *                 type: integer
 *                 default: 12
 *               serial_image:
 *                 type: string
 *                 description: Base64 encoded image for OCR
 *     responses:
 *       201:
 *         description: Sale created successfully
 */
router.post('/', checkResourcePermission('sale', 'create'), validate(schemas.createSale, 'body'), SaleController.create);

/**
 * @swagger
 * /api/v1/sales/{id}:
 *   put:
 *     summary: Update sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('sale', 'update'), SaleController.update);

/**
 * @swagger
 * /api/v1/sales/{id}:
 *   delete:
 *     summary: Delete sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('sale', 'delete'), SaleController.delete);

/**
 * @swagger
 * /api/v1/sales/{id}/receipt-pdf:
 *   get:
 *     summary: Download sale receipt as PDF
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: PDF receipt downloaded
 *       404:
 *         description: Sale not found
 */
router.get('/:id/receipt-pdf', checkResourcePermission('sale', 'read'), SaleController.generateReceiptPdf);

/**
 * @swagger
 * /api/v1/sales/{id}/receipt:
 *   post:
 *     summary: Generate receipt for sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Receipt generated
 *       404:
 *         description: Sale not found
 */
router.post('/:id/receipt', checkResourcePermission('sale', 'read'), SaleController.generateReceipt);

export default router;
