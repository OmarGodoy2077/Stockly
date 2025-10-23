import { database } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger.js';

/**
 * User model - Handles user-related database operations
 */
class UserModel {

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    static async create({ email, password, name, phone }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 12);

            const { data, error } = await database.supabase
                .from('users')
                .insert({
                    email,
                    password_hash: hashedPassword,
                    name,
                    phone
                })
                .select('id, email, name, phone, is_active, created_at')
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Email already exists');
                }
                throw error;
            }

            logger.business('user_created', 'user', data.id, {
                email,
                name
            });

            return data;
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User data or null
     */
    static async findByEmail(email) {
        try {
            const { data, error } = await database.supabase
                .from('users')
                .select('id, email, password_hash, name, phone, is_active, last_login_at, created_at')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Find user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User data or null
     */
    static async findById(userId) {
        try {
            const { data, error } = await database.supabase
                .from('users')
                .select('id, email, name, phone, is_active, last_login_at, created_at')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * Verify user password
     * @param {string} plainPassword - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} Password match result
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            logger.error('Error verifying password:', error);
            return false;
        }
    }

    /**
     * Update user last login
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async updateLastLogin(userId) {
        try {
            const { error } = await database.supabase
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                throw error;
            }

            logger.auth('login', userId, '', { success: true });
        } catch (error) {
            logger.error('Error updating last login:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated user
     */
    static async updateProfile(userId, updates) {
        try {
            const allowedFields = ['name', 'phone'];
            const updateData = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            updateData.updated_at = new Date().toISOString();

            const { data, error } = await database.supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select('id, email, name, phone, updated_at')
                .single();

            if (error) throw error;
            if (!data) throw new Error('User not found');

            logger.business('user_updated', 'user', userId, {
                updatedFields: Object.keys(updates)
            });

            return data;
        } catch (error) {
            logger.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            // First get user with password_hash
            const { data: user, error: getUserError } = await database.supabase
                .from('users')
                .select('id, email, password_hash')
                .eq('id', userId)
                .single();

            if (getUserError || !user) {
                throw new Error('User not found');
            }

            const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            const { error } = await database.supabase
                .from('users')
                .update({ 
                    password_hash: hashedNewPassword, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', userId);

            if (error) throw error;

            logger.security('password_changed', 'medium', {
                userId,
                email: user.email
            });

        } catch (error) {
            logger.error('Error changing password:', error);
            throw error;
        }
    }

    /**
     * Deactivate user account
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async deactivate(userId) {
        try {
            const { error } = await database.supabase
                .from('users')
                .update({ 
                    is_active: false, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', userId);

            if (error) throw error;

            logger.business('user_deactivated', 'user', userId, {});
        } catch (error) {
            logger.error('Error deactivating user:', error);
            throw error;
        }
    }

    /**
     * Get users by company with roles
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Users with their roles in the company
     */
    static async getUsersByCompany(companyId) {
        try {
            // Get user_company relationships
            const { data: userCompanies, error } = await database.supabase
                .from('user_company')
                .select(`
                    user_id,
                    role,
                    invited_by,
                    is_active,
                    joined_at,
                    users!inner (
                        id,
                        email,
                        name,
                        phone,
                        is_active,
                        last_login_at,
                        created_at
                    )
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform to expected format
            return (userCompanies || []).map(uc => ({
                id: uc.users.id,
                email: uc.users.email,
                name: uc.users.name,
                phone: uc.users.phone,
                is_active: uc.users.is_active,
                last_login_at: uc.users.last_login_at,
                created_at: uc.users.created_at,
                role: uc.role,
                invited_by: uc.invited_by,
                company_member: uc.is_active,
                joined_at: uc.joined_at
            }));
        } catch (error) {
            logger.error('Error getting users by company:', error);
            throw error;
        }
    }

    /**
     * Get user companies and roles
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Companies user belongs to with roles
     */
    static async getUserCompanies(userId) {
        try {
            const { data, error } = await database.supabase
                .from('user_company')
                .select(`
                    companies!inner (
                        id,
                        name,
                        ruc,
                        address,
                        phone,
                        email,
                        website,
                        logo_url,
                        created_at
                    ),
                    role,
                    is_active,
                    joined_at,
                    invited_by
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('joined_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Transform data to match expected format
            return data.map(item => ({
                id: item.companies.id,
                name: item.companies.name,
                ruc: item.companies.ruc,
                address: item.companies.address,
                phone: item.companies.phone,
                company_email: item.companies.email,
                website: item.companies.website,
                logo_url: item.companies.logo_url,
                created_at: item.companies.created_at,
                role: item.role,
                member_active: item.is_active,
                joined_at: item.joined_at,
                invited_by: item.invited_by
            }));
        } catch (error) {
            logger.error('Error getting user companies:', error);
            throw error;
        }
    }

    /**
     * Update user password
     * @param {string} userId - User ID
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    static async updatePassword(userId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            const { error } = await database.supabase
                .from('users')
                .update({ 
                    password_hash: hashedPassword, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', userId);

            if (error) throw error;

            logger.security('password_updated', 'medium', {
                userId
            });
        } catch (error) {
            logger.error('Error updating password:', error);
            throw error;
        }
    }

    /**
     * Store refresh token for user
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<void>}
     */
    static async storeRefreshToken(userId, refreshToken) {
        try {
            // Store in memory or database - for now we'll use a simple approach
            // In production, consider using Redis for better performance
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            const { error } = await database.supabase
                .from('refresh_tokens')
                .upsert({
                    user_id: userId,
                    token: refreshToken,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,token'
                });

            if (error) {
                throw error;
            }

            logger.auth('refresh_token_stored', userId, '', {});
        } catch (error) {
            // If table doesn't exist, just log warning
            // The tokens will still work via JWT verification
            logger.warn('Could not store refresh token (table may not exist):', error.message);
        }
    }

    /**
     * Verify refresh token
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<boolean>} Token validity
     */
    static async verifyRefreshToken(userId, refreshToken) {
        try {
            const { data, error } = await database.supabase
                .from('refresh_tokens')
                .select('*')
                .eq('user_id', userId)
                .eq('token', refreshToken)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data;
        } catch (error) {
            // If table doesn't exist, return true (rely on JWT verification only)
            logger.warn('Could not verify refresh token from database:', error.message);
            return true;
        }
    }

    /**
     * Invalidate refresh token
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<void>}
     */
    static async invalidateRefreshToken(userId, refreshToken) {
        try {
            const { error } = await database.supabase
                .from('refresh_tokens')
                .delete()
                .eq('user_id', userId)
                .eq('token', refreshToken);

            if (error) throw error;

            logger.auth('refresh_token_invalidated', userId, '', {});
        } catch (error) {
            logger.warn('Could not invalidate refresh token:', error.message);
        }
    }

    /**
     * Invalidate all refresh tokens for user
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async invalidateAllRefreshTokens(userId) {
        try {
            const { error } = await database.supabase
                .from('refresh_tokens')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            logger.auth('all_refresh_tokens_invalidated', userId, '', {});
        } catch (error) {
            logger.warn('Could not invalidate all refresh tokens:', error.message);
        }
    }

    /**
     * Activate user account
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async activate(userId) {
        try {
            const { error } = await database.supabase
                .from('users')
                .update({ 
                    is_active: true, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', userId);

            if (error) throw error;

            logger.business('user_activated', 'user', userId, {});
        } catch (error) {
            logger.error('Error activating user:', error);
            throw error;
        }
    }
}

export default UserModel;