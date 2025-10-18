import express from 'express';
import ProductController from '../controllers/product.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, requireInventoryAccess, checkResourcePermission } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { schemas } from '../validations/product.schema.js';

const router = express.Router();

// All product routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with pagination and filters
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
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
 *         description: Search in name, SKU, or description
 *       - in: query
 *         name: stock_status
 *         schema:
 *           type: string
 *           enum: [low, out, available]
 *         description: Filter by stock status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, sku, price, stock, created_at]
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate(schemas.productQuery, 'query'), ProductController.getAll);

/**
 * @swagger
 * /api/v1/products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get('/low-stock', requireInventoryAccess, ProductController.getLowStock);

/**
 * @swagger
 * /api/v1/products/statistics:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics retrieved successfully
 */
router.get('/statistics', requireInventoryAccess, ProductController.getStatistics);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id', checkResourcePermission('product', 'read'), ProductController.getById);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - price
 *             properties:
 *               sku:
 *                 type: string
 *                 example: "TV001"
 *               name:
 *                 type: string
 *                 example: "Televisor LED 42\""
 *               description:
 *                 type: string
 *                 example: "Televisor LED de 42 pulgadas Full HD"
 *               price:
 *                 type: number
 *                 example: 2500.00
 *               stock:
 *                 type: number
 *                 example: 10
 *               min_stock:
 *                 type: number
 *                 example: 5
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               image_url:
 *                 type: string
 *                 format: uri
 *               barcode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', requireInventoryAccess, validate(schemas.createProduct, 'body'), ProductController.create);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               min_stock:
 *                 type: number
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               image_url:
 *                 type: string
 *                 format: uri
 *               barcode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id',
    checkResourcePermission('product', 'update'),
    validate(schemas.updateProduct, 'body'),
    ProductController.update
);

/**
 * @swagger
 * /api/v1/products/{id}/stock:
 *   patch:
 *     summary: Update product stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock
 *             properties:
 *               stock:
 *                 type: number
 *                 example: 15
 *               operation:
 *                 type: string
 *                 enum: [set, add, subtract]
 *                 default: set
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.patch('/:id/stock',
    checkResourcePermission('product', 'update'),
    validate(schemas.updateStock, 'body'),
    ProductController.updateStock
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete('/:id',
    checkResourcePermission('product', 'delete'),
    ProductController.delete
);

/**
 * @swagger
 * /api/v1/products/bulk-update:
 *   post:
 *     summary: Bulk update products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     updates:
 *                       type: object
 *     responses:
 *       200:
 *         description: Bulk update completed
 */
router.post('/bulk-update',
    requireInventoryAccess,
    validate(schemas.bulkUpdate, 'body'),
    ProductController.bulkUpdate
);

export default router;