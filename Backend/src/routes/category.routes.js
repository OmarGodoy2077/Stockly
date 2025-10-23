import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import CategoryController from '../controllers/category.controller.js';

const router = express.Router();

// All category routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

// GET routes with specific paths must come BEFORE parameterized routes
/**
 * @swagger
 * /api/v1/categories/tree:
 *   get:
 *     summary: Get category hierarchy as tree structure
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category tree with hierarchy
 */
router.get('/tree', checkResourcePermission('category', 'read'), CategoryController.getTree);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', checkResourcePermission('category', 'read'), CategoryController.getAll);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', checkResourcePermission('category', 'create'), CategoryController.create);

// Parameterized routes come AFTER specific routes
/**
 * @swagger
 * /api/v1/categories/:id/products:
 *   get:
 *     summary: Get products in category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/products', checkResourcePermission('category', 'read'), CategoryController.getProducts);

/**
 * @swagger
 * /api/v1/categories/:id:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourcePermission('category', 'read'), CategoryController.getById);

/**
 * @swagger
 * /api/v1/categories/:id:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('category', 'update'), CategoryController.update);

/**
 * @swagger
 * /api/v1/categories/:id:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('category', 'delete'), CategoryController.delete);

export default router;
