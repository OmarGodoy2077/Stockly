import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

/**
 * JWT Configuration and utilities
 */
class JWTConfig {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.refreshSecret = process.env.JWT_REFRESH_SECRET;
        this.expiresIn = process.env.JWT_EXPIRES_IN || '15m';
        this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        this.validateSecrets();
    }

    /**
     * Validate JWT secrets are configured
     */
    validateSecrets() {
        if (!this.secret) {
            throw new Error('JWT_SECRET environment variable is required');
        }

        if (!this.refreshSecret) {
            throw new Error('JWT_REFRESH_SECRET environment variable is required');
        }

        if (this.secret === this.refreshSecret) {
            logger.warn('JWT_SECRET and JWT_REFRESH_SECRET should be different for security');
        }

        // Check secret strength
        if (this.secret.length < 32) {
            logger.warn('JWT_SECRET should be at least 32 characters long for security');
        }

        if (this.refreshSecret.length < 32) {
            logger.warn('JWT_REFRESH_SECRET should be at least 32 characters long for security');
        }
    }

    /**
     * Generate access token
     * @param {Object} payload - Token payload
     * @param {Object} options - Additional options
     * @returns {string} JWT token
     */
    generateAccessToken(payload, options = {}) {
        try {
            const tokenPayload = {
                type: 'access',
                iat: Math.floor(Date.now() / 1000),
                ...payload
            };

            return jwt.sign(tokenPayload, this.secret, {
                expiresIn: this.expiresIn,
                issuer: 'stockly-backend',
                audience: 'stockly-frontend',
                ...options
            });
        } catch (error) {
            logger.error('Error generating access token:', error);
            throw new Error('Failed to generate access token');
        }
    }

    /**
     * Generate refresh token
     * @param {Object} payload - Token payload
     * @param {Object} options - Additional options
     * @returns {string} JWT refresh token
     */
    generateRefreshToken(payload, options = {}) {
        try {
            const tokenPayload = {
                type: 'refresh',
                iat: Math.floor(Date.now() / 1000),
                ...payload
            };

            return jwt.sign(tokenPayload, this.refreshSecret, {
                expiresIn: this.refreshExpiresIn,
                issuer: 'stockly-backend',
                audience: 'stockly-frontend',
                ...options
            });
        } catch (error) {
            logger.error('Error generating refresh token:', error);
            throw new Error('Failed to generate refresh token');
        }
    }

    /**
     * Verify access token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: 'stockly-backend',
                audience: 'stockly-frontend'
            });

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Access token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid access token');
            } else {
                logger.error('Access token verification error:', error);
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * Verify refresh token
     * @param {string} token - JWT refresh token to verify
     * @returns {Object} Decoded token payload
     */
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshSecret, {
                issuer: 'stockly-backend',
                audience: 'stockly-frontend'
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Refresh token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid refresh token');
            } else {
                logger.error('Refresh token verification error:', error);
                throw new Error('Refresh token verification failed');
            }
        }
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token - JWT token
     * @returns {Object} Decoded payload
     */
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            logger.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Extract token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Extracted token or null
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }

    /**
     * Generate token pair (access + refresh)
     * @param {Object} payload - Base payload for tokens
     * @returns {Object} Object with accessToken and refreshToken
     */
    generateTokenPair(payload) {
        try {
            const tokenPayload = {
                user_id: payload.user_id,
                email: payload.email,
                company_id: payload.company_id,
                role: payload.role
            };

            return {
                accessToken: this.generateAccessToken(tokenPayload),
                refreshToken: this.generateRefreshToken(tokenPayload),
                expiresIn: this.expiresIn,
                refreshExpiresIn: this.refreshExpiresIn
            };
        } catch (error) {
            logger.error('Error generating token pair:', error);
            throw new Error('Failed to generate token pair');
        }
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refreshToken - Valid refresh token
     * @returns {Object} New token pair
     */
    refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = this.verifyRefreshToken(refreshToken);

            // Generate new token pair
            return this.generateTokenPair({
                user_id: decoded.user_id,
                email: decoded.email,
                company_id: decoded.company_id,
                role: decoded.role
            });
        } catch (error) {
            logger.error('Error refreshing access token:', error);
            throw error;
        }
    }

    /**
     * Get token expiration time
     * @param {string} token - JWT token
     * @returns {Date|null} Expiration date or null if invalid
     */
    getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);

            if (!decoded || !decoded.exp) {
                return null;
            }

            return new Date(decoded.exp * 1000);
        } catch (error) {
            logger.error('Error getting token expiration:', error);
            return null;
        }
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} True if expired, false otherwise
     */
    isTokenExpired(token) {
        const expiration = this.getTokenExpiration(token);

        if (!expiration) {
            return true;
        }

        return expiration < new Date();
    }

    /**
     * Get time until token expires
     * @param {string} token - JWT token
     * @returns {Object} Time remaining or null if invalid/expired
     */
    getTimeUntilExpiration(token) {
        const expiration = this.getTokenExpiration(token);

        if (!expiration) {
            return null;
        }

        const now = new Date();
        const timeRemaining = expiration.getTime() - now.getTime();

        if (timeRemaining <= 0) {
            return null;
        }

        return {
            milliseconds: timeRemaining,
            seconds: Math.floor(timeRemaining / 1000),
            minutes: Math.floor(timeRemaining / (1000 * 60)),
            hours: Math.floor(timeRemaining / (1000 * 60 * 60)),
            days: Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
        };
    }
}

// Create and export singleton instance
const jwtConfig = new JWTConfig();

export { jwtConfig as default, JWTConfig };
export { jwtConfig };