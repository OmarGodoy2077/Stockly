import UserModel from '../models/user.model.js';
import CompanyModel from '../models/company.model.js';
import { jwtConfig } from '../config/jwt.js';
import { logger } from '../config/logger.js';
import { database } from '../config/database.js';

/**
 * User controller - Handles user profile and management operations
 */
class UserController {

    /**
     * Get current user profile
     * GET /api/v1/users/profile
     */
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;

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
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    isActive: user.is_active,
                    lastLogin: user.last_login_at,
                    createdAt: user.created_at,
                    companies: companies.map(c => ({
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        joinedAt: c.joined_at
                    }))
                }
            });

        } catch (error) {
            logger.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get profile'
            });
        }
    }

    /**
     * Update current user profile
     * PUT /api/v1/users/profile
     */
    static async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { name, phone } = req.body;

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (phone !== undefined) updates.phone = phone;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update'
                });
            }

            const updatedUser = await UserModel.updateProfile(userId, updates);

            logger.business('user_profile_updated', 'user', userId, updates);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    phone: updatedUser.phone
                }
            });

        } catch (error) {
            logger.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }

    /**
     * Get all companies the user belongs to
     * GET /api/v1/users/companies
     */
    static async getUserCompanies(req, res) {
        try {
            const userId = req.user.id;

            const companies = await UserModel.getUserCompanies(userId);

            res.json({
                success: true,
                data: {
                    companies: companies.map(c => ({
                        id: c.id,
                        name: c.name,
                        ruc: c.ruc,
                        address: c.address,
                        phone: c.phone,
                        email: c.company_email,
                        role: c.role,
                        joinedAt: c.joined_at,
                        isActive: c.member_active
                    })),
                    total: companies.length
                }
            });

        } catch (error) {
            logger.error('Get user companies error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get companies'
            });
        }
    }

    /**
     * Switch to a different company context
     * POST /api/v1/users/switch-company/:companyId
     */
    static async switchCompany(req, res) {
        try {
            const userId = req.user.id;
            const { companyId } = req.params;

            // Verify user has access to this company
            const companies = await UserModel.getUserCompanies(userId);
            const targetCompany = companies.find(c => c.id === companyId);

            if (!targetCompany) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this company'
                });
            }

            // Generate new tokens with the new company context
            const user = await UserModel.findById(userId);

            const accessToken = jwtConfig.generateAccessToken({
                user_id: user.id,
                email: user.email,
                company_id: targetCompany.id,
                role: targetCompany.role
            });

            const refreshToken = jwtConfig.generateRefreshToken({
                user_id: user.id,
                email: user.email,
                company_id: targetCompany.id,
                role: targetCompany.role
            });

            // Store new refresh token
            await UserModel.storeRefreshToken(user.id, refreshToken);

            logger.business('company_switched', 'user', userId, {
                fromCompany: req.user.companyId,
                toCompany: companyId
            });

            res.json({
                success: true,
                message: 'Company switched successfully',
                data: {
                    company: {
                        id: targetCompany.id,
                        name: targetCompany.name,
                        role: targetCompany.role
                    },
                    accessToken,
                    refreshToken,
                    expiresIn: jwtConfig.expiresIn
                }
            });

        } catch (error) {
            logger.error('Switch company error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to switch company'
            });
        }
    }

    /**
     * Get all users in the company (admin only)
     * GET /api/v1/users
     */
    static async getCompanyUsers(req, res) {
        try {
            const companyId = req.companyId;
            const { page = 1, limit = 20, role, search } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT
                    u.id,
                    u.email,
                    u.name,
                    u.phone,
                    u.is_active,
                    u.last_login_at,
                    u.created_at,
                    uc.role,
                    uc.is_active as company_member_active,
                    uc.joined_at,
                    uc.invited_by,
                    inviter.name as invited_by_name
                FROM users u
                INNER JOIN user_company uc ON u.id = uc.user_id
                LEFT JOIN users inviter ON uc.invited_by = inviter.id
                WHERE uc.company_id = $1
            `;

            const params = [companyId];
            let paramCount = 2;

            if (role) {
                query += ` AND uc.role = $${paramCount}`;
                params.push(role);
                paramCount++;
            }

            if (search) {
                query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
                params.push(`%${search}%`);
                paramCount++;
            }

            // Get total count
            const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
            const countResult = await database.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            // Add pagination
            query += ` ORDER BY uc.joined_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(parseInt(limit), offset);

            const result = await database.query(query, params);

            res.json({
                success: true,
                data: {
                    users: result.rows.map(user => ({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        isActive: user.is_active,
                        role: user.role,
                        lastLogin: user.last_login_at,
                        joinedAt: user.joined_at,
                        invitedBy: user.invited_by_name
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Get company users error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get users'
            });
        }
    }

    /**
     * Get specific user details (admin only)
     * GET /api/v1/users/:userId
     */
    static async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const companyId = req.companyId;

            // Verify user belongs to this company
            const query = `
                SELECT
                    u.id,
                    u.email,
                    u.name,
                    u.phone,
                    u.is_active,
                    u.last_login_at,
                    u.created_at,
                    uc.role,
                    uc.is_active as company_member_active,
                    uc.joined_at,
                    uc.invited_by,
                    inviter.name as invited_by_name
                FROM users u
                INNER JOIN user_company uc ON u.id = uc.user_id
                LEFT JOIN users inviter ON uc.invited_by = inviter.id
                WHERE u.id = $1 AND uc.company_id = $2
            `;

            const result = await database.query(query, [userId, companyId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found in this company'
                });
            }

            const user = result.rows[0];

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    isActive: user.is_active,
                    role: user.role,
                    lastLogin: user.last_login_at,
                    joinedAt: user.joined_at,
                    invitedBy: user.invited_by_name,
                    createdAt: user.created_at
                }
            });

        } catch (error) {
            logger.error('Get user by ID error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user'
            });
        }
    }

    /**
     * Deactivate user account (admin only)
     * POST /api/v1/users/:userId/deactivate
     */
    static async deactivateUser(req, res) {
        try {
            const { userId } = req.params;
            const adminUserId = req.user.id;

            if (userId === adminUserId) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot deactivate your own account'
                });
            }

            await UserModel.deactivate(userId);

            logger.business('user_deactivated', 'user', userId, {
                by: adminUserId
            });

            res.json({
                success: true,
                message: 'User deactivated successfully'
            });

        } catch (error) {
            logger.error('Deactivate user error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to deactivate user'
            });
        }
    }

    /**
     * Activate user account (admin only)
     * POST /api/v1/users/:userId/activate
     */
    static async activateUser(req, res) {
        try {
            const { userId } = req.params;
            const adminUserId = req.user.id;

            await UserModel.activate(userId);

            logger.business('user_activated', 'user', userId, {
                by: adminUserId
            });

            res.json({
                success: true,
                message: 'User activated successfully'
            });

        } catch (error) {
            logger.error('Activate user error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to activate user'
            });
        }
    }
}

export default UserController;
