import { tesseractConfig } from '../config/tesseract.js';
import { logger } from '../config/logger.js';

/**
 * OCR Service - Handles text extraction from images
 * Specialized for serial number extraction
 */
class OCRService {

    /**
     * Extract serial number from image buffer
     * @param {Buffer} imageBuffer - Image buffer containing serial number
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result with serial number
     */
    static async extractSerialNumber(imageBuffer, options = {}) {
        try {
            const startTime = Date.now();

            // Validate image buffer
            if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
                throw new Error('Invalid image buffer provided');
            }

            // Check image size (limit to 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (imageBuffer.length > maxSize) {
                throw new Error('Image size too large. Maximum allowed: 10MB');
            }

            // Preprocess image for better OCR results
            const processedBuffer = await tesseractConfig.preprocessImage(imageBuffer);

            // Extract text using Tesseract
            const ocrResult = await tesseractConfig.extractText(processedBuffer, {
                binary: 'otsu',
                invert: false,
                ...options
            });

            if (!ocrResult.success) {
                return {
                    success: false,
                    error: 'Failed to extract text from image',
                    ocrText: '',
                    confidence: 0,
                    serialNumber: null
                };
            }

            // Extract serial number from OCR text
            const serialResult = tesseractConfig.extractSerialNumber(ocrResult.text);

            const totalDuration = Date.now() - startTime;

            // Log OCR operation
            logger.ocr('serial_extraction', serialResult.success, totalDuration, {
                imageSize: imageBuffer.length,
                ocrConfidence: ocrResult.confidence,
                serialConfidence: serialResult.confidence,
                textLength: ocrResult.text.length,
                serialNumber: serialResult.serialNumber
            });

            return {
                success: serialResult.success,
                serialNumber: serialResult.serialNumber,
                confidence: serialResult.confidence,
                ocrText: ocrResult.text,
                ocrConfidence: ocrResult.confidence,
                candidates: serialResult.candidates,
                duration: totalDuration,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('OCR service error:', {
                error: error.message,
                imageSize: imageBuffer ? imageBuffer.length : 'unknown'
            });

            return {
                success: false,
                error: error.message,
                serialNumber: null,
                confidence: 0,
                ocrText: '',
                candidates: []
            };
        }
    }

    /**
     * Extract text from image buffer (general purpose)
     * @param {Buffer} imageBuffer - Image buffer
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result
     */
    static async extractText(imageBuffer, options = {}) {
        try {
            const startTime = Date.now();

            // Validate image buffer
            if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
                throw new Error('Invalid image buffer provided');
            }

            // Check image size (limit to 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (imageBuffer.length > maxSize) {
                throw new Error('Image size too large. Maximum allowed: 10MB');
            }

            // Preprocess image
            const processedBuffer = await tesseractConfig.preprocessImage(imageBuffer);

            // Extract text using Tesseract
            const ocrResult = await tesseractConfig.extractText(processedBuffer, options);

            const duration = Date.now() - startTime;

            logger.ocr('text_extraction', ocrResult.success, duration, {
                imageSize: imageBuffer.length,
                confidence: ocrResult.confidence,
                textLength: ocrResult.text.length
            });

            return {
                success: ocrResult.success,
                text: ocrResult.text,
                confidence: ocrResult.confidence,
                words: ocrResult.words,
                lines: ocrResult.lines,
                duration,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Text extraction error:', error);

            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0,
                words: [],
                lines: []
            };
        }
    }

    /**
     * Validate image format and quality for OCR
     * @param {Buffer} imageBuffer - Image buffer
     * @returns {Promise<Object>} Validation result
     */
    static async validateImageForOCR(imageBuffer) {
        try {
            // Basic validation
            if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
                return {
                    valid: false,
                    error: 'Invalid image buffer'
                };
            }

            // Check file size
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (imageBuffer.length > maxSize) {
                return {
                    valid: false,
                    error: 'Image too large for OCR processing'
                };
            }

            const minSize = 1024; // 1KB
            if (imageBuffer.length < minSize) {
                return {
                    valid: false,
                    error: 'Image too small for OCR processing'
                };
            }

            // Check if it's a valid image format by reading magic numbers
            const isValidImage = this.isValidImageFormat(imageBuffer);

            if (!isValidImage.valid) {
                return {
                    valid: false,
                    error: 'Invalid image format for OCR',
                    details: isValidImage.error
                };
            }

            return {
                valid: true,
                format: isValidImage.format,
                size: imageBuffer.length,
                message: 'Image is suitable for OCR processing'
            };

        } catch (error) {
            logger.error('Image validation error:', error);
            return {
                valid: false,
                error: 'Image validation failed'
            };
        }
    }

    /**
     * Check if buffer contains a valid image format
     * @param {Buffer} buffer - Image buffer
     * @returns {Object} Validation result
     */
    static isValidImageFormat(buffer) {
        if (buffer.length < 8) {
            return { valid: false, error: 'Buffer too small' };
        }

        // Check magic numbers for common image formats
        const magicNumbers = {
            jpeg: [0xFF, 0xD8, 0xFF],
            png: [0x89, 0x50, 0x4E, 0x47],
            gif: [0x47, 0x49, 0x46],
            webp: [0x52, 0x49, 0x46, 0x46], // First 4 bytes of RIFF
            bmp: [0x42, 0x4D],
            tiff: [0x49, 0x49, 0x2A, 0x00] // Little endian TIFF
        };

        for (const [format, magic] of Object.entries(magicNumbers)) {
            const matches = magic.every((byte, index) => buffer[index] === byte);

            if (matches) {
                // Additional check for WebP (RIFF + WEBP)
                if (format === 'webp') {
                    const riffCheck = buffer.slice(0, 4).toString('ascii') === 'RIFF';
                    const webpCheck = buffer.slice(8, 12).toString('ascii') === 'WEBP';

                    if (riffCheck && webpCheck) {
                        return { valid: true, format };
                    }
                } else {
                    return { valid: true, format };
                }
            }
        }

        return { valid: false, error: 'Unknown or invalid image format' };
    }

    /**
     * Get OCR service status
     * @returns {Promise<Object>} Service status
     */
    static async getStatus() {
        try {
            const tesseractStatus = tesseractConfig.getStatus();

            return {
                service: 'ocr',
                status: tesseractStatus.initialized ? 'healthy' : 'unhealthy',
                tesseract: tesseractStatus,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting OCR service status:', error);
            return {
                service: 'ocr',
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Process multiple images for serial number extraction
     * @param {Array} images - Array of image buffers
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Array of OCR results
     */
    static async processMultipleImages(images, options = {}) {
        try {
            const results = [];

            for (let i = 0; i < images.length; i++) {
                const imageBuffer = images[i];

                try {
                    const result = await this.extractSerialNumber(imageBuffer, options);
                    results.push({
                        index: i,
                        success: result.success,
                        serialNumber: result.serialNumber,
                        confidence: result.confidence,
                        error: result.error
                    });
                } catch (error) {
                    results.push({
                        index: i,
                        success: false,
                        serialNumber: null,
                        confidence: 0,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;

            logger.business('multiple_images_processed', 'ocr', 'system', {
                totalImages: images.length,
                successCount,
                failureCount: images.length - successCount
            });

            return {
                total: images.length,
                successful: successCount,
                failed: images.length - successCount,
                results
            };

        } catch (error) {
            logger.error('Multiple image processing error:', error);
            throw error;
        }
    }
}

export default OCRService;