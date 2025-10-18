import { logger } from '../config/logger.js';

/**
 * Generic validation middleware using Zod schemas
 * @param {Object} schema - Zod validation schema
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 * @returns {Function} Middleware function
 */
export const validate = (schema, source = 'body') => {
    return async (req, res, next) => {
        try {
            let dataToValidate;

            switch (source) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                default:
                    dataToValidate = req.body;
            }

            // Validate data against schema
            const validatedData = await schema.parseAsync(dataToValidate);

            // Replace original data with validated data
            switch (source) {
                case 'body':
                    req.body = validatedData;
                    break;
                case 'query':
                    req.query = validatedData;
                    break;
                case 'params':
                    req.params = validatedData;
                    break;
            }

            // Add validation info to request for debugging
            req.validation = {
                source,
                schema: schema._def?.description || 'unknown',
                validatedAt: new Date().toISOString()
            };

            logger.debug('Data validation successful:', {
                source,
                url: req.url,
                method: req.method
            });

            next();

        } catch (error) {
            logger.warn('Data validation failed:', {
                source,
                url: req.url,
                method: req.method,
                errors: error.errors || error.message
            });

            if (error.errors) {
                // Zod validation errors
                const validationErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    value: err.input
                }));

                return res.status(400).json({
                    error: 'Validation failed',
                    source,
                    details: validationErrors
                });
            }

            // Other validation errors
            res.status(400).json({
                error: 'Validation failed',
                message: error.message,
                source
            });
        }
    };
};

/**
 * Validate file upload
 * @param {Object} options - Validation options
 * @returns {Function} Middleware function
 */
export const validateFileUpload = (options = {}) => {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        required = false
    } = options;

    return (req, res, next) => {
        try {
            const files = req.files || [];

            // Check if file is required
            if (required && (!files || files.length === 0)) {
                return res.status(400).json({
                    error: 'File upload is required'
                });
            }

            if (files && files.length > 0) {
                // Validate each file
                for (const file of files) {
                    // Check file size
                    if (file.size > maxSize) {
                        return res.status(400).json({
                            error: `File size too large. Maximum allowed: ${Math.round(maxSize / 1024 / 1024)}MB`,
                            fileName: file.name,
                            fileSize: file.size
                        });
                    }

                    // Check file type
                    if (!allowedTypes.includes(file.mimetype)) {
                        return res.status(400).json({
                            error: 'File type not allowed',
                            fileName: file.name,
                            fileType: file.mimetype,
                            allowedTypes
                        });
                    }
                }

                // Attach file validation info
                req.fileValidation = {
                    fileCount: files.length,
                    maxSize,
                    allowedTypes,
                    validatedAt: new Date().toISOString()
                };
            }

            next();

        } catch (error) {
            logger.error('File validation middleware error:', error);
            res.status(500).json({
                error: 'File validation error'
            });
        }
    };
};

/**
 * Sanitize input data
 * @param {Array} fields - Fields to sanitize
 * @returns {Function} Middleware function
 */
export const sanitizeInput = (fields) => {
    return (req, res, next) => {
        try {
            const sanitizeString = (str) => {
                if (typeof str !== 'string') return str;

                return str
                    .trim()
                    .replace(/[<>]/g, '') // Remove potential HTML tags
                    .replace(/javascript:/gi, '') // Remove javascript: protocol
                    .replace(/on\w+=/gi, '') // Remove event handlers
                    .slice(0, 1000); // Limit length
            };

            fields.forEach(field => {
                if (req.body[field]) {
                    req.body[field] = sanitizeString(req.body[field]);
                }
                if (req.query[field]) {
                    req.query[field] = sanitizeString(req.query[field]);
                }
            });

            next();

        } catch (error) {
            logger.error('Input sanitization error:', error);
            res.status(500).json({
                error: 'Input sanitization error'
            });
        }
    };
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Valid UUID
 */
export const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Validate UUID parameter middleware
 * @param {string} paramName - Parameter name to validate
 * @returns {Function} Middleware function
 */
export const validateUUID = (paramName) => {
    return (req, res, next) => {
        try {
            const uuid = req.params[paramName] || req.body[paramName] || req.query[paramName];

            if (!uuid) {
                return res.status(400).json({
                    error: `Missing required parameter: ${paramName}`
                });
            }

            if (!isValidUUID(uuid)) {
                return res.status(400).json({
                    error: `Invalid UUID format for parameter: ${paramName}`,
                    value: uuid
                });
            }

            next();

        } catch (error) {
            logger.error('UUID validation middleware error:', error);
            res.status(500).json({
                error: 'UUID validation error'
            });
        }
    };
};