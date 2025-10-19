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
