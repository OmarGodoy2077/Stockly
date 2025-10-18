import { logger } from '../config/logger.js';

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Error handler caught error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    }

    if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced resource does not exist';
    }

    if (err.code === '22P02') { // PostgreSQL invalid input syntax
        statusCode = 400;
        message = 'Invalid input format';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal server error';
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
    logger.warn('404 Not Found:', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    res.status(404).json({
        success: false,
        error: 'Resource not found',
        path: req.originalUrl
    });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
