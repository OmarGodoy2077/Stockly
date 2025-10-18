import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import PurchaseController from '../controllers/purchase.controller.js';

const router = express.Router();

// All purchase routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/purchases/statistics:
 *   get:
 *     summary: Get purchase statistics
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', checkResourcePermission('purchase', 'read'), PurchaseController.getStatistics);

/**
 * @swagger
 * /api/v1/purchases/supplier/:supplierId:
 *   get:
 *     summary: Get purchases by supplier
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/supplier/:supplierId', checkResourcePermission('purchase', 'read'), PurchaseController.getBySupplier);

/**
 * @swagger
 * /api/v1/purchases:
 *   get:
 *     summary: Get all purchases with filters
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', checkResourcePermission('purchase', 'read'), PurchaseController.getAll);

/**
 * @swagger
 * /api/v1/purchases:
 *   post:
 *     summary: Create new purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', checkResourcePermission('purchase', 'create'), PurchaseController.create);

/**
 * @swagger
 * /api/v1/purchases/:id:
 *   get:
 *     summary: Get purchase by ID
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourcePermission('purchase', 'read'), PurchaseController.getById);

/**
 * @swagger
 * /api/v1/purchases/:id:
 *   put:
 *     summary: Update purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('purchase', 'update'), PurchaseController.update);

/**
 * @swagger
 * /api/v1/purchases/:id:
 *   delete:
 *     summary: Delete purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('purchase', 'delete'), PurchaseController.delete);

export default router;
