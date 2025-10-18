import { jwtConfig } from '../config/jwt.js';
import { logger } from '../config/logger.js';
import UserModel from '../models/user.model.js';

/**
 * Authentication middleware - Verifies JWT tokens
 */
export const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            logger.security('missing_auth_header', 'low', {
                ip: req.ip,
                url: req.url,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        // Extract token from header
        const token = jwtConfig.extractTokenFromHeader(authHeader);

        if (!token) {
            logger.security('invalid_auth_header_format', 'low', {
                ip: req.ip,
                url: req.url,
                authHeader: authHeader.substring(0, 20) + '...'
            });

            return res.status(401).json({
                error: 'Access denied. Invalid token format.'
            });
        }

        // Verify token
        const decoded = jwtConfig.verifyAccessToken(token);

        // Get user data
        const user = await UserModel.findById(decoded.user_id);

        if (!user) {
            logger.security('user_not_found', 'medium', {
                ip: req.ip,
                url: req.url,
                userId: decoded.user_id
            });

            return res.status(401).json({
                error: 'Access denied. User not found.'
            });
        }

        if (!user.is_active) {
            logger.security('inactive_user_attempt', 'medium', {
                ip: req.ip,
                url: req.url,
                userId: decoded.user_id,
                email: user.email
            });

            return res.status(401).json({
                error: 'Access denied. Account is inactive.'
            });
        }

        // Attach user data to request
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            isActive: user.is_active
        };

        req.token = {
            accessToken: token,
            expiresAt: jwtConfig.getTokenExpiration(token),
            decoded
        };

        logger.http(req.method, req.url, 200, 0, req.ip);

        next();

    } catch (error) {
        logger.security('auth_middleware_error', 'medium', {
            error: error.message,
            ip: req.ip,
            url: req.url
        });

        if (error.message === 'Access token expired') {
            return res.status(401).json({
                error: 'Access token expired. Please refresh your token.'
            });
        }

        if (error.message === 'Invalid access token') {
            return res.status(401).json({
                error: 'Access denied. Invalid token.'
            });
        }

        res.status(500).json({
            error: 'Authentication error. Please try again.'
        });
    }
};

/**
 * Optional authentication middleware - Doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            // No token provided, continue without user data
            req.user = null;
            req.token = null;
            return next();
        }

        // Extract token from header
        const token = jwtConfig.extractTokenFromHeader(authHeader);

        if (!token) {
            // Invalid token format, continue without user data
            req.user = null;
            req.token = null;
            return next();
        }

        // Verify token
        const decoded = jwtConfig.verifyAccessToken(token);

        // Get user data
        const user = await UserModel.findById(decoded.user_id);

        if (user && user.is_active) {
            // Valid user found, attach data
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                isActive: user.is_active
            };

            req.token = {
                accessToken: token,
                expiresAt: jwtConfig.getTokenExpiration(token),
                decoded
            };
        } else {
            // User not found or inactive, continue without user data
            req.user = null;
            req.token = null;
        }

        next();

    } catch (error) {
        // Log error but don't fail the request
        logger.warn('Optional auth error:', {
            error: error.message,
            ip: req.ip,
            url: req.url
        });

        req.user = null;
        req.token = null;
        next();
    }
};

/**
 * Extract user from token without full authentication
 * Useful for logging and tracking purposes
 */
export const extractUserFromToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = jwtConfig.extractTokenFromHeader(authHeader);

            if (token) {
                try {
                    const decoded = jwtConfig.verifyAccessToken(token);
                    req.userFromToken = {
                        id: decoded.user_id,
                        email: decoded.email,
                        companyId: decoded.company_id,
                        role: decoded.role
                    };
                } catch (error) {
                    // Token invalid, but don't fail request
                    req.userFromToken = null;
                }
            }
        }

        next();
    } catch (error) {
        // Don't fail request for this middleware
        req.userFromToken = null;
        next();
    }
};