import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import ProductAttributeController from '../controllers/productAttribute.controller.js';

const router = express.Router({ mergeParams: true });

// All product attribute routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/products/:productId/attributes:
 *   get:
 *     summary: Get all attributes for a product
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/', checkResourcePermission('product', 'read'), ProductAttributeController.getByProduct);

/**
 * @swagger
 * /api/v1/products/:productId/attributes:
 *   post:
 *     summary: Create new product attribute
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', checkResourcePermission('product', 'create'), ProductAttributeController.create);

/**
 * @swagger
 * /api/v1/products/:productId/attributes/bulk:
 *   post:
 *     summary: Create multiple attributes for a product
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk', checkResourcePermission('product', 'create'), ProductAttributeController.createBulk);

/**
 * @swagger
 * /api/v1/products/:productId/attributes/:attributeId:
 *   get:
 *     summary: Get product attribute by ID
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:attributeId', checkResourcePermission('product', 'read'), ProductAttributeController.getById);

/**
 * @swagger
 * /api/v1/products/:productId/attributes/:attributeId:
 *   put:
 *     summary: Update product attribute
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:attributeId', checkResourcePermission('product', 'update'), ProductAttributeController.update);

/**
 * @swagger
 * /api/v1/products/:productId/attributes/:attributeId:
 *   delete:
 *     summary: Delete product attribute
 *     tags: [Product Attributes]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:attributeId', checkResourcePermission('product', 'delete'), ProductAttributeController.delete);

export default router;
