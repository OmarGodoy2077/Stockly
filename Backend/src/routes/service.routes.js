import express from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { setCompanyContext, checkResourcePermission } from '../middlewares/role.middleware.js';
import ServiceHistoryController from '../controllers/serviceHistory.controller.js';

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// All service routes require authentication and company context
router.use(authenticateJWT);
router.use(setCompanyContext);

/**
 * @swagger
 * /api/v1/services/statistics:
 *   get:
 *     summary: Get service statistics
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', checkResourcePermission('service', 'read'), ServiceHistoryController.getStatistics);

/**
 * @swagger
 * /api/v1/services/serial/:serialNumber:
 *   get:
 *     summary: Get service histories by serial number
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.get('/serial/:serialNumber', checkResourcePermission('service', 'read'), ServiceHistoryController.getBySerialNumber);

/**
 * @swagger
 * /api/v1/services:
 *   get:
 *     summary: Get all service histories with filters
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', checkResourcePermission('service', 'read'), ServiceHistoryController.getAll);

/**
 * @swagger
 * /api/v1/services:
 *   post:
 *     summary: Create new service history
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', checkResourcePermission('service', 'create'), upload.array('photos', 10), ServiceHistoryController.create);

/**
 * @swagger
 * /api/v1/services/:id:
 *   get:
 *     summary: Get service history by ID
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourcePermission('service', 'read'), ServiceHistoryController.getById);

/**
 * @swagger
 * /api/v1/services/:id:
 *   put:
 *     summary: Update service history
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', checkResourcePermission('service', 'update'), upload.array('photos', 10), ServiceHistoryController.update);

/**
 * @swagger
 * /api/v1/services/:id/status:
 *   patch:
 *     summary: Update service status
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', checkResourcePermission('service', 'update'), ServiceHistoryController.updateStatus);

/**
 * @swagger
 * /api/v1/services/:id:
 *   delete:
 *     summary: Delete service history
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', checkResourcePermission('service', 'delete'), ServiceHistoryController.delete);

export default router;
