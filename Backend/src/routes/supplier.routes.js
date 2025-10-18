import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import SupplierController from '../controllers/supplier.controller.js';

const router = express.Router();

// All supplier routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/suppliers/top/:limit?:
 *   get:
 *     summary: Get top suppliers by purchase amount
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/top/:limit?', checkResourcePermission('supplier', 'read'), SupplierController.getTopSuppliers);

/**
 * @swagger
 * /api/v1/suppliers:
 *   get:
 *     summary: Get all suppliers with filters
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', checkResourcePermission('supplier', 'read'), SupplierController.getAll);

/**
 * @swagger
 * /api/v1/suppliers:
 *   post:
 *     summary: Create new supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', checkResourcePermission('supplier', 'create'), SupplierController.create);

/**
 * @swagger
 * /api/v1/suppliers/:id:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourcePermission('supplier', 'read'), SupplierController.getById);

/**
 * @swagger
 * /api/v1/suppliers/:id:
 *   put:
 *     summary: Update supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('supplier', 'update'), SupplierController.update);

/**
 * @swagger
 * /api/v1/suppliers/:id:
 *   delete:
 *     summary: Delete supplier
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('supplier', 'delete'), SupplierController.delete);

export default router;
