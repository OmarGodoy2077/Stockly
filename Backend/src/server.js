import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import configurations
import { database } from './config/database.js';
import { logger } from './config/logger.js';
import { cloudinaryConfig } from './config/cloudinary.js';
import { tesseractConfig } from './config/tesseract.js';

// Import middlewares
import { errorHandler } from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/request.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import companyRoutes from './routes/company.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import saleRoutes from './routes/sale.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import warrantyRoutes from './routes/warranty.routes.js';
import serviceRoutes from './routes/service.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import reportRoutes from './routes/report.routes.js';
import healthRoutes from './routes/health.routes.js';

// Load environment variables
dotenv.config();

/**
 * Stockly Backend Server - Main application file
 * SaaS para gestión de inventario con ventas, garantías y servicio técnico
 */
class StocklyServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.server = null;

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupGracefulShutdown();
    }

    /**
     * Configure Express middleware
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'self'"], // Cambiar de 'none' a 'self' para permitir iframes del mismo origen
                    frameAncestors: ["'self'", "http://localhost:3000", "http://localhost:5173", "https://stockly-frontend.vercel.app", "https://stockly-production.web.app"],
                },
            },
            crossOriginEmbedderPolicy: false
        }));

        // CORS configuration - Secure for production
        const corsOptions = {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);

                const allowedOrigins = [
                    // Development
                    'http://localhost:3000',
                    'http://localhost:5173',
                    'http://localhost:3001',
                    'http://127.0.0.1:5173',
                    // Environment variable (for custom domains)
                    process.env.CORS_ORIGIN,
                    // Railway production
                    'https://stockly-frontend-prod.railway.app',
                    'https://stockly-backend.railway.app',
                    // Vercel (if deployed there)
                    'https://stockly-frontend.vercel.app',
                    // Firebase (if deployed there)
                    'https://stockly-production.web.app'
                ].filter(Boolean); // Remove undefined values

                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('CORS blocked request from origin:', { origin, allowedOrigins });
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            maxAge: 86400 // 24 hours
        };

        this.app.use(cors(corsOptions));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.security('rate_limit_exceeded', 'medium', {
                    ip: req.ip,
                    url: req.url,
                    userAgent: req.get('User-Agent')
                });
                res.status(429).json({
                    error: 'Too many requests from this IP, please try again later.',
                    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
                });
            }
        });

        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));

        this.app.use(express.urlencoded({
            extended: true,
            limit: '10mb'
        }));

        // Request logging middleware
        this.app.use(requestLogger);

        // Health check endpoint (before authentication)
        this.app.use('/api/health', healthRoutes);

        logger.info('Middleware configured successfully');
    }

    /**
     * Configure API routes
     */
    setupRoutes() {
        // API versioning
        this.app.use('/api/v1', (req, res, next) => {
            req.apiVersion = 'v1';
            next();
        });

        // Mount route handlers
        this.app.use('/api/v1/auth', authRoutes);
        this.app.use('/api/v1/users', userRoutes);
        this.app.use('/api/v1/companies', companyRoutes);
        this.app.use('/api/v1/invitations', invitationRoutes);
        this.app.use('/api/v1/products', productRoutes);
        this.app.use('/api/v1/categories', categoryRoutes);
        this.app.use('/api/v1/sales', saleRoutes);
        this.app.use('/api/v1/purchases', purchaseRoutes);
        this.app.use('/api/v1/invoices', invoiceRoutes);
        this.app.use('/api/v1/warranties', warrantyRoutes);
        this.app.use('/api/v1/services', serviceRoutes);
        this.app.use('/api/v1/suppliers', supplierRoutes);
        this.app.use('/api/v1/reports', reportRoutes);

        // API root endpoint
        this.app.get('/api/v1', (req, res) => {
            res.json({
                success: true,
                message: 'Stockly Backend API v1',
                version: '1.0.0',
                documentation: '/api/v1/docs',
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler for API routes
        this.app.use('/api/v1/*', (req, res) => {
            res.status(404).json({
                error: 'API endpoint not found',
                path: req.originalUrl,
                method: req.method,
                availableEndpoints: {
                    auth: '/api/v1/auth',
                    users: '/api/v1/users',
                    companies: '/api/v1/companies',
                    products: '/api/v1/products',
                    categories: '/api/v1/categories',
                    sales: '/api/v1/sales',
                    purchases: '/api/v1/purchases',
                    invoices: '/api/v1/invoices',
                    warranties: '/api/v1/warranties',
                    services: '/api/v1/services',
                    suppliers: '/api/v1/suppliers'
                }
            });
        });

        logger.info('Routes configured successfully');
    }

    /**
     * Configure error handling middleware
     */
    setupErrorHandling() {
        // Global error handler (must be last)
        this.app.use(errorHandler);

        logger.info('Error handling configured successfully');
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}. Starting graceful shutdown...`);

            // Stop accepting new connections
            if (this.server) {
                this.server.close(async () => {
                    logger.info('HTTP server closed');

                    try {
                        // Close database connections
                        await database.close();

                        // Terminate OCR worker
                        await tesseractConfig.terminate();

                        logger.info('Graceful shutdown completed');
                        process.exit(0);

                    } catch (error) {
                        logger.error('Error during graceful shutdown:', error);
                        process.exit(1);
                    }
                });
            } else {
                logger.info('Server not started yet, shutting down immediately');
                process.exit(0);
            }

            // Force close after 30 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };

        // Handle different termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            shutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
        });
    }

    /**
     * Initialize services and start server
     */
    async start() {
        try {
            logger.info('Starting Stockly Backend Server...');

            // Initialize database connection
            await database.connect();

            // Test Cloudinary connection (wrapped in try-catch to prevent uncaught exceptions)
            try {
                const cloudinaryHealth = await cloudinaryConfig.healthCheck();
                if (cloudinaryHealth.status !== 'healthy') {
                    logger.warn('Cloudinary health check failed:', cloudinaryHealth);
                }
            } catch (error) {
                logger.warn('Cloudinary health check threw an error:', error);
            }

            // Test OCR functionality (wrapped in try-catch to prevent uncaught exceptions)
            // Skip on startup to save memory - will initialize on first use
            if (process.env.NODE_ENV === 'development') {
                try {
                    const ocrHealth = await tesseractConfig.healthCheck();
                    if (ocrHealth.status !== 'healthy') {
                        logger.warn('OCR health check failed:', ocrHealth);
                    }
                } catch (error) {
                    logger.warn('OCR health check threw an error:', error);
                }
            } else {
                logger.info('Skipping OCR initialization on startup (will initialize on first use)');
            }

            // Start HTTP server
            this.server = this.app.listen(this.port, () => {
                logger.info('Stockly Backend Server started successfully', {
                    port: this.port,
                    environment: process.env.NODE_ENV || 'development',
                    nodeVersion: process.version,
                    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
                });

                // Log available endpoints
                logger.info('Available API endpoints:', {
                    baseUrl: `http://localhost:${this.port}/api/v1`,
                    health: `http://localhost:${this.port}/api/health`,
                    auth: `http://localhost:${this.port}/api/v1/auth`,
                    products: `http://localhost:${this.port}/api/v1/products`,
                    sales: `http://localhost:${this.port}/api/v1/sales`,
                    warranties: `http://localhost:${this.port}/api/v1/warranties`,
                    services: `http://localhost:${this.port}/api/v1/services`
                });
            });

        } catch (error) {
            logger.error('Failed to start Stockly Backend Server:', error);
            process.exit(1);
        }
    }

    /**
     * Get Express application instance
     * @returns {Object} Express app
     */
    getApp() {
        return this.app;
    }

    /**
     * Get server instance
     * @returns {Object} HTTP server instance
     */
    getServer() {
        return this.server;
    }
}

// Create and export server instance
const server = new StocklyServer();

// Handle module loading
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    // Start server if this file is run directly
    server.start().catch(error => {
        logger.error('Server startup failed:', error);
        process.exit(1);
    });
}

export default server;
export { StocklyServer };