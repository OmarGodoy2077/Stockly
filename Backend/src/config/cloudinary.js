import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

/**
 * Cloudinary configuration for Stockly Backend
 * Handles image storage with automatic optimization and transformations
 */
class CloudinaryConfig {
    constructor() {
        this.initialized = false;
        this.cloudName = null;
        this.initializeCloudinary();
    }

    /**
     * Initialize Cloudinary SDK
     */
    initializeCloudinary() {
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                throw new Error('Missing Cloudinary configuration. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
            }

            // Configure Cloudinary
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
                secure: true
            });

            this.cloudName = cloudName;
            this.initialized = true;

            logger.info('Cloudinary SDK initialized successfully', {
                cloudName,
                secure: true
            });

        } catch (error) {
            logger.error('Failed to initialize Cloudinary SDK:', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Upload image buffer to Cloudinary with optimizations
     * @param {Buffer} buffer - Image buffer
     * @param {string} path - Upload path/folder
     * @param {Object} options - Additional upload options
     * @returns {Promise<Object>} Upload result
     */
    async uploadBuffer(buffer, path, options = {}) {
        if (!this.initialized) {
            throw new Error('Cloudinary is not initialized');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: path,
                    resource_type: 'image',
                    format: 'webp', // Auto-convert to WebP for better compression
                    transformation: [
                        {
                            quality: 'auto:good', // Automatic quality optimization
                            fetch_format: 'auto'  // Automatic format selection
                        }
                    ],
                    ...options
                },
                (error, result) => {
                    if (error) {
                        logger.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve({
                            publicUrl: result.secure_url,
                            publicId: result.public_id,
                            format: result.format,
                            width: result.width,
                            height: result.height,
                            bytes: result.bytes,
                            uploadedAt: result.created_at
                        });
                    }
                }
            );

            uploadStream.end(buffer);
        });
    }

    /**
     * Delete image from Cloudinary
     * @param {string} publicId - Public ID of the image
     * @returns {Promise<Object>} Deletion result
     */
    async deleteImage(publicId) {
        if (!this.initialized) {
            throw new Error('Cloudinary is not initialized');
        }

        try {
            const result = await cloudinary.uploader.destroy(publicId);
            
            logger.info('Image deleted from Cloudinary', {
                publicId,
                result: result.result
            });

            return {
                success: result.result === 'ok',
                publicId
            };
        } catch (error) {
            logger.error('Failed to delete image from Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Delete multiple images from Cloudinary
     * @param {Array<string>} publicIds - Array of public IDs
     * @returns {Promise<Object>} Deletion results
     */
    async deleteImages(publicIds) {
        if (!this.initialized) {
            throw new Error('Cloudinary is not initialized');
        }

        try {
            const result = await cloudinary.api.delete_resources(publicIds);
            
            logger.info('Multiple images deleted from Cloudinary', {
                count: publicIds.length,
                deleted: Object.keys(result.deleted).length
            });

            return {
                success: true,
                deleted: result.deleted,
                deletedCount: Object.keys(result.deleted).length
            };
        } catch (error) {
            logger.error('Failed to delete multiple images from Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Get optimized image URL with transformations
     * @param {string} publicId - Public ID of the image
     * @param {Object} transformations - Cloudinary transformations
     * @returns {string} Optimized image URL
     */
    getOptimizedUrl(publicId, transformations = {}) {
        if (!this.initialized) {
            throw new Error('Cloudinary is not initialized');
        }

        return cloudinary.url(publicId, {
            secure: true,
            quality: 'auto:good',
            fetch_format: 'auto',
            ...transformations
        });
    }

    /**
     * Generate thumbnail URL
     * @param {string} publicId - Public ID of the image
     * @param {number} width - Thumbnail width
     * @param {number} height - Thumbnail height
     * @returns {string} Thumbnail URL
     */
    getThumbnailUrl(publicId, width = 200, height = 200) {
        return this.getOptimizedUrl(publicId, {
            width,
            height,
            crop: 'fill',
            gravity: 'auto'
        });
    }

    /**
     * Health check for Cloudinary connection
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            if (!this.initialized) {
                return {
                    status: 'unhealthy',
                    message: 'Cloudinary not initialized',
                    timestamp: new Date().toISOString()
                };
            }

            // Try to ping Cloudinary API
            await cloudinary.api.ping();

            return {
                status: 'healthy',
                service: 'cloudinary',
                cloudName: this.cloudName,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Cloudinary health check failed:', error);
            return {
                status: 'unhealthy',
                service: 'cloudinary',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get upload statistics (optional, requires admin API access)
     * @returns {Promise<Object>} Usage statistics
     */
    async getUsageStats() {
        try {
            const usage = await cloudinary.api.usage();
            
            return {
                resources: usage.resources,
                bandwidth: usage.bandwidth,
                storage: usage.storage,
                requests: usage.requests,
                plan: usage.plan,
                lastUpdated: usage.last_updated
            };
        } catch (error) {
            logger.error('Failed to get Cloudinary usage stats:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const cloudinaryConfig = new CloudinaryConfig();
export { cloudinary };
