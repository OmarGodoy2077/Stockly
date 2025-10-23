import { logger } from '../config/logger.js';

/**
 * Standardized response handler utility
 * Provides consistent API response format across the application
 */
class ResponseHandler {

    /**
     * Send success response
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code (default: 200)
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            message,
            timestamp: new Date().toISOString()
        };

        if (data !== null) {
            response.data = data;
        }

        // Log successful response in development
        if (process.env.NODE_ENV === 'development') {
            logger.debug('Success response sent:', {
                statusCode,
                message,
                url: res.req?.url,
                method: res.req?.method
            });
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Send created response
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @param {string} message - Success message
     */
    static created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    /**
     * Send bad request response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    static badRequest(res, message = 'Bad request') {
        return this.error(res, message, 400);
    }

    /**
     * Send error response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code (default: 500)
     * @param {Object} details - Additional error details
     */
    static error(res, message = 'Internal server error', statusCode = 500, details = null) {
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };

        if (details && process.env.NODE_ENV === 'development') {
            response.details = details;
        }

        // Log error response
        logger.error('Error response sent:', {
            statusCode,
            message,
            url: res.req?.url,
            method: res.req?.method,
            details: details || 'No additional details'
        });

        return res.status(statusCode).json(response);
    }

    /**
     * Send validation error response
     * @param {Object} res - Express response object
     * @param {Array} errors - Array of validation errors
     * @param {string} message - Error message (default: 'Validation failed')
     */
    static validationError(res, errors, message = 'Validation failed') {
        const response = {
            success: false,
            error: message,
            validation: {
                errors,
                count: errors.length
            },
            timestamp: new Date().toISOString()
        };

        logger.warn('Validation error response sent:', {
            errorCount: errors.length,
            url: res.req?.url,
            method: res.req?.method
        });

        return res.status(400).json(response);
    }

    /**
     * Send unauthorized response
     * @param {Object} res - Express response object
     * @param {string} message - Error message (default: 'Unauthorized access')
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }

    /**
     * Send forbidden response
     * @param {Object} res - Express response object
     * @param {string} message - Error message (default: 'Access forbidden')
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403);
    }

    /**
     * Send not found response
     * @param {Object} res - Express response object
     * @param {string} resource - Resource that was not found
     * @param {string} message - Error message
     */
    static notFound(res, resource = 'Resource', message = null) {
        const defaultMessage = `${resource} not found`;
        return this.error(res, message || defaultMessage, 404);
    }

    /**
     * Send paginated response
     * @param {Object} res - Express response object
     * @param {Array} data - Paginated data
     * @param {Object} pagination - Pagination information
     * @param {string} message - Success message
     */
    static paginated(res, data, pagination, message = 'Data retrieved successfully') {
        const response = {
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasNext: pagination.hasNext,
                hasPrev: pagination.hasPrev
            },
            timestamp: new Date().toISOString()
        };

        return res.status(200).json(response);
    }

    /**
     * Send file download response
     * @param {Object} res - Express response object
     * @param {Buffer|string} fileContent - File content
     * @param {string} fileName - Name of the file
     * @param {string} mimeType - MIME type of the file
     */
    static fileDownload(res, fileContent, fileName, mimeType = 'application/octet-stream') {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        logger.business('file_download', 'system', 'unknown', {
            fileName,
            mimeType,
            size: Buffer.isBuffer(fileContent) ? fileContent.length : 'unknown'
        });

        return res.send(fileContent);
    }

    /**
     * Handle and format database errors
     * @param {Error} error - Database error
     * @returns {Object} Formatted error response
     */
    static handleDatabaseError(error) {
        // Handle specific database errors
        switch (error.code) {
            case '23505': // Unique violation
                return {
                    message: 'Duplicate entry. This record already exists.',
                    statusCode: 409,
                    details: error.detail
                };

            case '23503': // Foreign key violation
                return {
                    message: 'Referenced record does not exist.',
                    statusCode: 400,
                    details: error.detail
                };

            case '23514': // Check constraint violation
                return {
                    message: 'Invalid data provided.',
                    statusCode: 400,
                    details: error.detail
                };

            case '42P01': // Table doesn't exist
                return {
                    message: 'Database table not found.',
                    statusCode: 500,
                    details: error.message
                };

            case 'ECONNREFUSED':
                return {
                    message: 'Database connection failed.',
                    statusCode: 503,
                    details: 'Service temporarily unavailable'
                };

            default:
                return {
                    message: 'Database error occurred.',
                    statusCode: 500,
                    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
                };
        }
    }

    /**
     * Handle and format business logic errors
     * @param {Error} error - Business logic error
     * @returns {Object} Formatted error response
     */
    static handleBusinessError(error) {
        // Handle custom business errors
        if (error.message.includes('not found')) {
            return {
                message: error.message,
                statusCode: 404
            };
        }

        if (error.message.includes('already exists')) {
            return {
                message: error.message,
                statusCode: 409
            };
        }

        if (error.message.includes('insufficient stock')) {
            return {
                message: error.message,
                statusCode: 400
            };
        }

        if (error.message.includes('permission') || error.message.includes('unauthorized')) {
            return {
                message: error.message,
                statusCode: 403
            };
        }

        return {
            message: error.message,
            statusCode: 400
        };
    }

    /**
     * Create standardized error response from any error
     * @param {Object} res - Express response object
     * @param {Error} error - Error object
     * @param {string} context - Error context for logging
     */
    static handleError(res, error, context = 'unknown') {
        let formattedError;

        // Handle different types of errors
        if (error.code && error.code.startsWith('23')) {
            // PostgreSQL error
            formattedError = this.handleDatabaseError(error);
        } else if (error.message) {
            // Business logic error
            formattedError = this.handleBusinessError(error);
        } else {
            // Generic error
            formattedError = {
                message: 'An unexpected error occurred',
                statusCode: 500
            };
        }

        // Log the error with context
        logger.error(`Error in ${context}:`, {
            message: formattedError.message,
            statusCode: formattedError.statusCode,
            originalError: error.message,
            stack: error.stack
        });

        return this.error(res, formattedError.message, formattedError.statusCode);
    }
}

export default ResponseHandler;