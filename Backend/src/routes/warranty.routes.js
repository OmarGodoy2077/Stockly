import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import WarrantyController from '../controllers/warranty.controller.js';

const router = express.Router();

// All warranty routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/warranties/diagnostic:
 *   get:
 *     summary: Get warranty system diagnostic information
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/diagnostic', checkResourcePermission('warranty', 'read'), WarrantyController.getDiagnostic);

/**
 * @swagger
 * /api/v1/warranties/statistics:
 *   get:
 *     summary: Get warranty statistics
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', checkResourcePermission('warranty', 'read'), WarrantyController.getStatistics);

/**
 * @swagger
 * /api/v1/warranties/expiring/:days:
 *   get:
 *     summary: Get warranties expiring in X days
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/expiring/:days?', checkResourcePermission('warranty', 'read'), WarrantyController.getExpiring);

/**
 * @swagger
 * /api/v1/warranties/serial/:serialNumber:
 *   get:
 *     summary: Get warranty by serial number
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/serial/:serialNumber', checkResourcePermission('warranty', 'read'), WarrantyController.getBySerialNumber);

/**
 * @swagger
 * /api/v1/warranties:
 *   get:
 *     summary: Get all warranties with filters
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', checkResourcePermission('warranty', 'read'), WarrantyController.getAll);

/**
 * @swagger
 * /api/v1/warranties/:id:
 *   get:
 *     summary: Get warranty by ID
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourcePermission('warranty', 'read'), WarrantyController.getById);

/**
 * @swagger
 * /api/v1/warranties/:id:
 *   put:
 *     summary: Update warranty
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('warranty', 'update'), WarrantyController.update);

/**
 * @swagger
 * /api/v1/warranties/:id:
 *   delete:
 *     summary: Deactivate warranty
 *     tags: [Warranties]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('warranty', 'delete'), WarrantyController.deactivate);

export default router;
