import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Company model - Handles company-related database operations
 */
class CompanyModel {

    /**
     * Generate a temporary RUC (since it's required but user may not have it yet)
     * Format: Temporary RUC based on timestamp and random
     * @returns {string} Generated RUC
     */
    static generateTemporaryRUC() {
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `TEMP${timestamp}${random}`; // e.g., TEMP1698123456789
    }

    /**
     * Create a new company
     * @param {Object} companyData - Company data
     * @returns {Promise<Object>} Created company
     */
    static async create({ name, ruc, address, phone, email, website, logoUrl }) {
        try {
            // If RUC is not provided, generate a temporary one
            // User can update it later
            const finalRUC = ruc || this.generateTemporaryRUC();

            const { data, error } = await database.supabase
                .from('companies')
                .insert({
                    name,
                    ruc: finalRUC,
                    address,
                    phone,
                    email,
                    website,
                    logo_url: logoUrl
                })
                .select('*')
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error(`RUC ${finalRUC} already exists`);
                }
                throw error;
            }

            logger.business('company_created', 'company', data.id, {
                name,
                ruc: finalRUC,
                isTemporary: !ruc
            });

            return data;
        } catch (error) {
            logger.error('Error creating company:', error);
            throw error;
        }
    }

    /**
     * Find company by ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object|null>} Company data or null
     */
    static async findById(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding company by ID:', error);
            throw error;
        }
    }

    /**
     * Find company by RUC
     * @param {string} ruc - Company RUC
     * @returns {Promise<Object|null>} Company data or null
     */
    static async findByRuc(ruc) {
        try {
            const { data, error } = await database.supabase
                .from('companies')
                .select('*')
                .eq('ruc', ruc)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('Error finding company by RUC:', error);
            throw error;
        }
    }

    /**
     * Update company information
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated company
     */
    static async update(companyId, updates) {
        try {
            const allowedFields = ['name', 'address', 'phone', 'email', 'website', 'logo_url'];
            const updateData = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const { data, error } = await database.supabase
                .from('companies')
                .update(updateData)
                .eq('id', companyId)
                .select('*')
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('RUC already exists');
                }
                throw error;
            }

            logger.business('company_updated', 'company', companyId, {
                updatedFields: Object.keys(updateData)
            });

            return data;
        } catch (error) {
            logger.error('Error updating company:', error);
            if (error.code === '23505') {
                throw new Error('RUC already exists');
            }
            throw error;
        }
    }

    /**
     * Get company statistics
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Company statistics
     */
    static async getStatistics(companyId) {
        try {
            // Get basic company data
            const { data: company, error: companyError } = await database.supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single();

            if (companyError) {
                throw new Error('Company not found');
            }

            // Get product statistics
            const { data: products } = await database.supabase
                .from('products')
                .select('id, stock, price')
                .eq('company_id', companyId)
                .eq('is_active', true);

            const total_products = products?.length || 0;
            const total_stock_value = (products || []).reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

            // Get sales statistics
            const { data: sales } = await database.supabase
                .from('sales')
                .select('total_amount')
                .eq('company_id', companyId);

            const total_sales = sales?.length || 0;
            const total_revenue = (sales || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);

            // Get active warranties
            const { data: warranties } = await database.supabase
                .from('warranties')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString());

            const active_warranties = warranties?.length || 0;

            // Get active services
            const { data: services } = await database.supabase
                .from('service_histories')
                .select('id')
                .eq('company_id', companyId)
                .not('status', 'in', '("delivered","cancelled")');

            const active_services = services?.length || 0;

            // Get total users
            const { data: userCompanies } = await database.supabase
                .from('user_company')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true);

            const total_users = userCompanies?.length || 0;

            return {
                ...company,
                total_products,
                total_stock_value,
                total_sales,
                total_revenue,
                active_warranties,
                active_services,
                total_users
            };
        } catch (error) {
            logger.error('Error getting company statistics:', error);
            throw error;
        }
    }

    /**
     * Get companies by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Companies user belongs to
     */
    static async getByUserId(userId) {
        try {
            const { data, error } = await database.supabase
                .from('user_company')
                .select(`
                    *,
                    companies(*)
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('joined_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Flatten the response to match expected format
            return (data || []).map(uc => ({
                ...uc.companies,
                role: uc.role,
                member_active: uc.is_active,
                joined_at: uc.joined_at
            }));
        } catch (error) {
            logger.error('Error getting companies by user ID:', error);
            throw error;
        }
    }

    /**
     * Add user to company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @param {string} role - User role in company
     * @param {string} invitedBy - User ID who sent the invitation
     * @param {string} invitationCodeUsed - Invitation code used (optional)
     * @returns {Promise<Object>} Company membership data
     */
    static async addUser(companyId, userId, role, invitedBy, invitationCodeUsed = null) {
        try {
            const { data, error } = await database.supabase
                .from('user_company')
                .upsert({
                    user_id: userId,
                    company_id: companyId,
                    role,
                    invited_by: invitedBy,
                    invitation_code_used: invitationCodeUsed,
                    is_active: true,
                    joined_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,company_id'
                })
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            logger.business('user_added_to_company', 'company', companyId, {
                userId,
                role,
                invitedBy,
                invitationCodeUsed
            });

            return data;
        } catch (error) {
            logger.error('Error adding user to company:', error);
            throw error;
        }
    }

    /**
     * Remove user from company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async removeUser(companyId, userId) {
        try {
            const { error, status } = await database.supabase
                .from('user_company')
                .update({ is_active: false })
                .eq('company_id', companyId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            if (status === 204) {
                throw new Error('User is not a member of this company');
            }

            logger.business('user_removed_from_company', 'company', companyId, {
                userId
            });

            return true;
        } catch (error) {
            logger.error('Error removing user from company:', error);
            throw error;
        }
    }

    /**
     * Update user role in company
     * @param {string} companyId - Company ID
     * @param {string} userId - User ID
     * @param {string} newRole - New role
     * @returns {Promise<Object>} Updated membership data
     */
    static async updateUserRole(companyId, userId, newRole) {
        try {
            const { data, error } = await database.supabase
                .from('user_company')
                .update({ role: newRole })
                .eq('company_id', companyId)
                .eq('user_id', userId)
                .eq('is_active', true)
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            logger.business('user_role_updated', 'company', companyId, {
                userId,
                newRole
            });

            return data;
        } catch (error) {
            logger.error('Error updating user role:', error);
            throw error;
        }
    }

    /**
     * Get company members
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} List of company members
     */    /**
     * Get company members with their details
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Company members
     */
    static async getMembers(companyId) {
        try {
            // First get user_company relationships
            const { data: userCompanyData, error: ucError } = await database.supabase
                .from('user_company')
                .select(`
                    user_id,
                    role,
                    is_active,
                    joined_at,
                    invited_by,
                    invitation_code_used
                `)
                .eq('company_id', companyId);

            if (ucError) {
                logger.error('Supabase error getting user_company:', ucError);
                throw ucError;
            }

            if (!userCompanyData || userCompanyData.length === 0) {
                return [];
            }

            // Get user details for each user
            const userIds = userCompanyData.map(uc => uc.user_id);
            const { data: usersData, error: usersError } = await database.supabase
                .from('users')
                .select('id, email, name, phone, is_active, last_login_at, created_at')
                .in('id', userIds);

            if (usersError) {
                logger.error('Supabase error getting users:', usersError);
                throw usersError;
            }

            // Get invited by names
            const invitedByIds = userCompanyData
                .map(uc => uc.invited_by)
                .filter(id => id);

            let invitersData = [];
            if (invitedByIds.length > 0) {
                const { data: inviters, error: invitersError } = await database.supabase
                    .from('users')
                    .select('id, name')
                    .in('id', invitedByIds);

                if (!invitersError) {
                    invitersData = inviters || [];
                }
            }

            // Combine the data
            const invitersMap = new Map(invitersData.map(inv => [inv.id, inv.name]));

            return userCompanyData.map(uc => {
                const user = usersData.find(u => u.id === uc.user_id);
                if (!user) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    is_active: user.is_active,
                    last_login_at: user.last_login_at,
                    user_created_at: user.created_at,
                    role: uc.role,
                    member_active: uc.is_active,
                    joined_at: uc.joined_at,
                    invited_by: uc.invited_by,
                    invited_by_name: invitersMap.get(uc.invited_by) || null
                };
            }).filter(Boolean);
        } catch (error) {
            logger.error('Error getting company members:', error);
            throw error;
        }
    }

    /**
     * Deactivate company
     * @param {string} companyId - Company ID
     * @returns {Promise<void>}
     */
    static async deactivate(companyId) {
        try {
            const { error } = await database.supabase
                .from('companies')
                .update({ 
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', companyId);

            if (error) {
                throw error;
            }

            logger.business('company_deactivated', 'company', companyId, {});
        } catch (error) {
            logger.error('Error deactivating company:', error);
            throw error;
        }
    }
}

export default CompanyModel;