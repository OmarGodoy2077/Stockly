import express from 'express';
import UserController from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, requireCompanyOwnerOrAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { schemas } from '../validations/user.schema.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/profile', UserController.getProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', validate(schemas.updateProfile), UserController.updateProfile);

/**
 * @swagger
 * /api/v1/users/companies:
 *   get:
 *     summary: Get all companies the user belongs to
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Companies list retrieved successfully
 */
router.get('/companies', UserController.getUserCompanies);

/**
 * @swagger
 * /api/v1/users/switch-company/{companyId}:
 *   post:
 *     summary: Switch to a different company context
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: New tokens generated for company context
 */
router.post('/switch-company/:companyId', UserController.switchCompany);

// Company-specific user routes
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users in the company (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, admin, seller, inventory]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 */
router.get('/', requireCompanyOwnerOrAdmin, UserController.getCompanyUsers);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get specific user details (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 */
router.get('/:userId', requireCompanyOwnerOrAdmin, UserController.getUserById);

/**
 * @swagger
 * /api/v1/users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate user account (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deactivated successfully
 */
router.post('/:userId/deactivate', requireCompanyOwnerOrAdmin, UserController.deactivateUser);

/**
 * @swagger
 * /api/v1/users/{userId}/activate:
 *   post:
 *     summary: Activate user account (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User activated successfully
 */
router.post('/:userId/activate', requireCompanyOwnerOrAdmin, UserController.activateUser);

export default router;
