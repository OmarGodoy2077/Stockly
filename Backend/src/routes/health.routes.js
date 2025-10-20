import express from 'express';
import { database } from '../config/database.js';
import { cloudinaryConfig } from '../config/cloudinary.js';
import { tesseractConfig } from '../config/tesseract.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

const router = express.Router();

/**
 * Check if invitation system migration has been applied
 * @returns {Promise<Object>} Migration status
 */
async function checkInvitationMigration() {
    try {
        // Check if invitations table exists
        const { data: tableExists, error: tableError } = await database.supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', 'invitations')
            .single();

        if (tableError && tableError.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw tableError;
        }

        // Check if generate_invitation_code function exists
        const { data: functionExists, error: functionError } = await database.supabase
            .rpc('generate_invitation_code');

        const hasTable = !!tableExists;
        const hasFunction = !functionError;

        return {
            status: hasTable && hasFunction ? 'migrated' : 'pending',
            table_exists: hasTable,
            function_exists: hasFunction,
            message: hasTable && hasFunction
                ? 'Invitation system migration applied'
                : 'Invitation system migration pending - run migrations/add-invitations-system.sql'
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message,
            message: 'Unable to check migration status'
        };
    }
}

/**
 * Health check endpoint - No authentication required
 * GET /api/health
 */
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();

        // Check database health
        const dbHealth = await database.healthCheck();

        // Check Cloudinary health
        const cloudinaryHealth = await cloudinaryConfig.healthCheck();

        // Check OCR health
        const ocrHealth = await tesseractConfig.healthCheck();

        // Check invitation migration status
        const invitationMigration = await checkInvitationMigration();

        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Overall health status (invitation migration is not critical for basic health)
        const overallStatus = dbHealth.status === 'healthy' &&
                             cloudinaryHealth.status === 'healthy' &&
                             ocrHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

        const healthCheck = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            response_time: `${responseTime}ms`,
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: dbHealth,
                cloudinary: cloudinaryHealth,
                ocr: ocrHealth,
                invitation_migration: invitationMigration
            },
            system: {
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                memory_usage: {
                    rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
                    heap_used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                    heap_total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
                },
                cpu_usage: process.cpuUsage()
            }
        };

        // Log health check
        logger.info('Health check performed:', {
            status: overallStatus,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // Return appropriate HTTP status code
        const statusCode = overallStatus === 'healthy' ? 200 : 503;

        if (overallStatus === 'healthy') {
            ResponseHandler.success(res, healthCheck, 'All systems operational', statusCode);
        } else {
            ResponseHandler.error(res, 'Some systems are experiencing issues', statusCode, healthCheck);
        }

    } catch (error) {
        logger.error('Health check error:', error);

        ResponseHandler.error(res, 'Health check failed', 503, {
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Detailed health check for load balancer
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
    try {
        const startTime = Date.now();

        // Database detailed check
        const dbHealth = await database.healthCheck();

        // Cloudinary health check
        const cloudinaryHealth = await cloudinaryConfig.healthCheck();

        // OCR detailed check
        const ocrStatus = tesseractConfig.getStatus();

        const responseTime = Date.now() - startTime;

        const detailedHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            response_time: `${responseTime}ms`,
            services: {
                database: dbHealth,
                cloudinary: {
                    status: cloudinaryHealth.status,
                    cloudName: cloudinaryHealth.cloudName
                },
                ocr: {
                    status: ocrStatus.initialized ? 'healthy' : 'unhealthy',
                    language: ocrStatus.language,
                    worker_exists: ocrStatus.workerExists
                }
            }
        };

        ResponseHandler.success(res, detailedHealth);

    } catch (error) {
        logger.error('Detailed health check error:', error);

        ResponseHandler.error(res, 'Detailed health check failed', 503, {
            error: error.message
        });
    }
});

/**
 * Readiness check for Kubernetes
 * GET /api/health/ready
 */
router.get('/ready', async (req, res) => {
    try {
        // Simple readiness check
        const dbHealth = await database.healthCheck();
        const cloudinaryHealth = await cloudinaryConfig.healthCheck();

        const ready = dbHealth.status === 'healthy' && cloudinaryHealth.status === 'healthy';

        if (ready) {
            ResponseHandler.success(res, {
                ready: true,
                timestamp: new Date().toISOString()
            }, 'Service is ready', 200);
        } else {
            ResponseHandler.error(res, 'Service not ready', 503, {
                ready: false,
                database: dbHealth.status,
                cloudinary: cloudinaryHealth.status
            });
        }

    } catch (error) {
        ResponseHandler.error(res, 'Readiness check failed', 503);
    }
});

/**
 * Liveness check for Kubernetes
 * GET /api/health/live
 */
router.get('/live', (req, res) => {
    // Simple liveness check - just check if process is running
    ResponseHandler.success(res, {
        live: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }, 'Service is alive');
});

/**
 * Invitation migration status check
 * GET /api/health/invitations
 */
router.get('/invitations', async (req, res) => {
    try {
        const migrationStatus = await checkInvitationMigration();

        if (migrationStatus.status === 'migrated') {
            ResponseHandler.success(res, migrationStatus, 'Invitation system migration applied');
        } else if (migrationStatus.status === 'pending') {
            ResponseHandler.error(res, 'Invitation system migration pending', 503, migrationStatus);
        } else {
            ResponseHandler.error(res, 'Unable to check migration status', 500, migrationStatus);
        }

    } catch (error) {
        logger.error('Invitation migration check error:', error);
        ResponseHandler.error(res, 'Migration check failed', 500, {
            error: error.message
        });
    }
});

export default router;