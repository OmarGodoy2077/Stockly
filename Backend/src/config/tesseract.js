import { createWorker } from 'tesseract.js';
import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

/**
 * Tesseract.js OCR configuration for Stockly Backend
 * Handles serial number extraction from images
 */
class TesseractConfig {
    constructor() {
        this.defaultLang = process.env.TESSERACT_LANG || 'eng+spa';
        this.worker = null;
        this.initialized = false;

        this.initializeWorker();
    }

    /**
     * Initialize Tesseract worker
     */
    async initializeWorker() {
        try {
            if (this.worker) {
                await this.worker.terminate();
            }

            // Create new worker with language and initial config
            this.worker = await createWorker(this.defaultLang, {
                config: {
                    tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
                    tessedit_ocr_engine_mode: '2', // Use LSTM OCR engine
                    preserve_interword_spaces: '1'
                }
            });

            // Set additional OCR parameters that can be changed after initialization
            await this.worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-./',
                tessedit_pageseg_mode: '1', // Automatic page segmentation
                tessedit_do_invert: '0', // Don't invert image
                classify_enable_learning: '0', // Disable learning for consistency
                classify_enable_adaptive_matcher: '0'
            });

            this.initialized = true;
            logger.info('Tesseract worker initialized successfully', {
                language: this.defaultLang
            });

        } catch (error) {
            logger.error('Failed to initialize Tesseract worker:', error);
            throw new Error(`Tesseract initialization failed: ${error.message}`);
        }
    }

    /**
     * Extract text from image buffer
     * @param {Buffer} imageBuffer - Image buffer
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} OCR result
     */
    async extractText(imageBuffer, options = {}) {
        const startTime = Date.now();

        try {
            // Validate worker is initialized
            if (!this.initialized || !this.worker) {
                await this.initializeWorker();
            }

            // Validate image buffer
            if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
                throw new Error('Invalid image buffer provided');
            }

            // OCR options
            const ocrOptions = {
                // Image preprocessing options
                binary: options.binary || 'otsu', // Binarization method
                invert: options.invert || false, // Invert colors
                ...options
            };

            // Perform OCR
            const { data } = await this.worker.recognize(imageBuffer, ocrOptions);

            const duration = Date.now() - startTime;

            // Log OCR operation
            logger.ocr('extract_text', true, duration, {
                confidence: data.confidence,
                textLength: data.text.length,
                wordCount: data.words?.length || 0
            });

            return {
                success: true,
                text: data.text.trim(),
                confidence: data.confidence,
                words: data.words || [],
                lines: data.lines || [],
                duration,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            logger.ocr('extract_text', false, duration, {
                error: error.message
            });

            throw new Error(`OCR text extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract serial number from OCR text
     * @param {string} text - OCR extracted text
     * @returns {Object} Extracted serial number info
     */
    extractSerialNumber(text) {
        try {
            if (!text || typeof text !== 'string') {
                return {
                    success: false,
                    error: 'No text provided for serial number extraction'
                };
            }

            // Common serial number patterns
            const patterns = [
                // Alphanumeric patterns (most common)
                /\b[A-Z0-9]{8,20}\b/gi,
                // Patterns with dashes or dots
                /\b[A-Z0-9]{3,6}[-.][A-Z0-9]{3,6}[-.][A-Z0-9]{3,6}\b/gi,
                // Patterns starting with SN or SERIAL
                /\b(?:SN|SERIAL|NUM|NO|#)[\s:]*([A-Z0-9]{5,15})\b/gi,
                // Patterns with specific formats
                /\b\d{3,4}[A-Z]\d{3,4}\b/gi,
                // Mixed alphanumeric with specific length
                /\b[A-Z0-9]{10,}\b/gi
            ];

            const results = [];
            let match;

            // Try each pattern
            for (const pattern of patterns) {
                const regex = new RegExp(pattern);
                while ((match = regex.exec(text)) !== null) {
                    const candidate = match[1] || match[0];

                    // Filter out obvious non-serial numbers
                    if (this.isLikelySerialNumber(candidate)) {
                        results.push({
                            value: candidate.replace(/[\s\-\.]/g, ''), // Clean the serial number
                            original: candidate,
                            confidence: this.calculateSerialConfidence(candidate),
                            pattern: pattern.source,
                            position: match.index
                        });
                    }
                }
            }

            // Sort by confidence and position
            results.sort((a, b) => {
                if (a.confidence !== b.confidence) {
                    return b.confidence - a.confidence;
                }
                return a.position - b.position;
            });

            const bestMatch = results.length > 0 ? results[0] : null;

            logger.business('serial_extraction', 'ocr', 'system', {
                textLength: text.length,
                candidates: results.length,
                bestMatch: bestMatch?.value || null,
                confidence: bestMatch?.confidence || 0
            });

            return {
                success: results.length > 0,
                serialNumber: bestMatch?.value || null,
                confidence: bestMatch?.confidence || 0,
                candidates: results,
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Serial number extraction error:', error);
            return {
                success: false,
                error: error.message,
                serialNumber: null,
                confidence: 0
            };
        }
    }

    /**
     * Check if a string is likely to be a serial number
     * @param {string} candidate - Candidate string
     * @returns {boolean} Likely serial number
     */
    isLikelySerialNumber(candidate) {
        // Remove common separators
        const clean = candidate.replace(/[\s\-\.]/g, '');

        // Must be alphanumeric
        if (!/^[A-Z0-9]+$/i.test(clean)) {
            return false;
        }

        // Must be between 5 and 25 characters
        if (clean.length < 5 || clean.length > 25) {
            return false;
        }

        // Should not be all numbers (likely a phone number or ID)
        if (/^\d+$/.test(clean)) {
            return false;
        }

        // Should not be all letters (likely a word)
        if (/^[A-Z]+$/i.test(clean)) {
            return false;
        }

        // Should have good mix of numbers and letters
        const numbers = clean.replace(/[^0-9]/g, '').length;
        const letters = clean.replace(/[^A-Z]/gi, '').length;
        const ratio = Math.min(numbers, letters) / Math.max(numbers, letters);

        // Should have reasonable mix (not too skewed)
        return ratio >= 0.2;
    }

    /**
     * Calculate confidence score for a serial number candidate
     * @param {string} candidate - Candidate string
     * @returns {number} Confidence score (0-1)
     */
    calculateSerialConfidence(candidate) {
        let confidence = 0.5; // Base confidence

        const clean = candidate.replace(/[\s\-\.]/g, '');

        // Length bonus (8-15 characters is ideal)
        if (clean.length >= 8 && clean.length <= 15) {
            confidence += 0.2;
        } else if (clean.length >= 6 && clean.length <= 20) {
            confidence += 0.1;
        }

        // Character diversity bonus
        const hasNumbers = /\d/.test(clean);
        const hasLetters = /[A-Z]/i.test(clean);

        if (hasNumbers && hasLetters) {
            confidence += 0.2;
        }

        // Format bonus (contains typical separators)
        if (/[-.]/.test(candidate)) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Process image and extract serial number in one step
     * @param {Buffer} imageBuffer - Image buffer
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Serial number extraction result
     */
    async processImageForSerialNumber(imageBuffer, options = {}) {
        try {
            // First extract text from image
            const ocrResult = await this.extractText(imageBuffer, options);

            if (!ocrResult.success) {
                return {
                    success: false,
                    error: 'Failed to extract text from image',
                    ocrResult
                };
            }

            // Then extract serial number from text
            const serialResult = this.extractSerialNumber(ocrResult.text);

            return {
                success: serialResult.success,
                serialNumber: serialResult.serialNumber,
                confidence: serialResult.confidence,
                ocrText: ocrResult.text,
                ocrConfidence: ocrResult.confidence,
                candidates: serialResult.candidates,
                duration: ocrResult.duration,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Image processing for serial number failed:', error);
            return {
                success: false,
                error: error.message,
                serialNumber: null,
                confidence: 0
            };
        }
    }

    /**
     * Get OCR worker status
     * @returns {Object} Worker status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            language: this.defaultLang,
            workerExists: !!this.worker
        };
    }

    /**
     * Terminate worker and cleanup resources
     */
    async terminate() {
        try {
            if (this.worker) {
                await this.worker.terminate();
                this.worker = null;
                this.initialized = false;
                logger.info('Tesseract worker terminated successfully');
            }
        } catch (error) {
            logger.error('Error terminating Tesseract worker:', error);
        }
    }

    /**
     * Health check for OCR functionality
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            const status = this.getStatus();

            if (!status.initialized) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Tesseract worker not initialized',
                    details: status
                };
            }

            // Only check if worker is initialized and available
            // Don't attempt to process test images during health check
            // as this can cause crashes if the buffer is invalid

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                language: this.defaultLang,
                details: status
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                language: this.defaultLang
            };
        }
    }

    /**
     * Preprocess image for better OCR results
     * @param {Buffer} imageBuffer - Original image buffer
     * @returns {Buffer} Processed image buffer
     */
    async preprocessImage(imageBuffer) {
        try {
            // For now, return original buffer
            // In the future, we could add image preprocessing here
            // (resize, enhance contrast, grayscale conversion, etc.)

            return imageBuffer;

        } catch (error) {
            logger.error('Image preprocessing failed:', error);
            return imageBuffer; // Return original on error
        }
    }
}

// Create and export singleton instance
const tesseractConfig = new TesseractConfig();

export { tesseractConfig as default, TesseractConfig };
export { tesseractConfig };