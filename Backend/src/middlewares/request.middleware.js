import { logger } from '../config/logger.js';

/**
 * Request logging middleware
 * Logs all incoming requests
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.http(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        companyId: req.user?.companyId
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        logger.http(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userId: req.user?.id,
            companyId: req.user?.companyId
        });
    });

    next();
};

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracking
 */
export const requestId = (req, res, next) => {
    const requestId = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};

/**
 * Request timing middleware
 * Adds timing information to response headers
 */
export const requestTiming = (req, res, next) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
        const diff = process.hrtime(startTime);
        const time = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds
        res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
    });

    next();
};

/**
 * Body size limiter
 * Rejects requests with body size exceeding the limit
 */
export const bodySizeLimiter = (maxSize = 10 * 1024 * 1024) => { // 10MB default
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || 0);

        if (contentLength > maxSize) {
            logger.security('request_body_too_large', 'low', {
                ip: req.ip,
                url: req.url,
                contentLength,
                maxSize
            });

            return res.status(413).json({
                success: false,
                error: 'Request body too large',
                maxSize: `${maxSize / 1024 / 1024}MB`
            });
        }

        next();
    };
};
