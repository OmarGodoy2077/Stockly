import UserModel from '../models/user.model.js';
import CompanyModel from '../models/company.model.js';
import { logger } from '../config/logger.js';
import { database } from '../config/database.js';

/**
 * Company controller - Handles company management and member operations
 */
class CompanyController {

    /**
     * Create a new company
     * POST /api/v1/companies
     */
    static async createCompany(req, res) {
        const client = await database.pool.connect();
        
        try {
            const userId = req.user.id;
            const { name, ruc, address, phone, email, website } = req.body;

            // Start transaction
            await client.query('BEGIN');

            // Check if RUC already exists
            const existingCompany = await CompanyModel.findByRuc(ruc);
            if (existingCompany) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'RUC already registered'
                });
            }

            // Create company
            const company = await CompanyModel.create({
                name,
                ruc,
                address,
                phone,
                email,
                website
            });

            // Add creator as owner
            await CompanyModel.addUser(company.id, userId, 'owner', userId);

            // Commit transaction
            await client.query('COMMIT');

            logger.business('company_created', 'company', company.id, {
                name,
                ruc,
                createdBy: userId
            });

            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: {
                    id: company.id,
                    name: company.name,
                    ruc: company.ruc,
                    address: company.address,
                    phone: company.phone,
                    email: company.email,
                    website: company.website,
                    role: 'owner',
                    createdAt: company.created_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Create company error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create company'
            });
        } finally {
            client.release();
        }
    }

    /**
     * Get company by ID
     * GET /api/v1/companies/:companyId
     */
    static async getCompanyById(req, res) {
        try {
            const { companyId } = req.params;
            const userId = req.user.id;

            // Verify user has access to this company
            const companies = await UserModel.getUserCompanies(userId);
            const hasAccess = companies.some(c => c.id === companyId);

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this company'
                });
            }

            const company = await CompanyModel.findById(companyId);

            if (!company) {
                return res.status(404).json({
                    success: false,
                    error: 'Company not found'
                });
            }

            // Get user's role in this company
            const userCompany = companies.find(c => c.id === companyId);

            res.json({
                success: true,
                data: {
                    id: company.id,
                    name: company.name,
                    ruc: company.ruc,
                    address: company.address,
                    phone: company.phone,
                    email: company.email,
                    website: company.website,
                    logoUrl: company.logo_url,
                    isActive: company.is_active,
                    subscriptionTier: company.subscription_tier,
                    createdAt: company.created_at,
                    userRole: userCompany.role
                }
            });

        } catch (error) {
            logger.error('Get company error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company'
            });
        }
    }

    /**
     * Update company information
     * PUT /api/v1/companies/:companyId
     */
    static async updateCompany(req, res) {
        try {
            const { companyId } = req.params;
            const { name, address, phone, email, website, logo_url } = req.body;

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (address !== undefined) updates.address = address;
            if (phone !== undefined) updates.phone = phone;
            if (email !== undefined) updates.email = email;
            if (website !== undefined) updates.website = website;
            if (logo_url !== undefined) updates.logo_url = logo_url;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update'
                });
            }

            const updatedCompany = await CompanyModel.update(companyId, updates);

            logger.business('company_updated', 'company', companyId, {
                updates,
                updatedBy: req.user.id
            });

            res.json({
                success: true,
                message: 'Company updated successfully',
                data: {
                    id: updatedCompany.id,
                    name: updatedCompany.name,
                    ruc: updatedCompany.ruc,
                    address: updatedCompany.address,
                    phone: updatedCompany.phone,
                    email: updatedCompany.email,
                    website: updatedCompany.website,
                    logoUrl: updatedCompany.logo_url
                }
            });

        } catch (error) {
            logger.error('Update company error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update company'
            });
        }
    }

    /**
     * Get company statistics
     * GET /api/v1/companies/:companyId/statistics
     */
    static async getStatistics(req, res) {
        try {
            const { companyId } = req.params;

            const statistics = await CompanyModel.getStatistics(companyId);

            res.json({
                success: true,
                data: statistics
            });

        } catch (error) {
            logger.error('Get company statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get statistics'
            });
        }
    }

    /**
     * Get company members
     * GET /api/v1/companies/:companyId/members
     */
    static async getMembers(req, res) {
        try {
            const { companyId } = req.params;

            logger.debug('Getting members for company:', { companyId, userId: req.user?.id });

            const members = await CompanyModel.getMembers(companyId);

            logger.debug('Members retrieved:', { count: members.length });

            res.json({
                success: true,
                data: {
                    members: members.map(m => ({
                        userId: m.id,  // Use userId for consistency with Frontend
                        id: m.id,
                        email: m.email,
                        name: m.name,
                        phone: m.phone,
                        role: m.role,
                        isActive: m.is_active && m.member_active,
                        lastLogin: m.last_login_at,
                        joinedAt: m.joined_at,
                        invitedBy: m.invited_by_name
                    })),
                    total: members.length
                }
            });

        } catch (error) {
            logger.error('Get company members error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get members'
            });
        }
    }

    /**
     * Invite user to company
     * POST /api/v1/companies/:companyId/invite
     */
    static async inviteUser(req, res) {
        const client = await database.pool.connect();
        
        try {
            const { companyId } = req.params;
            const { email, role, name, phone, password } = req.body;
            const invitedBy = req.user.id;

            // Validate role
            const validRoles = ['admin', 'seller', 'inventory'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be admin, seller, or inventory'
                });
            }

            // Start transaction
            await client.query('BEGIN');

            // Check if user exists
            let user = await UserModel.findByEmail(email);

            if (user) {
                // User exists, check if already member
                const members = await CompanyModel.getMembers(companyId);
                const isMember = members.some(m => m.id === user.id);

                if (isMember) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        error: 'User is already a member of this company'
                    });
                }

                // Add existing user to company
                await CompanyModel.addUser(companyId, user.id, role, invitedBy);

            } else {
                // Create new user
                if (!name) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        error: 'Name is required for new users'
                    });
                }

                // If no password provided, generate a temporary one
                const userPassword = password || `Temp${Math.random().toString(36).slice(-8)}!`;

                user = await UserModel.create({
                    email,
                    password: userPassword,
                    name,
                    phone
                });

                // Add new user to company
                await CompanyModel.addUser(companyId, user.id, role, invitedBy);

                // TODO: Send email with credentials or invitation link
            }

            // Commit transaction
            await client.query('COMMIT');

            logger.business('user_invited_to_company', 'company', companyId, {
                userId: user.id,
                email,
                role,
                invitedBy,
                isNewUser: !password
            });

            res.status(201).json({
                success: true,
                message: 'User invited successfully',
                data: {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    role,
                    isNewUser: !password
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Invite user error:', error);
            
            if (error.message === 'Email already exists') {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to invite user'
            });
        } finally {
            client.release();
        }
    }

    /**
     * Update member role
     * PATCH /api/v1/companies/:companyId/members/:userId/role
     */
    static async updateMemberRole(req, res) {
        try {
            const { companyId, userId } = req.params;
            const { role } = req.body;
            const updatedBy = req.user.id;

            // Validate role
            const validRoles = ['admin', 'seller', 'inventory'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be admin, seller, or inventory'
                });
            }

            // Cannot change own role
            if (userId === updatedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot change your own role'
                });
            }

            // Check if user is a member
            const members = await CompanyModel.getMembers(companyId);
            const member = members.find(m => m.id === userId);

            if (!member) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not a member of this company'
                });
            }

            // Cannot change owner role
            if (member.role === 'owner') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot change owner role'
                });
            }

            await CompanyModel.updateUserRole(companyId, userId, role);

            logger.business('member_role_updated', 'company', companyId, {
                userId,
                oldRole: member.role,
                newRole: role,
                updatedBy
            });

            res.json({
                success: true,
                message: 'Role updated successfully',
                data: {
                    userId,
                    newRole: role
                }
            });

        } catch (error) {
            logger.error('Update member role error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update role'
            });
        }
    }

    /**
     * Remove member from company
     * DELETE /api/v1/companies/:companyId/members/:userId
     */
    static async removeMember(req, res) {
        try {
            const { companyId, userId } = req.params;
            const removedBy = req.user.id;

            // Cannot remove yourself
            if (userId === removedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot remove yourself from the company'
                });
            }

            // Check if user is a member
            const members = await CompanyModel.getMembers(companyId);
            const member = members.find(m => m.id === userId);

            if (!member) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not a member of this company'
                });
            }

            // Cannot remove owner
            if (member.role === 'owner') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot remove company owner'
                });
            }

            await CompanyModel.removeUser(companyId, userId);

            logger.business('member_removed', 'company', companyId, {
                userId,
                role: member.role,
                removedBy
            });

            res.json({
                success: true,
                message: 'Member removed successfully'
            });

        } catch (error) {
            logger.error('Remove member error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to remove member'
            });
        }
    }
}

export default CompanyController;
