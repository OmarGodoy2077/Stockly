import UserModel from '../models/user.model.js';
import CompanyModel from '../models/company.model.js';
import { jwtConfig } from '../config/jwt.js';
import { logger } from '../config/logger.js';
import { database } from '../config/database.js';

/**
 * Authentication controller - Handles user authentication and registration
 */
class AuthController {

    /**
     * Register new user and create their first company
     * POST /api/v1/auth/register
     */
    static async register(req, res) {
        const client = await database.pool.connect();
        
        try {
            const {
                email,
                password,
                name,
                phone,
                companyName,
                companyRuc,
                companyAddress,
                companyPhone,
                companyEmail,
                companyWebsite
            } = req.body;

            // Start transaction
            await client.query('BEGIN');

            // Check if email already exists
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                logger.security('registration_attempt_duplicate_email', 'low', {
                    email,
                    ip: req.ip
                });
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Check if RUC already exists
            const existingCompany = await CompanyModel.findByRuc(companyRuc);
            if (existingCompany) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'RUC already registered'
                });
            }

            // Create user
            const user = await UserModel.create({
                email,
                password,
                name,
                phone
            });

            // Create company
            const company = await CompanyModel.create({
                name: companyName,
                ruc: companyRuc,
                address: companyAddress,
                phone: companyPhone,
                email: companyEmail,
                website: companyWebsite
            });

            // Link user to company as owner
            await CompanyModel.addUser(company.id, user.id, 'owner', user.id);

            // Commit transaction
            await client.query('COMMIT');

            // Generate tokens
            const accessToken = jwtConfig.generateAccessToken({
                user_id: user.id,
                email: user.email,
                company_id: company.id,
                role: 'owner'
            });

            const refreshToken = jwtConfig.generateRefreshToken({
                user_id: user.id,
                email: user.email,
                company_id: company.id,
                role: 'owner'
            });

            // Store refresh token
            await UserModel.storeRefreshToken(user.id, refreshToken);

            logger.business('user_registered', 'user', user.id, {
                email,
                companyId: company.id,
                companyName
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone
                    },
                    company: {
                        id: company.id,
                        name: company.name,
                        ruc: company.ruc,
                        role: 'owner'
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: jwtConfig.expiresIn
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed. Please try again.'
            });
        } finally {
            client.release();
        }
    }

    /**
     * Login user
     * POST /api/v1/auth/login
     */
    static async login(req, res) {
        try {
            const { email, password, companyId } = req.body;

            // Find user by email
            const user = await UserModel.findByEmail(email);

            if (!user) {
                logger.security('login_attempt_user_not_found', 'low', {
                    email,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            // Check if user is active
            if (!user.is_active) {
                logger.security('login_attempt_inactive_user', 'medium', {
                    userId: user.id,
                    email,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Account is inactive. Please contact support.'
                });
            }

            // Verify password
            const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);

            if (!isValidPassword) {
                logger.security('login_attempt_invalid_password', 'medium', {
                    userId: user.id,
                    email,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            // Get user companies
            const companies = await UserModel.getUserCompanies(user.id);

            if (companies.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'User is not associated with any company'
                });
            }

            // Select company (use provided companyId or first company)
            let selectedCompany = companies[0];
            if (companyId) {
                const found = companies.find(c => c.id === companyId);
                if (found) {
                    selectedCompany = found;
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'You do not have access to this company'
                    });
                }
            }

            // Generate tokens
            const accessToken = jwtConfig.generateAccessToken({
                user_id: user.id,
                email: user.email,
                company_id: selectedCompany.id,
                role: selectedCompany.role
            });

            const refreshToken = jwtConfig.generateRefreshToken({
                user_id: user.id,
                email: user.email,
                company_id: selectedCompany.id,
                role: selectedCompany.role
            });

            // Store refresh token
            await UserModel.storeRefreshToken(user.id, refreshToken);

            // Update last login
            await UserModel.updateLastLogin(user.id);

            logger.auth('login_success', user.id, selectedCompany.id, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        companies: companies.map(c => ({
                            id: c.id,
                            name: c.name,
                            role: c.role,
                            ruc: c.ruc
                        }))
                    },
                    currentCompany: {
                        id: selectedCompany.id,
                        name: selectedCompany.name,
                        role: selectedCompany.role
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: jwtConfig.expiresIn
                }
            });

        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed. Please try again.'
            });
        }
    }

    /**
     * Refresh access token
     * POST /api/v1/auth/refresh
     */
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            // Verify refresh token
            const decoded = jwtConfig.verifyRefreshToken(refreshToken);

            // Check if refresh token exists in database
            const isValid = await UserModel.verifyRefreshToken(decoded.user_id, refreshToken);

            if (!isValid) {
                logger.security('invalid_refresh_token', 'medium', {
                    userId: decoded.user_id,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
            }

            // Get user data
            const user = await UserModel.findById(decoded.user_id);

            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found or inactive'
                });
            }

            // Generate new access token
            const newAccessToken = jwtConfig.generateAccessToken({
                user_id: decoded.user_id,
                email: decoded.email,
                company_id: decoded.company_id,
                role: decoded.role
            });

            logger.auth('token_refreshed', decoded.user_id, decoded.company_id, {
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: newAccessToken,
                    expiresIn: jwtConfig.expiresIn
                }
            });

        } catch (error) {
            logger.error('Token refresh error:', error);
            
            if (error.message === 'Refresh token expired') {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token expired. Please login again.'
                });
            }

            res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }
    }

    /**
     * Logout user
     * POST /api/v1/auth/logout
     */
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const userId = req.user.id;

            // Invalidate refresh token
            await UserModel.invalidateRefreshToken(userId, refreshToken);

            logger.auth('logout', userId, '', {
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            logger.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Logout failed'
            });
        }
    }

    /**
     * Get current authenticated user
     * GET /api/v1/auth/me
     */
    static async getCurrentUser(req, res) {
        try {
            const userId = req.user.id;

            // Get user with companies
            const user = await UserModel.findById(userId);
            const companies = await UserModel.getUserCompanies(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        isActive: user.is_active,
                        lastLogin: user.last_login_at,
                        createdAt: user.created_at
                    },
                    companies: companies.map(c => ({
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        ruc: c.ruc,
                        joinedAt: c.joined_at
                    }))
                }
            });

        } catch (error) {
            logger.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user information'
            });
        }
    }

    /**
     * Change password
     * POST /api/v1/auth/change-password
     */
    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            // Get user with password hash
            const user = await UserModel.findByEmail(req.user.email);

            // Verify current password
            const isValid = await UserModel.verifyPassword(currentPassword, user.password_hash);

            if (!isValid) {
                logger.security('password_change_invalid_current', 'low', {
                    userId,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Update password
            await UserModel.updatePassword(userId, newPassword);

            // Invalidate all refresh tokens for security
            await UserModel.invalidateAllRefreshTokens(userId);

            logger.security('password_changed', 'low', {
                userId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Password changed successfully. Please login again.'
            });

        } catch (error) {
            logger.error('Change password error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change password'
            });
        }
    }

    /**
     * Verify email (placeholder for future implementation)
     * POST /api/v1/auth/verify-email
     */
    static async verifyEmail(req, res) {
        res.status(501).json({
            success: false,
            error: 'Email verification not yet implemented'
        });
    }

    /**
     * Forgot password (placeholder for future implementation)
     * POST /api/v1/auth/forgot-password
     */
    static async forgotPassword(req, res) {
        res.status(501).json({
            success: false,
            error: 'Password reset not yet implemented'
        });
    }
}

export default AuthController;
