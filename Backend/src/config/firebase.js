import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

/**
 * Firebase Admin SDK configuration for Stockly Backend
 * Handles Firebase Storage operations for file uploads
 */
class FirebaseConfig {
    constructor() {
        this.app = null;
        this.storage = null;
        this.bucket = null;

        this.initializeFirebase();
    }

    /**
     * Initialize Firebase Admin SDK
     */
    initializeFirebase() {
        try {
            // Check if already initialized
            if (admin.apps.length > 0) {
                this.app = admin.apps[0];
                this.storage = this.app.storage();
                this.bucket = this.storage.bucket();
                logger.info('Using existing Firebase app instance');
                return;
            }

            // Validate required environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

            if (!projectId || !clientEmail || !privateKey || !storageBucket) {
                throw new Error('Missing Firebase configuration. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET environment variables.');
            }

            // Initialize Firebase Admin SDK
            this.app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                }),
                storageBucket
            });

            // Initialize Storage
            this.storage = this.app.storage();
            this.bucket = this.storage.bucket();

            logger.info('Firebase Admin SDK initialized successfully', {
                projectId,
                storageBucket
            });

        } catch (error) {
            logger.error('Failed to initialize Firebase Admin SDK:', error);
            throw error;
        }
    }

    /**
     * Upload file to Firebase Storage
     * @param {string} filePath - Local file path or buffer
     * @param {string} destination - Destination path in Firebase Storage
     * @param {Object} metadata - File metadata
     * @returns {Promise<Object>} Upload result with public URL
     */
    async uploadFile(filePath, destination, metadata = {}) {
        try {
            const startTime = Date.now();

            // Create file reference
            const file = this.bucket.file(destination);

            // Upload options
            const options = {
                metadata: {
                    contentType: metadata.contentType || this.detectContentType(destination),
                    cacheControl: metadata.cacheControl || 'public, max-age=31536000',
                    ...metadata
                },
                public: true,
                validation: 'md5'
            };

            // Upload file
            await file.save(filePath, options);

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;

            const duration = Date.now() - startTime;
            logger.firebase('upload', true, duration, {
                destination,
                size: metadata.size || 'unknown',
                contentType: options.metadata.contentType
            });

            return {
                success: true,
                publicUrl,
                fileName: destination,
                bucket: this.bucket.name,
                uploadedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.firebase('upload', false, 0, {
                destination,
                error: error.message
            });
            throw new Error(`Failed to upload file to Firebase Storage: ${error.message}`);
        }
    }

    /**
     * Upload file buffer to Firebase Storage
     * @param {Buffer} buffer - File buffer
     * @param {string} destination - Destination path in Firebase Storage
     * @param {Object} metadata - File metadata
     * @returns {Promise<Object>} Upload result with public URL
     */
    async uploadBuffer(buffer, destination, metadata = {}) {
        try {
            const startTime = Date.now();

            // Create file reference
            const file = this.bucket.file(destination);

            // Upload options
            const options = {
                metadata: {
                    contentType: metadata.contentType || this.detectContentType(destination),
                    cacheControl: metadata.cacheControl || 'public, max-age=31536000',
                    ...metadata
                },
                public: true,
                validation: 'md5'
            };

            // Upload buffer
            await file.save(buffer, options);

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;

            const duration = Date.now() - startTime;
            logger.firebase('upload_buffer', true, duration, {
                destination,
                size: buffer.length,
                contentType: options.metadata.contentType
            });

            return {
                success: true,
                publicUrl,
                fileName: destination,
                bucket: this.bucket.name,
                uploadedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.firebase('upload_buffer', false, 0, {
                destination,
                error: error.message
            });
            throw new Error(`Failed to upload buffer to Firebase Storage: ${error.message}`);
        }
    }

    /**
     * Delete file from Firebase Storage
     * @param {string} filePath - File path in Firebase Storage
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteFile(filePath) {
        try {
            const startTime = Date.now();

            // Create file reference
            const file = this.bucket.file(filePath);

            // Delete file
            await file.delete();

            const duration = Date.now() - startTime;
            logger.firebase('delete', true, duration, {
                filePath
            });

            return true;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.firebase('delete', false, duration, {
                filePath,
                error: error.message
            });

            // Don't throw error if file doesn't exist
            if (error.code === 404) {
                logger.warn(`File not found for deletion: ${filePath}`);
                return false;
            }

            throw new Error(`Failed to delete file from Firebase Storage: ${error.message}`);
        }
    }

    /**
     * Get file metadata from Firebase Storage
     * @param {string} filePath - File path in Firebase Storage
     * @returns {Promise<Object>} File metadata
     */
    async getFileMetadata(filePath) {
        try {
            const startTime = Date.now();

            // Create file reference
            const file = this.bucket.file(filePath);

            // Get metadata
            const [metadata] = await file.getMetadata();

            const duration = Date.now() - startTime;
            logger.firebase('get_metadata', true, duration, {
                filePath
            });

            return metadata;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.firebase('get_metadata', false, duration, {
                filePath,
                error: error.message
            });

            throw new Error(`Failed to get file metadata from Firebase Storage: ${error.message}`);
        }
    }

    /**
     * Generate signed URL for private file access
     * @param {string} filePath - File path in Firebase Storage
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @param {string} action - Action type (read, write, delete, resumable)
     * @returns {Promise<string>} Signed URL
     */
    async generateSignedUrl(filePath, expiresIn = 3600, action = 'read') {
        try {
            const startTime = Date.now();

            // Create file reference
            const file = this.bucket.file(filePath);

            // Generate signed URL
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: action,
                expires: Date.now() + (expiresIn * 1000)
            });

            const duration = Date.now() - startTime;
            logger.firebase('generate_signed_url', true, duration, {
                filePath,
                action,
                expiresIn
            });

            return signedUrl;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.firebase('generate_signed_url', false, duration, {
                filePath,
                error: error.message
            });

            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    /**
     * List files in a directory
     * @param {string} prefix - Directory prefix
     * @param {number} maxResults - Maximum number of results
     * @returns {Promise<Array>} List of files
     */
    async listFiles(prefix = '', maxResults = 100) {
        try {
            const startTime = Date.now();

            // List files
            const [files] = await this.bucket.getFiles({
                prefix,
                maxResults
            });

            const duration = Date.now() - startTime;
            logger.firebase('list_files', true, duration, {
                prefix,
                count: files.length
            });

            return files.map(file => ({
                name: file.name,
                publicUrl: `https://storage.googleapis.com/${this.bucket.name}/${file.name}`,
                metadata: file.metadata
            }));

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.firebase('list_files', false, duration, {
                prefix,
                error: error.message
            });

            throw new Error(`Failed to list files from Firebase Storage: ${error.message}`);
        }
    }

    /**
     * Detect content type from file extension
     * @param {string} fileName - File name or path
     * @returns {string} Content type
     */
    detectContentType(fileName) {
        const ext = fileName.toLowerCase().split('.').pop();

        const contentTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
            'csv': 'text/csv'
        };

        return contentTypes[ext] || 'application/octet-stream';
    }

    /**
     * Validate file size before upload
     * @param {number} size - File size in bytes
     * @param {number} maxSize - Maximum allowed size in bytes (default: 10MB)
     * @returns {boolean} Valid size
     */
    validateFileSize(size, maxSize = 10 * 1024 * 1024) {
        return size <= maxSize;
    }

    /**
     * Validate file type before upload
     * @param {string} fileName - File name
     * @param {Array} allowedTypes - Allowed MIME types
     * @returns {boolean} Valid type
     */
    validateFileType(fileName, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
        const contentType = this.detectContentType(fileName);
        return allowedTypes.includes(contentType);
    }

    /**
     * Get storage bucket instance for advanced operations
     * @returns {Object} Firebase Storage bucket instance
     */
    getBucket() {
        return this.bucket;
    }

    /**
     * Get Firebase app instance
     * @returns {Object} Firebase app instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Health check for Firebase Storage
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            // Try to list files (this will fail if credentials are invalid)
            await this.listFiles('', 1);

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                bucket: this.bucket.name,
                projectId: this.app.options.projectId
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                bucket: this.bucket ? this.bucket.name : 'unknown'
            };
        }
    }
}

// Create and export singleton instance
const firebaseConfig = new FirebaseConfig();

export { firebaseConfig as default, FirebaseConfig };
export { firebaseConfig };