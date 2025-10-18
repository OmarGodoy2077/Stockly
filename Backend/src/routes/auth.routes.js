import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticateJWT, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { schemas } from '../validations/auth.schema.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user and create their first company
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - companyName
 *               - companyRuc
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "emprendedor@ejemplo.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Password123!"
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *               phone:
 *                 type: string
 *                 example: "+502 1234 5678"
 *               companyName:
 *                 type: string
 *                 example: "Mi Tienda SA"
 *               companyRuc:
 *                 type: string
 *                 example: "12345678901"
 *               companyAddress:
 *                 type: string
 *                 example: "Calle Principal 123"
 *               companyPhone:
 *                 type: string
 *                 example: "+502 9876 5432"
 *               companyEmail:
 *                 type: string
 *                 example: "contacto@mitienda.com"
 *     responses:
 *       201:
 *         description: User and company created successfully
 *       400:
 *         description: Validation error or email/RUC already exists
 */
router.post('/register', validate(schemas.register), AuthController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "emprendedor@ejemplo.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - specify which company to log into
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
router.post('/login', validate(schemas.login), AuthController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', validate(schemas.refresh), AuthController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user (invalidate refresh token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticateJWT, validate(schemas.logout), AuthController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticateJWT, AuthController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', authenticateJWT, validate(schemas.changePassword), AuthController.changePassword);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address (for future implementation)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/verify-email', AuthController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset (for future implementation)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/forgot-password', validate(schemas.forgotPassword), AuthController.forgotPassword);

export default router;
