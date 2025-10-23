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

            // Build Supabase query
            let dbQuery = database.supabase
                .from('user_company')
                .select(`
                    user_id,
                    role,
                    is_active,
                    joined_at,
                    invited_by,
                    users!user_id(id, email, name, phone, is_active, last_login_at),
                    inviter:users!invited_by(name)
                `)
                .eq('company_id', companyId)
                .order('joined_at', { ascending: false });

            // Apply filters
            if (role) {
                dbQuery = dbQuery.eq('role', role);
            }

            if (search) {
                // Note: Supabase REST API has limited text search capabilities
                // This is a workaround using client-side filtering for now
                // For production, consider using full-text search functions
                dbQuery = dbQuery.or(`users.name.ilike.%${search}%,users.email.ilike.%${search}%`);
            }

            // Get total count
            const { count } = await dbQuery.select('id', { count: 'exact', head: true });
            const total = count || 0;

            // Add pagination
            dbQuery = dbQuery
                .range(offset, offset + parseInt(limit) - 1);

            const { data, error } = await dbQuery;

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                data: {
                    users: (data || []).map(uc => ({
                        id: uc.users?.id,
                        email: uc.users?.email,
                        name: uc.users?.name,
                        phone: uc.users?.phone,
                        isActive: uc.users?.is_active,
                        role: uc.role,
                        lastLogin: uc.users?.last_login_at,
                        joinedAt: uc.joined_at,
                        invitedBy: uc.inviter?.name || null
                    })).filter(user => user.id), // Filter out users without valid user data
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

            // Verify user belongs to this company using Supabase REST API
            const { data: userCompanyData, error: ucError } = await database.supabase
                .from('user_company')
                .select(`
                    user_id,
                    role,
                    is_active,
                    joined_at,
                    users!user_id(id, email, name, phone, is_active, last_login_at, created_at),
                    inviter:users!invited_by(name)
                `)
                .eq('user_id', userId)
                .eq('company_id', companyId)
                .single();

            if (ucError || !userCompanyData) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found in this company'
                });
            }

            const user = userCompanyData.users;

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    isActive: user.is_active,
                    role: userCompanyData.role,
                    lastLogin: user.last_login_at,
                    joinedAt: userCompanyData.joined_at,
                    invitedBy: userCompanyData.inviter?.name || null,
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
