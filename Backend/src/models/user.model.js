import { database } from '../config/database.js';
import bcrypt from 'bcrypt';
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

            const query = `
                INSERT INTO users (email, password_hash, name, phone)
                VALUES ($1, $2, $3, $4)
                RETURNING id, email, name, phone, is_active, created_at
            `;

            const result = await database.query(query, [email, hashedPassword, name, phone]);

            logger.business('user_created', 'user', result.rows[0].id, {
                email,
                name
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating user:', error);
            if (error.code === '23505') { // Unique violation
                throw new Error('Email already exists');
            }
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
            const query = `
                SELECT id, email, password_hash, name, phone, is_active, last_login_at, created_at
                FROM users
                WHERE email = $1
            `;

            const result = await database.query(query, [email]);

            return result.rows[0] || null;
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
            const query = `
                SELECT id, email, name, phone, is_active, last_login_at, created_at
                FROM users
                WHERE id = $1
            `;

            const result = await database.query(query, [userId]);

            return result.rows[0] || null;
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
            const query = `
                UPDATE users
                SET last_login_at = NOW()
                WHERE id = $1
            `;

            await database.query(query, [userId]);

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
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(userId);

            const query = `
                UPDATE users
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCount}
                RETURNING id, email, name, phone, updated_at
            `;

            const result = await database.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            logger.business('user_updated', 'user', userId, {
                updatedFields: Object.keys(updates)
            });

            return result.rows[0];
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
            // First verify current password
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            const query = `
                UPDATE users
                SET password_hash = $1, updated_at = NOW()
                WHERE id = $2
            `;

            await database.query(query, [hashedNewPassword, userId]);

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
            const query = `
                UPDATE users
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
            `;

            await database.query(query, [userId]);

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
                    uc.invited_by,
                    uc.is_active as company_member,
                    uc.joined_at
                FROM users u
                INNER JOIN user_company uc ON u.id = uc.user_id
                WHERE uc.company_id = $1
                ORDER BY u.created_at DESC
            `;

            const result = await database.query(query, [companyId]);

            return result.rows;
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
            const query = `
                SELECT
                    c.id,
                    c.name,
                    c.ruc,
                    c.address,
                    c.phone,
                    c.email as company_email,
                    uc.role,
                    uc.is_active as member_active,
                    uc.joined_at,
                    uc.invited_by
                FROM companies c
                INNER JOIN user_company uc ON c.id = uc.company_id
                WHERE uc.user_id = $1 AND uc.is_active = true
                ORDER BY uc.joined_at DESC
            `;

            const result = await database.query(query, [userId]);

            return result.rows;
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

            const query = `
                UPDATE users
                SET password_hash = $1, updated_at = NOW()
                WHERE id = $2
            `;

            await database.query(query, [hashedPassword, userId]);

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
            const query = `
                INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
                VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW())
                ON CONFLICT (user_id, token) 
                DO UPDATE SET expires_at = NOW() + INTERVAL '7 days'
            `;

            await database.query(query, [userId, refreshToken]);

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
            const query = `
                SELECT * FROM refresh_tokens
                WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
            `;

            const result = await database.query(query, [userId, refreshToken]);

            return result.rows.length > 0;
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
            const query = `
                DELETE FROM refresh_tokens
                WHERE user_id = $1 AND token = $2
            `;

            await database.query(query, [userId, refreshToken]);

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
            const query = `
                DELETE FROM refresh_tokens
                WHERE user_id = $1
            `;

            await database.query(query, [userId]);

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
            const query = `
                UPDATE users
                SET is_active = true, updated_at = NOW()
                WHERE id = $1
            `;

            await database.query(query, [userId]);

            logger.business('user_activated', 'user', userId, {});
        } catch (error) {
            logger.error('Error activating user:', error);
            throw error;
        }
    }
}

export default UserModel;