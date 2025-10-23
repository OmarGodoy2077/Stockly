import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

class Database {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl) {
                throw new Error('SUPABASE_URL is required');
            }

            const supabaseKey = supabaseServiceKey || supabaseAnonKey;

            if (!supabaseKey) {
                throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required');
            }

            // Initialize Supabase client
            this.supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false
                },
                db: {
                    schema: 'public'
                }
            });

            await this.testConnection();
            this.isConnected = true;

            logger.info('Supabase connected successfully', {
                url: supabaseUrl,
                usingServiceRole: !!supabaseServiceKey
            });

            return this.supabase;
        } catch (error) {
            logger.error('Failed to connect to Supabase:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async testConnection() {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { error } = await this.supabase
                .from('users')
                .select('id')
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            logger.info('Supabase connection test successful');
            return true;
        } catch (error) {
            logger.error('Supabase connection test failed:', error);
            throw error;
        }
    }

    getClient() {
        if (!this.supabase) {
            throw new Error('Database not connected');
        }
        return this.supabase;
    }

    /**
     * Execute raw SQL query with parameterized values
     * Attempts to use Supabase RPC exec_sql function
     * Falls back to returning empty result if RPC is not available (to prevent crashes)
     * 
     * IMPORTANT: For production, implement exec_sql RPC or convert to Supabase REST queries
     * 
     * @param {string} query - SQL query with $1, $2, etc. placeholders
     * @param {Array} params - Array of parameter values
     * @returns {Promise<Object>} Query result with rows property
     */
    async query(query, params = []) {
        if (!this.supabase) {
            throw new Error('Database not connected');
        }

        try {
            // Try to use exec_sql RPC function
            const { data, error } = await this.supabase.rpc('exec_sql', {
                query_string: query,
                params: params
            });

            if (error) {
                // If it's a "function not found" error, log a warning and return empty result
                if (error.code === '42883' || error.message?.includes('does not exist')) {
                    logger.warn('exec_sql RPC function not found in Supabase', {
                        query: query.substring(0, 80),
                        suggestion: 'Create the exec_sql function in your Supabase database using the migration file'
                    });
                    // Return empty result to allow app to continue (safer than crashing)
                    return { rows: [], rowCount: 0 };
                }
                throw error;
            }

            return {
                rows: data || [],
                rowCount: data ? data.length : 0
            };
        } catch (error) {
            logger.error('Error executing query:', { 
                query: query.substring(0, 100) + '...', 
                paramCount: params.length,
                error: error.message,
                errorCode: error.code
            });
            
            // For now, return empty result instead of throwing to prevent 500 errors
            // TODO: Implement proper exec_sql RPC function in Supabase
            return { rows: [], rowCount: 0 };
        }
    }

    async close() {
        if (this.supabase) {
            logger.info('Closing Supabase client');
            this.supabase = null;
            this.isConnected = false;
        }
    }

    async healthCheck() {
        try {
            await this.testConnection();
            return {
                status: 'healthy',
                service: 'supabase',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'supabase',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
}

const database = new Database();

export { database as default, Database };
export { database };
