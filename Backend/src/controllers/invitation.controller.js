import InvitationModel from '../models/invitation.model.js';
import CompanyModel from '../models/company.model.js';
import UserModel from '../models/user.model.js';
import { logger } from '../config/logger.js';

/**
 * Invitation controller - Handles company invitation codes
 */
class InvitationController {

    /**
     * Create a new invitation code
     * POST /api/v1/invitations
     * 
     * Solo owners pueden crear invitaciones
     * Vigencia: 24 horas
     */
    static async createInvitation(req, res) {
        try {
            const userId = req.user.id;
            const { companyId, role } = req.body;

            // Validate companyId is provided
            if (!companyId) {
                logger.warn('Company ID is required', { userId });
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }

            // Validate role is provided
            if (!role) {
                logger.warn('Role is required', { userId, companyId });
                return res.status(400).json({
                    success: false,
                    error: 'Role is required'
                });
            }

            // Verify user is owner of the company
            const userCompanies = await UserModel.getUserCompanies(userId);
            
            if (!userCompanies || userCompanies.length === 0) {
                logger.security('no_companies_for_user', 'medium', {
                    userId,
                    companyId,
                    ip: req.ip
                });
                return res.status(403).json({
                    success: false,
                    error: 'User has no companies'
                });
            }

            const isOwner = userCompanies.some(
                uc => uc.id === companyId && uc.role === 'owner'
            );

            if (!isOwner) {
                logger.security('unauthorized_invitation_create', 'medium', {
                    userId,
                    companyId,
                    userCompanies: userCompanies.map(uc => ({ id: uc.id, role: uc.role })),
                    ip: req.ip
                });
                return res.status(403).json({
                    success: false,
                    error: 'Only company owners can create invitations'
                });
            }

            // Validate role
            const validRoles = ['admin', 'seller', 'inventory', 'employee'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be: ' + validRoles.join(', ')
                });
            }

            logger.debug('Creating invitation', { userId, companyId, role });

            // Create invitation
            const invitation = await InvitationModel.create(companyId, userId, role);

            logger.business('invitation_created', 'company', companyId, {
                invitationCode: invitation.code,
                role,
                createdBy: userId
            });

            res.status(201).json({
                success: true,
                message: 'Invitation code created successfully',
                data: {
                    code: invitation.code,
                    role,
                    expiresAt: invitation.expires_at,
                    createdAt: invitation.created_at
                }
            });

        } catch (error) {
            logger.error('Error creating invitation:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create invitation code'
            });
        }
    }

    /**
     * Get invitations for a company
     * GET /api/v1/invitations?companyId={companyId}
     * 
     * Solo owners pueden ver las invitaciones
     */
    static async getInvitations(req, res) {
        try {
            const userId = req.user.id;
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }

            // Verify user is owner of the company
            const userCompanies = await UserModel.getUserCompanies(userId);
            const isOwner = userCompanies.some(
                uc => uc.id === companyId && uc.role === 'owner'
            );

            if (!isOwner) {
                logger.security('unauthorized_invitation_view', 'medium', {
                    userId,
                    companyId,
                    ip: req.ip
                });
                return res.status(403).json({
                    success: false,
                    error: 'Only company owners can view invitations'
                });
            }

            // Get active invitations
            const invitations = await InvitationModel.getActive(companyId);

            res.json({
                success: true,
                data: invitations.map(inv => ({
                    id: inv.id,
                    code: inv.code,
                    role: inv.role,
                    createdBy: inv.users ? {
                        id: inv.users.id,
                        name: inv.users.name,
                        email: inv.users.email
                    } : null,
                    createdAt: inv.created_at,
                    expiresAt: inv.expires_at,
                    isActive: inv.is_active
                }))
            });

        } catch (error) {
            logger.error('Error getting invitations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get invitations'
            });
        }
    }

    /**
     * Validate invitation code (public endpoint)
     * GET /api/v1/invitations/validate/{code}
     * 
     * Sin autenticación requerida
     */
    static async validateInvitation(req, res) {
        try {
            const { code } = req.params;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation code is required'
                });
            }

            const invitation = await InvitationModel.validate(code);

            if (!invitation) {
                return res.status(404).json({
                    success: false,
                    error: 'Invalid or expired invitation code'
                });
            }

            res.json({
                success: true,
                data: {
                    companyId: invitation.company_id,
                    companyName: invitation.company_name,
                    role: invitation.role
                }
            });

        } catch (error) {
            logger.error('Error validating invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to validate invitation'
            });
        }
    }

    /**
     * Deactivate invitation code
     * DELETE /api/v1/invitations/{code}
     * 
     * Solo owners pueden deactivar invitaciones
     */
    static async deactivateInvitation(req, res) {
        try {
            const userId = req.user.id;
            const { code } = req.params;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation code is required'
                });
            }

            // Get invitation to verify ownership
            const invitation = await InvitationModel.findByCode(code);
            if (!invitation) {
                return res.status(404).json({
                    success: false,
                    error: 'Invitation not found'
                });
            }

            // Verify user is owner of the company
            const userCompanies = await UserModel.getUserCompanies(userId);
            const isOwner = userCompanies.some(
                uc => uc.id === invitation.company_id && uc.role === 'owner'
            );

            if (!isOwner) {
                logger.security('unauthorized_invitation_deactivate', 'medium', {
                    userId,
                    code,
                    ip: req.ip
                });
                return res.status(403).json({
                    success: false,
                    error: 'Only company owners can deactivate invitations'
                });
            }

            // Deactivate invitation
            await InvitationModel.deactivate(code);

            logger.business('invitation_deactivated', 'company', invitation.company_id, {
                code,
                deactivatedBy: userId
            });

            res.json({
                success: true,
                message: 'Invitation code deactivated successfully'
            });

        } catch (error) {
            logger.error('Error deactivating invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to deactivate invitation'
            });
        }
    }

    /**
     * Get all invitations created by a company (admin view)
     * GET /api/v1/companies/{companyId}/invitations
     */
    static async getCompanyInvitations(req, res) {
        try {
            const userId = req.user.id;
            const { companyId } = req.params;

            // Verify user is owner of the company
            const userCompanies = await UserModel.getUserCompanies(userId);
            const isOwner = userCompanies.some(
                uc => uc.id === companyId && uc.role === 'owner'
            );

            if (!isOwner) {
                logger.security('unauthorized_company_invitations_view', 'medium', {
                    userId,
                    companyId,
                    ip: req.ip
                });
                return res.status(403).json({
                    success: false,
                    error: 'Only company owners can view company invitations'
                });
            }

            // Get all invitations (active and inactive)
            const invitations = await InvitationModel.findByCompany(companyId);

            res.json({
                success: true,
                data: {
                    total: invitations.length,
                    invitations: invitations.map(inv => ({
                        id: inv.id,
                        code: inv.code,
                        role: inv.role,
                        createdBy: inv.users ? {
                            id: inv.users.id,
                            name: inv.users.name,
                            email: inv.users.email
                        } : null,
                        createdAt: inv.created_at,
                        expiresAt: inv.expires_at,
                        isActive: inv.is_active,
                        timesUsed: inv.times_used || 0
                    }))
                }
            });

        } catch (error) {
            logger.error('Error getting company invitations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company invitations'
            });
        }
    }
}

export default InvitationController;
