import { firebaseConfig } from '../config/firebase.js';
import { logger } from '../config/logger.js';

/**
 * Firebase Storage Service - Handles file uploads and management
 */
class FirebaseStorageService {

    /**
     * Upload image for product
     * @param {Buffer} imageBuffer - Image buffer
     * @param {string} fileName - Original file name
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Upload result
     */
    static async uploadProductImage(imageBuffer, fileName, metadata = {}) {
        try {
            // Validate file
            const validation = await this.validateImageFile(imageBuffer, fileName);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExtension = this.getFileExtension(sanitizedFileName);
            const uniqueFileName = `products/${timestamp}_${sanitizedFileName}`;

            // Upload to Firebase Storage
            const uploadResult = await firebaseConfig.uploadBuffer(
                imageBuffer,
                uniqueFileName,
                {
                    contentType: validation.mimeType,
                    cacheControl: 'public, max-age=31536000', // 1 year
                    ...metadata
                }
            );

            logger.firebase('product_image_upload', true, 0, {
                fileName: uniqueFileName,
                originalName: fileName,
                size: imageBuffer.length
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                fileName: uniqueFileName,
                originalName: fileName,
                size: imageBuffer.length,
                uploadedAt: uploadResult.uploadedAt
            };

        } catch (error) {
            logger.firebase('product_image_upload', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload image for service history
     * @param {Buffer} imageBuffer - Image buffer
     * @param {string} fileName - Original file name
     * @param {string} serialNumber - Serial number for folder organization
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Upload result
     */
    static async uploadServiceImage(imageBuffer, fileName, serialNumber, metadata = {}) {
        try {
            // Validate file
            const validation = await this.validateImageFile(imageBuffer, fileName);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Generate unique filename with serial number folder
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExtension = this.getFileExtension(sanitizedFileName);
            const uniqueFileName = `services/${serialNumber}/${timestamp}_${sanitizedFileName}`;

            // Upload to Firebase Storage
            const uploadResult = await firebaseConfig.uploadBuffer(
                imageBuffer,
                uniqueFileName,
                {
                    contentType: validation.mimeType,
                    cacheControl: 'public, max-age=31536000', // 1 year
                    ...metadata
                }
            );

            logger.firebase('service_image_upload', true, 0, {
                fileName: uniqueFileName,
                serialNumber,
                originalName: fileName,
                size: imageBuffer.length
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                fileName: uniqueFileName,
                serialNumber,
                originalName: fileName,
                size: imageBuffer.length,
                uploadedAt: uploadResult.uploadedAt
            };

        } catch (error) {
            logger.firebase('service_image_upload', false, 0, {
                fileName,
                serialNumber,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload serial number image for OCR processing
     * @param {Buffer} imageBuffer - Image buffer
     * @param {string} fileName - Original file name
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Upload result
     */
    static async uploadSerialImage(imageBuffer, fileName, metadata = {}) {
        try {
            // Validate file
            const validation = await this.validateImageFile(imageBuffer, fileName);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueFileName = `serials/${timestamp}_${sanitizedFileName}`;

            // Upload to Firebase Storage
            const uploadResult = await firebaseConfig.uploadBuffer(
                imageBuffer,
                uniqueFileName,
                {
                    contentType: validation.mimeType,
                    cacheControl: 'public, max-age=2592000', // 30 days for serial images
                    ...metadata
                }
            );

            logger.firebase('serial_image_upload', true, 0, {
                fileName: uniqueFileName,
                originalName: fileName,
                size: imageBuffer.length
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                fileName: uniqueFileName,
                originalName: fileName,
                size: imageBuffer.length,
                uploadedAt: uploadResult.uploadedAt
            };

        } catch (error) {
            logger.firebase('serial_image_upload', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Delete file from Firebase Storage
     * @param {string} fileName - File name/path in Firebase Storage
     * @returns {Promise<boolean>} Deletion success
     */
    static async deleteFile(fileName) {
        try {
            const success = await firebaseConfig.deleteFile(fileName);

            logger.firebase('file_deleted', success, 0, {
                fileName
            });

            return success;
        } catch (error) {
            logger.firebase('file_delete', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get file metadata
     * @param {string} fileName - File name/path in Firebase Storage
     * @returns {Promise<Object>} File metadata
     */
    static async getFileMetadata(fileName) {
        try {
            const metadata = await firebaseConfig.getFileMetadata(fileName);

            return {
                name: metadata.name,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                md5Hash: metadata.md5Hash
            };
        } catch (error) {
            logger.firebase('get_file_metadata', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate signed URL for private file access
     * @param {string} fileName - File name/path in Firebase Storage
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @returns {Promise<string>} Signed URL
     */
    static async generateSignedUrl(fileName, expiresIn = 3600) {
        try {
            const signedUrl = await firebaseConfig.generateSignedUrl(fileName, expiresIn);

            logger.firebase('signed_url_generated', true, 0, {
                fileName,
                expiresIn
            });

            return signedUrl;
        } catch (error) {
            logger.firebase('signed_url_generation', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Validate image file before upload
     * @param {Buffer} buffer - File buffer
     * @param {string} fileName - Original file name
     * @returns {Promise<Object>} Validation result
     */
    static async validateImageFile(buffer, fileName) {
        try {
            // Check if buffer is valid
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                return {
                    valid: false,
                    error: 'Invalid file buffer'
                };
            }

            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (buffer.length > maxSize) {
                return {
                    valid: false,
                    error: 'File size too large. Maximum allowed: 10MB'
                };
            }

            // Check file extension
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const fileExtension = this.getFileExtension(fileName).toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                return {
                    valid: false,
                    error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
                };
            }

            // Detect MIME type
            const mimeType = this.detectMimeType(buffer, fileName);

            // Validate MIME type matches extension
            const expectedMimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };

            const expectedMimeType = expectedMimeTypes[fileExtension];
            if (expectedMimeType && mimeType !== expectedMimeType) {
                logger.warn('MIME type mismatch:', {
                    fileName,
                    expected: expectedMimeType,
                    actual: mimeType
                });
            }

            return {
                valid: true,
                mimeType,
                extension: fileExtension,
                size: buffer.length
            };

        } catch (error) {
            logger.error('File validation error:', error);
            return {
                valid: false,
                error: 'File validation failed'
            };
        }
    }

    /**
     * Get file extension from filename
     * @param {string} fileName - File name
     * @returns {string} File extension with dot
     */
    static getFileExtension(fileName) {
        return fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
    }

    /**
     * Detect MIME type from buffer and filename
     * @param {Buffer} buffer - File buffer
     * @param {string} fileName - File name
     * @returns {string} MIME type
     */
    static detectMimeType(buffer, fileName) {
        // First try to detect from magic numbers
        if (buffer.length >= 8) {
            // JPEG
            if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                return 'image/jpeg';
            }

            // PNG
            if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                return 'image/png';
            }

            // GIF
            if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                return 'image/gif';
            }

            // WebP (RIFF + WEBP)
            if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
                if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
                    return 'image/webp';
                }
            }
        }

        // Fallback to extension-based detection
        const ext = this.getFileExtension(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * List files in a directory
     * @param {string} prefix - Directory prefix
     * @returns {Promise<Array>} List of files
     */
    static async listFiles(prefix = '') {
        try {
            const files = await firebaseConfig.listFiles(prefix);

            return files.map(file => ({
                name: file.name,
                publicUrl: file.publicUrl,
                metadata: file.metadata
            }));
        } catch (error) {
            logger.firebase('list_files', false, 0, {
                prefix,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clean up old files (for maintenance)
     * @param {number} daysOld - Files older than X days will be deleted
     * @param {string} prefix - Directory prefix to clean
     * @returns {Promise<Object>} Cleanup result
     */
    static async cleanupOldFiles(daysOld = 30, prefix = '') {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const files = await this.listFiles(prefix);
            const oldFiles = files.filter(file => {
                const fileDate = new Date(file.metadata.timeCreated);
                return fileDate < cutoffDate;
            });

            let deletedCount = 0;
            const errors = [];

            for (const file of oldFiles) {
                try {
                    await this.deleteFile(file.name);
                    deletedCount++;
                } catch (error) {
                    errors.push({
                        file: file.name,
                        error: error.message
                    });
                }
            }

            logger.business('old_files_cleaned', 'firebase', 'system', {
                prefix,
                daysOld,
                totalFound: oldFiles.length,
                deletedCount,
                errorCount: errors.length
            });

            return {
                success: true,
                deletedCount,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            logger.error('File cleanup error:', error);
            throw error;
        }
    }
}

export default FirebaseStorageService;