import express from 'express';
import CompanyController from '../controllers/company.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, requireCompanyOwner, requireCompanyOwnerOrAdmin } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { schemas } from '../validations/company.schema.js';

const router = express.Router();

// All company routes require authentication
router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/companies:
 *   post:
 *     summary: Create a new company (authenticated users can create new companies)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ruc
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nueva Empresa SA"
 *               ruc:
 *                 type: string
 *                 example: "98765432101"
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router.post('/', validate(schemas.createCompany), CompanyController.createCompany);

/**
 * @swagger
 * /api/v1/companies/{companyId}:
 *   get:
 *     summary: Get company details
 *     tags: [Companies]
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
 *         description: Company details retrieved successfully
 */
router.get('/:companyId', CompanyController.getCompanyById);

/**
 * @swagger
 * /api/v1/companies/{companyId}:
 *   put:
 *     summary: Update company information (owner or admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 */
router.put('/:companyId', setCompanyContext, requireCompanyOwnerOrAdmin, validate(schemas.updateCompany), CompanyController.updateCompany);

/**
 * @swagger
 * /api/v1/companies/{companyId}/statistics:
 *   get:
 *     summary: Get company statistics
 *     tags: [Companies]
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
 *         description: Statistics retrieved successfully
 */
router.get('/:companyId/statistics', setCompanyContext, CompanyController.getStatistics);

// ==================== MEMBER MANAGEMENT ====================

/**
 * @swagger
 * /api/v1/companies/{companyId}/members:
 *   get:
 *     summary: Get all company members
 *     tags: [Companies]
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
 *         description: Members list retrieved successfully
 */
router.get('/:companyId/members', setCompanyContext, CompanyController.getMembers);

/**
 * @swagger
 * /api/v1/companies/{companyId}/invite:
 *   post:
 *     summary: Invite a user to the company (owner or admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nuevo@empleado.com"
 *               role:
 *                 type: string
 *                 enum: [admin, seller, inventory]
 *                 example: "seller"
 *               name:
 *                 type: string
 *                 example: "Nuevo Empleado"
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Optional - if not provided, user must set it later
 *     responses:
 *       201:
 *         description: User invited successfully
 */
router.post('/:companyId/invite', setCompanyContext, requireCompanyOwnerOrAdmin, validate(schemas.inviteUser), CompanyController.inviteUser);

/**
 * @swagger
 * /api/v1/companies/{companyId}/members/{userId}/role:
 *   patch:
 *     summary: Update user role in company (owner only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, seller, inventory]
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.patch('/:companyId/members/:userId/role', setCompanyContext, requireCompanyOwner, validate(schemas.updateRole), CompanyController.updateMemberRole);

/**
 * @swagger
 * /api/v1/companies/{companyId}/members/{userId}:
 *   delete:
 *     summary: Remove user from company (owner or admin only)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User removed successfully
 */
router.delete('/:companyId/members/:userId', setCompanyContext, requireCompanyOwnerOrAdmin, CompanyController.removeMember);

export default router;
