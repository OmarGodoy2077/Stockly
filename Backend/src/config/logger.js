import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Winston logger configuration for Stockly Backend
 * Provides structured logging for development and production
 */
class Logger {
    constructor() {
        this.logger = null;
        this.logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
        this.logDir = path.join(__dirname, '../../logs');

        // Initialize logger synchronously first
        this.initializeLoggerSync();

        // Then handle async parts if needed
        this.initializeAsyncParts();
    }

    /**
     * Initialize Winston logger with appropriate configuration (synchronous part)
     */
    initializeLoggerSync() {
        // Define log format
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({
                stack: true
            }),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

                // Add metadata if present
                if (Object.keys(meta).length > 0) {
                    log += ` | ${JSON.stringify(meta)}`;
                }

                // Add stack trace for errors
                if (stack) {
                    log += `\n${stack}`;
                }

                return log;
            })
        );

        // Define transports
        const transports = [];

        // Console transport (always present)
        transports.push(
            new winston.transports.Console({
                level: this.logLevel,
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        let log = `${timestamp} [${level}]: ${message}`;

                        // Add metadata for development
                        if (process.env.NODE_ENV === 'development' && Object.keys(meta).length > 0) {
                            log += ` | ${JSON.stringify(meta)}`;
                        }

                        return log;
                    })
                ),
                handleExceptions: true,
                handleRejections: true
            })
        );

        // File transports (only in production or if explicitly enabled)
        if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
            // Ensure logs directory exists
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }

            // Combined log file
            transports.push(
                new winston.transports.File({
                    filename: path.join(this.logDir, 'combined.log'),
                    level: 'info',
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                })
            );

            // Error log file
            transports.push(
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 10,
                    tailable: true,
                    handleExceptions: true,
                    handleRejections: true
                })
            );

            // Access log file for HTTP requests
            transports.push(
                new winston.transports.File({
                    filename: path.join(this.logDir, 'access.log'),
                    level: 'http',
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                })
            );
        }

        // Create logger instance
        this.logger = winston.createLogger({
            level: this.logLevel,
            format: logFormat,
            transports,
            exitOnError: false,
            // Handle uncaught exceptions and unhandled rejections
            exceptionHandlers: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'exceptions.log')
                })
            ],
            rejectionHandlers: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'rejections.log')
                })
            ]
        });

        // Override console methods in development for better formatting
        if (process.env.NODE_ENV === 'development') {
            this.logger.info('Logger initialized in development mode');
        } else {
            this.logger.info('Logger initialized in production mode');
        }
    }

    /**
     * Handle async initialization parts
     */
    async initializeAsyncParts() {
        // Any async initialization can go here if needed in the future
        // For now, this is just a placeholder
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    /**
     * Log HTTP request (for middleware)
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {number} statusCode - Response status code
     * @param {number} duration - Request duration in ms
     * @param {string} ip - Client IP address
     */
    http(method, url, statusCode, duration, ip) {
        this.logger.http(`${method} ${url} ${statusCode} ${duration}ms`, {
            method,
            url,
            statusCode,
            duration,
            ip,
            category: 'http'
        });
    }

    /**
     * Log database operation
     * @param {string} operation - Database operation type
     * @param {string} table - Table name
     * @param {number} duration - Operation duration in ms
     * @param {Object} meta - Additional metadata
     */
    database(operation, table, duration, meta = {}) {
        this.logger.debug(`DB ${operation} on ${table}`, {
            operation,
            table,
            duration,
            category: 'database',
            ...meta
        });
    }

    /**
     * Log authentication event
     * @param {string} event - Authentication event type
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @param {Object} meta - Additional metadata
     */
    auth(event, userId, email, meta = {}) {
        this.logger.info(`Auth: ${event}`, {
            event,
            userId,
            email,
            category: 'auth',
            ...meta
        });
    }

    /**
     * Log business event (sales, purchases, etc.)
     * @param {string} event - Business event type
     * @param {string} entity - Entity type
     * @param {string} entityId - Entity ID
     * @param {Object} meta - Additional metadata
     */
    business(event, entity, entityId, meta = {}) {
        this.logger.info(`Business: ${event} on ${entity}`, {
            event,
            entity,
            entityId,
            category: 'business',
            ...meta
        });
    }

    /**
     * Log security event
     * @param {string} event - Security event type
     * @param {string} severity - Security severity level
     * @param {Object} meta - Additional metadata
     */
    security(event, severity = 'medium', meta = {}) {
        this.logger.warn(`Security: ${event}`, {
            event,
            severity,
            category: 'security',
            ...meta
        });
    }

    /**
     * Log OCR operation
     * @param {string} operation - OCR operation type
     * @param {boolean} success - Operation success
     * @param {number} duration - Operation duration in ms
     * @param {Object} meta - Additional metadata
     */
    ocr(operation, success, duration, meta = {}) {
        const level = success ? 'info' : 'warn';
        this.logger.log(level, `OCR ${operation}: ${success ? 'success' : 'failed'}`, {
            operation,
            success,
            duration,
            category: 'ocr',
            ...meta
        });
    }

    /**
     * Log Cloudinary operation
     * @param {string} operation - Cloudinary operation type
     * @param {boolean} success - Operation success
     * @param {number} duration - Operation duration in ms
     * @param {Object} meta - Additional metadata
     */
    cloudinary(operation, success, duration, meta = {}) {
        const level = success ? 'info' : 'error';
        this.logger.log(level, `Cloudinary ${operation}: ${success ? 'success' : 'failed'}`, {
            operation,
            success,
            duration,
            category: 'cloudinary',
            ...meta
        });
    }

    /**
     * Create child logger for specific modules
     * @param {string} module - Module name
     * @returns {Object} Child logger instance
     */
    child(module) {
        return {
            info: (message, meta = {}) => this.info(`[${module}] ${message}`, { module, ...meta }),
            error: (message, meta = {}) => this.error(`[${module}] ${message}`, { module, ...meta }),
            warn: (message, meta = {}) => this.warn(`[${module}] ${message}`, { module, ...meta }),
            debug: (message, meta = {}) => this.debug(`[${module}] ${message}`, { module, ...meta })
        };
    }

    /**
     * Get logger instance for direct use
     * @returns {Object} Winston logger instance
     */
    getLogger() {
        return this.logger;
    }

    /**
     * Set log level dynamically
     * @param {string} level - Log level (error, warn, info, debug)
     */
    setLevel(level) {
        this.logLevel = level;
        this.logger.level = level;
        this.logger.info(`Log level changed to: ${level}`);
    }

    /**
     * Profile a code block (development only)
     * @param {string} label - Profile label
     * @returns {Function} Function to call when profiling ends
     */
    startProfile(label) {
        if (process.env.NODE_ENV !== 'development') {
            return () => {};
        }

        this.logger.profile(label);
        return () => {
            this.logger.profile(label);
        };
    }
}

// Create and export singleton instance
const logger = new Logger();

export { logger as default, Logger };
export { logger };