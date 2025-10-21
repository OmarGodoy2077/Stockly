import { cloudinaryConfig } from '../config/cloudinary.js';
import { logger } from '../config/logger.js';

/**
 * Cloudinary Storage Service - Handles image uploads with optimizations
 * Provides automatic image optimization, compression, and transformations
 */
class CloudinaryStorageService {

    /**
     * Upload image for product with automatic optimization
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
            const uniqueId = `${timestamp}_${sanitizedFileName.split('.')[0]}`;

            // Upload to Cloudinary with optimizations
            const uploadResult = await cloudinaryConfig.uploadBuffer(
                imageBuffer,
                'stockly/products',
                {
                    public_id: uniqueId,
                    overwrite: false,
                    invalidate: true,
                    transformation: [
                        {
                            quality: 'auto:good',
                            fetch_format: 'auto'
                        }
                    ],
                    tags: ['product', 'inventory', metadata.companyId || 'unknown'].filter(Boolean),
                    context: {
                        originalName: fileName,
                        uploadedBy: metadata.uploadedBy || 'system',
                        ...metadata
                    }
                }
            );

            logger.cloudinary('product_image_upload', true, 0, {
                publicId: uploadResult.publicId,
                originalName: fileName,
                size: imageBuffer.length,
                format: uploadResult.format,
                optimizedSize: uploadResult.bytes
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                publicId: uploadResult.publicId,
                fileName: uniqueId,
                originalName: fileName,
                format: uploadResult.format,
                size: imageBuffer.length,
                optimizedSize: uploadResult.bytes,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                },
                uploadedAt: uploadResult.uploadedAt,
                // Generate different size variants
                thumbnailUrl: cloudinaryConfig.getThumbnailUrl(uploadResult.publicId, 150, 150),
                mediumUrl: cloudinaryConfig.getOptimizedUrl(uploadResult.publicId, {
                    width: 500,
                    height: 500,
                    crop: 'limit'
                })
            };

        } catch (error) {
            logger.cloudinary('product_image_upload', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload image for service history with automatic optimization
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

            // Generate unique filename with serial number
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const sanitizedSerial = serialNumber.replace(/[^a-zA-Z0-9-]/g, '_');
            const uniqueId = `${sanitizedSerial}/${timestamp}_${sanitizedFileName.split('.')[0]}`;

            // Upload to Cloudinary
            const uploadResult = await cloudinaryConfig.uploadBuffer(
                imageBuffer,
                `stockly/services`,
                {
                    public_id: uniqueId,
                    overwrite: false,
                    invalidate: true,
                    transformation: [
                        {
                            quality: 'auto:good',
                            fetch_format: 'auto'
                        }
                    ],
                    tags: ['service', 'repair', serialNumber, metadata.companyId || 'unknown'].filter(Boolean),
                    context: {
                        originalName: fileName,
                        serialNumber,
                        uploadedBy: metadata.uploadedBy || 'system',
                        ...metadata
                    }
                }
            );

            logger.cloudinary('service_image_upload', true, 0, {
                publicId: uploadResult.publicId,
                serialNumber,
                originalName: fileName,
                size: imageBuffer.length,
                optimizedSize: uploadResult.bytes
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                publicId: uploadResult.publicId,
                fileName: uniqueId,
                serialNumber,
                originalName: fileName,
                format: uploadResult.format,
                size: imageBuffer.length,
                optimizedSize: uploadResult.bytes,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                },
                uploadedAt: uploadResult.uploadedAt,
                thumbnailUrl: cloudinaryConfig.getThumbnailUrl(uploadResult.publicId, 150, 150)
            };

        } catch (error) {
            logger.cloudinary('service_image_upload', false, 0, {
                fileName,
                serialNumber,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload serial number image for OCR processing
     * Higher quality for better OCR accuracy
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
            const uniqueId = `${timestamp}_${sanitizedFileName.split('.')[0]}`;

            // Upload with higher quality for OCR
            const uploadResult = await cloudinaryConfig.uploadBuffer(
                imageBuffer,
                'stockly/serials',
                {
                    public_id: uniqueId,
                    overwrite: false,
                    invalidate: true,
                    transformation: [
                        {
                            quality: 'auto:best', // Higher quality for OCR
                            fetch_format: 'auto'
                        }
                    ],
                    tags: ['serial', 'ocr', metadata.companyId || 'unknown'].filter(Boolean),
                    context: {
                        originalName: fileName,
                        purpose: 'ocr',
                        uploadedBy: metadata.uploadedBy || 'system',
                        ...metadata
                    }
                }
            );

            logger.cloudinary('serial_image_upload', true, 0, {
                publicId: uploadResult.publicId,
                originalName: fileName,
                size: imageBuffer.length,
                optimizedSize: uploadResult.bytes
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                publicId: uploadResult.publicId,
                fileName: uniqueId,
                originalName: fileName,
                format: uploadResult.format,
                size: imageBuffer.length,
                optimizedSize: uploadResult.bytes,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                },
                uploadedAt: uploadResult.uploadedAt
            };

        } catch (error) {
            logger.cloudinary('serial_image_upload', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Delete image from Cloudinary
     * @param {string} publicId - Public ID of the image (can be full URL or just ID)
     * @returns {Promise<boolean>} Deletion success
     */
    static async deleteImage(publicId) {
        try {
            // Extract public ID if full URL is provided
            const extractedId = this.extractPublicId(publicId);

            const result = await cloudinaryConfig.deleteImage(extractedId);

            logger.cloudinary('image_deleted', result.success, 0, {
                publicId: extractedId
            });

            return result.success;
        } catch (error) {
            logger.cloudinary('image_delete', false, 0, {
                publicId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Delete multiple images from Cloudinary
     * @param {Array<string>} publicIds - Array of public IDs or URLs
     * @returns {Promise<Object>} Deletion results
     */
    static async deleteImages(publicIds) {
        try {
            // Extract public IDs if full URLs are provided
            const extractedIds = publicIds.map(id => this.extractPublicId(id));

            const result = await cloudinaryConfig.deleteImages(extractedIds);

            logger.cloudinary('multiple_images_deleted', result.success, 0, {
                count: extractedIds.length,
                deletedCount: result.deletedCount
            });

            return {
                success: result.success,
                deletedCount: result.deletedCount,
                totalRequested: extractedIds.length
            };
        } catch (error) {
            logger.cloudinary('multiple_images_delete', false, 0, {
                count: publicIds.length,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Extract public ID from Cloudinary URL or return as-is if already an ID
     * @param {string} urlOrId - Cloudinary URL or public ID
     * @returns {string} Public ID
     */
    static extractPublicId(urlOrId) {
        if (!urlOrId) return '';

        // If it's already a public ID format (contains folder structure but not http)
        if (!urlOrId.startsWith('http')) {
            return urlOrId;
        }

        // Extract from URL
        try {
            const url = new URL(urlOrId);
            const pathParts = url.pathname.split('/');
            
            // Find 'upload' in path and get everything after version number
            const uploadIndex = pathParts.indexOf('upload');
            if (uploadIndex === -1) return urlOrId;

            // Skip upload and version (e.g., v1234567890)
            const afterUpload = pathParts.slice(uploadIndex + 2);
            
            // Join and remove file extension
            const fullPath = afterUpload.join('/');
            const lastDotIndex = fullPath.lastIndexOf('.');
            
            return lastDotIndex > 0 ? fullPath.substring(0, lastDotIndex) : fullPath;
        } catch (error) {
            logger.warn('Failed to extract public ID from URL, using as-is:', urlOrId);
            return urlOrId;
        }
    }

    /**
     * Get optimized image URL with transformations
     * @param {string} publicId - Public ID of the image
     * @param {Object} options - Transformation options
     * @returns {string} Optimized image URL
     */
    static getOptimizedUrl(publicId, options = {}) {
        const extractedId = this.extractPublicId(publicId);
        return cloudinaryConfig.getOptimizedUrl(extractedId, options);
    }

    /**
     * Get thumbnail URL
     * @param {string} publicId - Public ID of the image
     * @param {number} width - Width
     * @param {number} height - Height
     * @returns {string} Thumbnail URL
     */
    static getThumbnailUrl(publicId, width = 200, height = 200) {
        const extractedId = this.extractPublicId(publicId);
        return cloudinaryConfig.getThumbnailUrl(extractedId, width, height);
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

            // Check minimum file size (1KB)
            const minSize = 1024;
            if (buffer.length < minSize) {
                return {
                    valid: false,
                    error: 'File size too small. Minimum: 1KB'
                };
            }

            // Check file extension
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const fileExtension = this.getFileExtension(fileName).toLowerCase();

            if (!allowedExtensions.includes(fileExtension)) {
                return {
                    valid: false,
                    error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
                };
            }

            // Detect MIME type
            const mimeType = this.detectMimeType(buffer, fileName);

            // Validate MIME type
            if (!mimeType.startsWith('image/')) {
                return {
                    valid: false,
                    error: 'File is not a valid image'
                };
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
        // Detect from magic numbers (file signatures)
        if (buffer.length >= 12) {
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
                if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
                    return 'image/webp';
                }
            }

            // BMP
            if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
                return 'image/bmp';
            }
        }

        // Fallback to extension-based detection
        const ext = this.getFileExtension(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Upload PDF invoice to Cloudinary
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @param {string} fileName - PDF file name
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Upload result
     */
    static async uploadInvoicePdf(pdfBuffer, fileName, metadata = {}) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueId = `${timestamp}_${sanitizedFileName.split('.')[0]}`;

            // Upload to Cloudinary
            const uploadResult = await cloudinaryConfig.uploadBuffer(
                pdfBuffer,
                'stockly/invoices',
                {
                    public_id: uniqueId,
                    overwrite: false,
                    invalidate: true,
                    resource_type: 'raw',
                    tags: ['invoice', 'pdf', metadata.companyId || 'unknown'].filter(Boolean),
                    context: {
                        originalName: fileName,
                        invoiceNumber: metadata.invoiceNumber || 'unknown',
                        invoiceId: metadata.invoiceId || 'unknown',
                        uploadedBy: metadata.uploadedBy || 'system',
                        ...metadata
                    }
                }
            );

            logger.cloudinary('invoice_pdf_upload', true, 0, {
                publicId: uploadResult.publicId,
                originalName: fileName,
                size: pdfBuffer.length,
                invoiceNumber: metadata.invoiceNumber
            });

            return {
                success: true,
                publicUrl: uploadResult.publicUrl,
                publicId: uploadResult.publicId,
                fileName: uniqueId,
                originalName: fileName,
                format: uploadResult.format,
                size: pdfBuffer.length,
                uploadedAt: uploadResult.uploadedAt
            };

        } catch (error) {
            logger.cloudinary('invoice_pdf_upload', false, 0, {
                fileName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate responsive image srcset for different screen sizes
     * @param {string} publicId - Public ID of the image
     * @returns {Object} Responsive image URLs
     */
    static getResponsiveUrls(publicId) {
        const extractedId = this.extractPublicId(publicId);

        return {
            thumbnail: cloudinaryConfig.getThumbnailUrl(extractedId, 150, 150),
            small: cloudinaryConfig.getOptimizedUrl(extractedId, { width: 300, crop: 'limit' }),
            medium: cloudinaryConfig.getOptimizedUrl(extractedId, { width: 600, crop: 'limit' }),
            large: cloudinaryConfig.getOptimizedUrl(extractedId, { width: 1200, crop: 'limit' }),
            original: cloudinaryConfig.getOptimizedUrl(extractedId)
        };
    }

    /**
     * Get usage statistics from Cloudinary
     * @returns {Promise<Object>} Usage statistics
     */
    static async getUsageStats() {
        try {
            return await cloudinaryConfig.getUsageStats();
        } catch (error) {
            logger.error('Failed to get Cloudinary usage stats:', error);
            throw error;
        }
    }

    /**
     * Health check for Cloudinary service
     * @returns {Promise<Object>} Health status
     */
    static async healthCheck() {
        return await cloudinaryConfig.healthCheck();
    }
}

export default CloudinaryStorageService;
