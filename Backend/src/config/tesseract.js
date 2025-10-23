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

            // Create new worker with language and logger suppression
            this.worker = await createWorker(this.defaultLang, 1, {
                logger: () => {} // Suppress tesseract.js console logs
            });

            // Set OCR parameters for serial number detection
            // Using PSM 7 (Single line) for better serial number detection
            await this.worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-.:/#',
                tessedit_pageseg_mode: '7', // Treat image as single text line (best for serial numbers)
                tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
                preserve_interword_spaces: '0', // Don't preserve spaces for serial numbers
                tessedit_do_invert: '0',
                classify_enable_learning: '0',
                classify_enable_adaptive_matcher: '1',
                // Improve character recognition
                tessedit_char_blacklist: '!@#$%^&*()+=[]{}|\\;:\'"<>?,./~`', // Exclude special chars
                edges_max_children_per_outline: '40',
                textord_heavy_nr: '1', // Better handling of varying character sizes
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

            // Log the raw OCR text for debugging
            logger.debug('OCR raw text for serial extraction:', {
                text: text,
                length: text.length,
                trimmed: text.trim()
            });

            // Apply OCR error correction for common character confusions
            const correctedText = this.correctOCRErrors(text);
            
            if (correctedText !== text) {
                logger.debug('OCR text corrected:', {
                    original: text,
                    corrected: correctedText
                });
            }

            // Common serial number patterns (ordered by priority)
            const patterns = [
                // Pattern 1: Explicit S/N labels - GREEDY (captures everything after label)
                /(?:S\/N\d?|SN\d?|S\.N\d?)[\s:]*([A-Z0-9\-\.]{6,40})/gi,
                
                // Pattern 2: Very long continuous alphanumeric (12+ chars) - HIGH PRIORITY for complete serials
                /\b[A-Z0-9]{12,40}\b/gi,
                
                // Pattern 3: Pure numeric serial (common in SSDs, HDDs) - 10+ digits
                /\b\d{10,20}\b/gi,
                
                // Pattern 4: Long serials with multiple dashes (3+ segments)
                /\b[A-Z0-9]{2,6}[-][A-Z0-9]{2,6}[-][A-Z0-9]{2,6}[-]?[A-Z0-9]{0,15}\b/gi,
                
                // Pattern 5: Complex GPU/Electronics format (602-V388-18SB2008000012)
                /\b\d{3,4}[-]?[A-Z]\d{3,4}[-]?\d{2}[A-Z]{2}\d{8,15}\b/gi,
                
                // Pattern 6: Alphanumeric mix starting with letters (like S7U5NJ0XA21213)
                /\b[A-Z]{1,5}\d{1,3}[A-Z0-9]{6,25}\b/gi,
                
                // Pattern 7: Standard multi-segment with dashes (2-4 segments)
                /\b[A-Z0-9]{2,6}[-][A-Z0-9]{2,6}(?:[-][A-Z0-9]{2,20}){1,3}\b/gi,
                
                // Pattern 8: Medium continuous alphanumeric (8-11 chars)
                /\b[A-Z0-9]{8,11}\b/gi,
                
                // Pattern 9: Two-segment format (flexible)
                /\b[A-Z0-9]{3,8}[-\.][A-Z0-9]{3,20}\b/gi,
                
                // Pattern 10: Standard formats (ABC12345678)
                /\b[A-Z]{1,3}\d{8,15}[A-Z0-9]{0,6}\b/gi,
                
                // Pattern 11: Generic SERIAL label
                /SERIAL\s*(?:NUMBER|NO)?[\s:]*([A-Z0-9\-\.]{6,40})/gi,
            ];

            const results = [];
            let match;

            // Try each pattern on the corrected text
            for (let i = 0; i < patterns.length; i++) {
                const patternStr = patterns[i];
                const regex = new RegExp(patternStr);
                while ((match = regex.exec(correctedText)) !== null) {
                    // Handle capturing groups
                    const candidate = match[1] || match[0];

                    // Filter out obvious non-serial numbers
                    if (this.isLikelySerialNumber(candidate)) {
                        // Keep dashes for serial numbers, only remove spaces
                        const cleanValue = candidate.trim().replace(/\s+/g, '');
                        
                        // Avoid duplicates (check both with and without dashes)
                        const cleanNoDash = cleanValue.replace(/[-\.]/g, '');
                        const isDuplicate = results.some(r => 
                            r.value === cleanValue || 
                            r.value.replace(/[-\.]/g, '') === cleanNoDash
                        );
                        
                        if (!isDuplicate) {
                            results.push({
                                value: cleanValue,
                                original: candidate,
                                confidence: this.calculateSerialConfidence(candidate, i),
                                pattern: i,
                                position: match.index
                            });
                        }
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
                confidence: bestMatch?.confidence || 0,
                allCandidates: results.slice(0, 3).map(c => ({value: c.value, confidence: c.confidence}))
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
     * Correct common OCR character recognition errors in serial numbers
     * @param {string} text - Raw OCR text
     * @returns {string} Corrected text
     */
    correctOCRErrors(text) {
        let corrected = text;

        // Common OCR confusions in serial numbers (context-aware corrections)
        // Only apply corrections where it makes sense for serial number patterns
        
        // Pattern: SN followed by mix of letters/numbers (like "SN" label detection)
        // Keep "SN" as is when it's clearly a label
        const snLabelPattern = /\b(S\/N|SN|S\.N)\s*[:=]?\s*/gi;
        if (snLabelPattern.test(corrected)) {
            // Don't correct SN when it's a label
            return corrected;
        }

        // Heuristic corrections for serial number context:
        // In serial numbers, digits are more common than letters in most positions
        
        // S -> 5: Common in middle/end of serial (like S7U5NJ0XA21213 should be S7U5NJ0XA21213)
        // But we need to be careful - some serials legitimately have S
        
        // O -> 0: Very common, especially in middle of numbers
        corrected = corrected.replace(/([0-9])O([0-9])/g, '$10$2'); // O between digits -> 0
        corrected = corrected.replace(/O([0-9]{2,})/g, '0$1'); // O before multiple digits -> 0
        
        // I -> 1: Common confusion
        corrected = corrected.replace(/([0-9])I([0-9])/g, '$11$2'); // I between digits -> 1
        
        // Z -> 2: Less common but happens
        corrected = corrected.replace(/([0-9])Z([0-9])/g, '$12$2'); // Z between digits -> 2
        
        // B -> 8: Can happen
        corrected = corrected.replace(/([0-9])B([0-9])/g, '$18$2'); // B between digits -> 8

        return corrected;
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

        // Must be between 4 and 40 characters (increased max for long serials)
        if (clean.length < 4 || clean.length > 40) {
            return false;
        }

        // Count numbers and letters
        const numbers = clean.replace(/[^0-9]/g, '').length;
        const letters = clean.replace(/[^A-Z]/gi, '').length;

        // Rule: Accept if has at least some alphanumeric combination
        // Option 1: All numbers if at least 6 digits (could be pure numeric serial)
        if (letters === 0 && numbers >= 6) {
            return true;
        }

        // Option 2: All letters if at least 4 letters (could be product code)
        if (numbers === 0 && letters >= 4) {
            return true;
        }

        // Option 3: Mixed - should have reasonable mix
        if (numbers > 0 && letters > 0) {
            // For very long serials (12+ chars), be more permissive
            if (clean.length >= 12) {
                return true; // Long mixed serials are very likely valid
            }
            
            // For medium/short, check ratio
            const ratio = Math.min(numbers, letters) / Math.max(numbers, letters);
            // More lenient for serials (like S7U5NJ0XA21213 = 4 letters, 10 numbers)
            return ratio >= 0.08; // Very relaxed for diverse formats
        }

        return false;
    }

    /**
     * Calculate confidence score for a serial number candidate
     * @param {string} candidate - Candidate string
     * @param {number} patternIndex - Pattern index (lower = higher priority)
     * @returns {number} Confidence score (0-1)
     */
    calculateSerialConfidence(candidate, patternIndex = 5) {
        let confidence = 0.5; // Base confidence

        const clean = candidate.replace(/[\s\-\.]/g, '');

        // Pattern priority bonus (earlier patterns are more specific)
        if (patternIndex === 0) confidence += 0.35; // S/N label - highest priority
        else if (patternIndex === 1) confidence += 0.30; // Very long continuous (12+)
        else if (patternIndex === 2) confidence += 0.28; // Pure numeric long
        else if (patternIndex === 3) confidence += 0.25; // Multi-segment with dashes
        else if (patternIndex === 4) confidence += 0.25; // GPU/Electronics format
        else if (patternIndex === 5) confidence += 0.22; // Alphanumeric starting with letters
        else if (patternIndex <= 7) confidence += 0.18; // Good formats
        else confidence += 0.10; // Generic patterns

        // Length bonus (longer is usually better for serials)
        if (clean.length >= 18 && clean.length <= 30) {
            confidence += 0.20; // Very long detailed serials (like GPU/HDD)
        } else if (clean.length >= 12 && clean.length <= 18) {
            confidence += 0.18; // Long complete serials - PREFER THESE
        } else if (clean.length >= 8 && clean.length <= 12) {
            confidence += 0.10; // Standard length
        } else if (clean.length >= 6 && clean.length <= 40) {
            confidence += 0.05; // Acceptable range
        }

        // Character diversity bonus
        const hasNumbers = /\d/.test(clean);
        const hasLetters = /[A-Z]/i.test(clean);
        const numberCount = (clean.match(/\d/g) || []).length;
        const letterCount = (clean.match(/[A-Z]/gi) || []).length;

        if (hasNumbers && hasLetters) {
            // For very long serials, having any letters is good (even if few)
            if (clean.length > 15 && letterCount >= 2) {
                confidence += 0.1;
            } else {
                // Bonus for good balance in shorter serials
                const total = numberCount + letterCount;
                const ratio = Math.min(numberCount, letterCount) / Math.max(numberCount, letterCount);
                if (ratio > 0.3) {
                    confidence += 0.15;
                } else if (ratio > 0.1) {
                    confidence += 0.1;
                } else {
                    confidence += 0.05;
                }
            }
        }

        // Format bonus (contains typical separators in original)
        if (/[-]/.test(candidate)) {
            confidence += 0.1;
            // Extra bonus for multiple dashes (structured format like 602-V388-18SB2008000012)
            const dashCount = (candidate.match(/-/g) || []).length;
            if (dashCount >= 2) {
                confidence += 0.1; // Increased from 0.05
            }
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
            // Try to use sharp for image preprocessing (if available)
            try {
                const sharp = await import('sharp').then(m => m.default);
                
                // Process image for better OCR (optimized for serial numbers):
                // 1. Convert to grayscale
                // 2. Increase contrast and normalize
                // 3. Apply stronger sharpening
                // 4. Resize for optimal OCR resolution
                // 5. Apply threshold for better character recognition
                const processed = await sharp(imageBuffer)
                    .grayscale()
                    .normalize() // Auto-adjust contrast
                    .sharpen({
                        sigma: 1.5,      // More aggressive sharpening
                        m1: 1.0,
                        m2: 0.5,
                        x1: 2,
                        y2: 10,
                        y3: 20
                    })
                    .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
                    .resize({
                        width: 2000, // Higher resolution for better character detection
                        fit: 'inside',
                        withoutEnlargement: false, // Allow enlargement
                        kernel: sharp.kernel.lanczos3 // Best quality resampling
                    })
                    .toBuffer();

                logger.debug('Image preprocessed with sharp', {
                    originalSize: imageBuffer.length,
                    processedSize: processed.length
                });

                return processed;
            } catch (sharpError) {
                // Sharp not available, return original
                logger.debug('Sharp not available, using original image', {
                    error: sharpError.message
                });
                return imageBuffer;
            }

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