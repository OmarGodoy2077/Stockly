import pkg from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger.js';

const { Pool } = pkg;

// Load environment variables
dotenv.config();

/**
 * Database connection pool configuration
 * Compatible with Supabase PostgreSQL
 */
class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    /**
     * Initialize database connection pool
     */
    async connect() {
        try {
            const connectionString = process.env.DATABASE_URL;

            if (!connectionString) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            // Configure pool for production and development
            this.pool = new Pool({
                connectionString,
                // SSL configuration for production (Railway/Supabase)
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

                // Connection pool settings
                max: 20, // Maximum number of connections
                min: 2,  // Minimum number of connections
                idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
                connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established

                // Query settings
                statement_timeout: 60000, // 60 seconds
                query_timeout: 60000,

                // Logging (only in development)
                ...(process.env.NODE_ENV === 'development' && {
                    log: (messages) => {
                        if (messages.length > 0 && messages[0].includes('error')) {
                            logger.error('Database pool error:', messages);
                        }
                    }
                })
            });

            // Test the connection
            await this.testConnection();

            // Set up error handling
            this.pool.on('error', (err) => {
                logger.error('Unexpected error on idle client:', err);
                this.isConnected = false;
            });

            // Set up connection event
            this.pool.on('connect', () => {
                this.isConnected = true;
                if (process.env.NODE_ENV === 'development') {
                    logger.info('New database client connected');
                }
            });

            // Set up remove event
            this.pool.on('remove', () => {
                if (process.env.NODE_ENV === 'development') {
                    logger.info('Database client removed from pool');
                }
            });

            logger.info('Database connected successfully');
            return this.pool;

        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    /**
     * Test database connection
     */
    async testConnection() {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }

        const client = await this.pool.connect();

        try {
            const result = await client.query('SELECT NOW() as current_time, version() as version');
            logger.info('Database connection test successful:', {
                time: result.rows[0].current_time,
                version: result.rows[0].version
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Database connection test failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a query with parameters
     * @param {string} text - SQL query text
     * @param {Array} params - Query parameters
     * @returns {Promise} Query result
     */
    async query(text, params = []) {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }

        const start = Date.now();
        const client = await this.pool.connect();

        try {
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            // Log slow queries in development
            if (process.env.NODE_ENV === 'development' && duration > 1000) {
                logger.warn('Slow query detected:', {
                    text,
                    params,
                    duration: `${duration}ms`
                });
            }

            return result;
        } catch (error) {
            logger.error('Query execution error:', {
                text,
                params,
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Function that receives client and executes queries
     * @returns {Promise} Transaction result
     */
    async transaction(callback) {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await callback(client);

            await client.query('COMMIT');

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Transaction error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        if (!this.pool) {
            return null;
        }

        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            isConnected: this.isConnected
        };
    }

    /**
     * Close all connections in the pool
     */
    async close() {
        if (this.pool) {
            logger.info('Closing database pool...');
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            logger.info('Database pool closed');
        }
    }

    /**
     * Health check for load balancer
     */
    async healthCheck() {
        try {
            await this.testConnection();
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                pool: this.getPoolStats()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                pool: this.getPoolStats()
            };
        }
    }
}

// Create and export singleton instance
const database = new Database();

export { database as default, Database };
export { database };