import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Invitation model - Handles invitation code management for company onboarding
 */
class InvitationModel {

    /**
     * Create a new invitation code
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID creating the invitation (owner)
     * @param {string} role - Role to assign to invited user
     * @returns {Promise<Object>} Created invitation with code
     */
    static async create(companyId, userId, role = 'employee') {
        try {
            // Call RPC function to generate unique code
            const { data: code, error: rpcError } = await database.supabase
                .rpc('generate_invitation_code');

            if (rpcError) {
                logger.error('Failed to call generate_invitation_code RPC', rpcError);
                throw new Error('Failed to generate invitation code');
            }

            if (!code) {
                throw new Error('No code returned from generate_invitation_code function');
            }

            const { data: invitation, error: insertError } = await database.supabase
                .from('invitations')
                .insert({
                    company_id: companyId,
                    code,
                    role,
                    created_by: userId,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                    is_active: true
                })
                .select('id, company_id, code, role, created_by, created_at, expires_at, is_active')
                .single();

            if (insertError) {
                throw insertError;
            }

            logger.business('invitation_created', 'company', companyId, {
                code,
                role,
                createdBy: userId
            });

            return invitation;
        } catch (error) {
            logger.error('Error creating invitation:', error);
            throw error;
        }
    }

    /**
     * Validate invitation code
     * @param {string} code - Invitation code
     * @returns {Promise<Object|null>} Invitation data if valid, null otherwise
     */
    static async validate(code) {
        try {
            const { data, error } = await database.supabase
                .rpc('validate_invitation', { p_code: code });

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return null;
            }

            const result = data[0];

            if (!result.is_valid) {
                logger.warn('Invalid invitation attempt', {
                    code,
                    reason: result.error_message
                });
                return null;
            }

            return {
                id: result.invitation_id,
                company_id: result.company_id,
                company_name: result.company_name,
                role: result.role
            };
        } catch (error) {
            logger.error('Error validating invitation:', error);
            throw error;
        }
    }

    /**
     * Get invitation by code
     * @param {string} code - Invitation code
     * @returns {Promise<Object|null>} Invitation data
     */
    static async findByCode(code) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .select('id, company_id, code, role, created_by, created_at, expires_at, is_active')
                .eq('code', code)
                .eq('is_active', true)
                .gt('expires_at', 'now()')
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding invitation by code:', error);
            throw error;
        }
    }

    /**
     * Get invitations by company
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Array of invitations
     */
    static async findByCompany(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .select(`
                    id, 
                    company_id, 
                    code, 
                    role, 
                    created_by,
                    users!created_by(id, name, email),
                    created_at, 
                    expires_at, 
                    is_active,
                    (SELECT COUNT(*) FROM user_company WHERE invitation_code_used = code)::int as times_used
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error finding invitations by company:', error);
            throw error;
        }
    }

    /**
     * Deactivate invitation code
     * @param {string} code - Invitation code
     * @returns {Promise<Object>} Updated invitation
     */
    static async deactivate(code) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .update({ is_active: false })
                .eq('code', code)
                .select('id, code, is_active')
                .single();

            if (error) {
                throw error;
            }

            logger.business('invitation_deactivated', 'system', null, {
                code
            });

            return data;
        } catch (error) {
            logger.error('Error deactivating invitation:', error);
            throw error;
        }
    }

    /**
     * Get active invitations by company
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Array of active invitations
     */
    static async getActive(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .select(`
                    id, 
                    company_id, 
                    code, 
                    role, 
                    created_by,
                    users!created_by(id, name, email),
                    created_at, 
                    expires_at, 
                    is_active
                `)
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gt('expires_at', 'now()')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error getting active invitations:', error);
            throw error;
        }
    }

    /**
     * Clean up expired invitations (should be called periodically)
     * @returns {Promise<number>} Number of cleaned up invitations
     */
    static async cleanupExpired() {
        try {
            const { data, error } = await database.supabase
                .rpc('cleanup_expired_invitations');

            if (error) {
                throw error;
            }

            const count = data && data[0] ? data[0].cleaned_count : 0;

            logger.info('Cleaned up expired invitations', { count });

            return count;
        } catch (error) {
            logger.error('Error cleaning up expired invitations:', error);
            throw error;
        }
    }

    /**
     * Check if user has already used an invitation to join this company
     * @param {string} userId - User ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} True if user already joined this company
     */
    static async hasUserJoinedCompany(userId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('user_company')
                .select('id')
                .eq('user_id', userId)
                .eq('company_id', companyId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            logger.error('Error checking if user joined company:', error);
            throw error;
        }
    }

    /**
     * Find invitation by ID
     * @param {string} id - Invitation ID
     * @returns {Promise<Object|null>} Invitation data or null
     */
    static async findById(id) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .select('id, company_id, code, role, created_by, created_at, expires_at, is_active')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding invitation by ID:', error);
            throw error;
        }
    }

    /**
     * Deactivate invitation by ID
     * @param {string} id - Invitation ID
     * @returns {Promise<Object>} Updated invitation
     */
    static async deactivateById(id) {
        try {
            const { data, error } = await database.supabase
                .from('invitations')
                .update({ is_active: false })
                .eq('id', id)
                .select('id, company_id, code, is_active');

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('Invitation not found');
            }

            logger.business('invitation_deactivated', 'invitation', id, {
                deactivatedAt: new Date().toISOString()
            });

            return data[0];
        } catch (error) {
            logger.error('Error deactivating invitation by ID:', error);
            throw error;
        }
    }
}

export default InvitationModel;
