import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext } from '../middlewares/role.middleware.js';

const router = express.Router();

// All sale routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/sales:
 *   get:
 *     summary: Get all sales for the company
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 */
router.get('/', async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Sale routes not yet implemented'
    });
});

export default router;
