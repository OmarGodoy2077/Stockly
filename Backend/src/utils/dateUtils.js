import { logger } from '../config/logger.js';

/**
 * Date utility functions for Stockly Backend
 * Handles date formatting, validation, and calculations
 */
class DateUtils {

    /**
     * Format date to local string (Guatemala timezone)
     * @param {Date|string} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    static formatLocal(date, options = {}) {
        try {
            const dateObj = date instanceof Date ? date : new Date(date);

            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date provided');
            }

            const defaultOptions = {
                timeZone: 'America/Guatemala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                ...options
            };

            return new Intl.DateTimeFormat('es-GT', defaultOptions).format(dateObj);
        } catch (error) {
            logger.error('Error formatting local date:', error);
            return 'Fecha inválida';
        }
    }

    /**
     * Format date with time to local string
     * @param {Date|string} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date and time string
     */
    static formatLocalWithTime(date, options = {}) {
        try {
            const dateObj = date instanceof Date ? date : new Date(date);

            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date provided');
            }

            const defaultOptions = {
                timeZone: 'America/Guatemala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                ...options
            };

            return new Intl.DateTimeFormat('es-GT', defaultOptions).format(dateObj);
        } catch (error) {
            logger.error('Error formatting local date with time:', error);
            return 'Fecha inválida';
        }
    }

    /**
     * Get current date in Guatemala timezone
     * @returns {Date} Current date in Guatemala timezone
     */
    static getCurrentDateGuatemala() {
        try {
            // Create date in Guatemala timezone
            const guatemalaTime = new Date().toLocaleString('en-US', {
                timeZone: 'America/Guatemala'
            });

            return new Date(guatemalaTime);
        } catch (error) {
            logger.error('Error getting current date in Guatemala timezone:', error);
            return new Date(); // Fallback to server time
        }
    }

    /**
     * Calculate warranty expiration date
     * @param {Date|string} startDate - Warranty start date
     * @param {number} months - Number of months for warranty
     * @returns {Date} Warranty expiration date
     */
    static calculateWarrantyExpiry(startDate, months) {
        try {
            const start = startDate instanceof Date ? startDate : new Date(startDate);

            if (isNaN(start.getTime())) {
                throw new Error('Invalid start date provided');
            }

            if (!Number.isInteger(months) || months <= 0) {
                throw new Error('Invalid warranty months provided');
            }

            const expiryDate = new Date(start);
            expiryDate.setMonth(expiryDate.getMonth() + months);

            return expiryDate;
        } catch (error) {
            logger.error('Error calculating warranty expiry:', error);
            throw error;
        }
    }

    /**
     * Get days until warranty expires
     * @param {Date|string} expiryDate - Warranty expiry date
     * @returns {number} Days until expiry (negative if expired)
     */
    static getDaysUntilExpiry(expiryDate) {
        try {
            const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
            const now = this.getCurrentDateGuatemala();

            if (isNaN(expiry.getTime())) {
                throw new Error('Invalid expiry date provided');
            }

            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays;
        } catch (error) {
            logger.error('Error calculating days until expiry:', error);
            return 0;
        }
    }

    /**
     * Check if warranty is expired
     * @param {Date|string} expiryDate - Warranty expiry date
     * @returns {boolean} True if expired
     */
    static isWarrantyExpired(expiryDate) {
        try {
            const daysUntilExpiry = this.getDaysUntilExpiry(expiryDate);
            return daysUntilExpiry < 0;
        } catch (error) {
            logger.error('Error checking warranty expiry:', error);
            return true; // Assume expired if we can't determine
        }
    }

    /**
     * Check if warranty is expiring soon (within specified days)
     * @param {Date|string} expiryDate - Warranty expiry date
     * @param {number} daysThreshold - Days threshold (default: 30)
     * @returns {boolean} True if expiring soon
     */
    static isWarrantyExpiringSoon(expiryDate, daysThreshold = 30) {
        try {
            const daysUntilExpiry = this.getDaysUntilExpiry(expiryDate);

            if (daysUntilExpiry < 0) {
                return false; // Already expired
            }

            return daysUntilExpiry <= daysThreshold;
        } catch (error) {
            logger.error('Error checking if warranty is expiring soon:', error);
            return false;
        }
    }

    /**
     * Get date range for reports
     * @param {string} period - Period type ('week', 'month', 'quarter', 'year')
     * @returns {Object} Start and end dates
     */
    static getDateRange(period = 'month') {
        try {
            const now = this.getCurrentDateGuatemala();
            let startDate = new Date(now);
            let endDate = new Date(now);

            switch (period) {
                case 'week':
                    startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
                    endDate.setHours(23, 59, 59, 999);
                    break;

                case 'month':
                    startDate.setDate(1); // First day of month
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setMonth(now.getMonth() + 1, 0); // Last day of month
                    endDate.setHours(23, 59, 59, 999);
                    break;

                case 'quarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    startDate.setMonth(currentQuarter * 3, 1); // First day of quarter
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setMonth(currentQuarter * 3 + 3, 0); // Last day of quarter
                    endDate.setHours(23, 59, 59, 999);
                    break;

                case 'year':
                    startDate.setMonth(0, 1); // First day of year
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setMonth(11, 31); // Last day of year
                    endDate.setHours(23, 59, 59, 999);
                    break;

                default:
                    throw new Error('Invalid period specified');
            }

            return {
                startDate,
                endDate,
                period
            };
        } catch (error) {
            logger.error('Error getting date range:', error);
            throw error;
        }
    }

    /**
     * Validate date string format
     * @param {string} dateString - Date string to validate
     * @param {string} format - Expected format (optional)
     * @returns {boolean} Valid date format
     */
    static isValidDateString(dateString, format = null) {
        try {
            if (!dateString || typeof dateString !== 'string') {
                return false;
            }

            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return false;
            }

            // If format is specified, validate against it
            if (format) {
                const formatted = this.formatLocal(date);
                // Basic format validation - could be enhanced
                return formatted !== 'Fecha inválida';
            }

            return true;
        } catch (error) {
            logger.error('Error validating date string:', error);
            return false;
        }
    }

    /**
     * Parse date from various formats
     * @param {string|number|Date} dateInput - Date input
     * @returns {Date|null} Parsed date or null if invalid
     */
    static parseDate(dateInput) {
        try {
            if (!dateInput) {
                return null;
            }

            if (dateInput instanceof Date) {
                return dateInput;
            }

            if (typeof dateInput === 'number') {
                return new Date(dateInput);
            }

            if (typeof dateInput === 'string') {
                // Handle common date formats
                const date = new Date(dateInput);

                if (isNaN(date.getTime())) {
                    return null;
                }

                return date;
            }

            return null;
        } catch (error) {
            logger.error('Error parsing date:', error);
            return null;
        }
    }

    /**
     * Get business days between two dates
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {number} Number of business days
     */
    static getBusinessDays(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                return 0;
            }

            let businessDays = 0;
            const currentDate = new Date(start);

            while (currentDate <= end) {
                const dayOfWeek = currentDate.getDay();

                // Skip weekends (Saturday = 6, Sunday = 0)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    businessDays++;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return businessDays;
        } catch (error) {
            logger.error('Error calculating business days:', error);
            return 0;
        }
    }

    /**
     * Add business days to a date
     * @param {Date} startDate - Start date
     * @param {number} businessDays - Number of business days to add
     * @returns {Date} New date after adding business days
     */
    static addBusinessDays(startDate, businessDays) {
        try {
            const result = new Date(startDate);
            let addedDays = 0;

            while (addedDays < businessDays) {
                result.setDate(result.getDate() + 1);

                // Only count weekdays
                const dayOfWeek = result.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    addedDays++;
                }
            }

            return result;
        } catch (error) {
            logger.error('Error adding business days:', error);
            throw error;
        }
    }

    /**
     * Get age in years from birth date
     * @param {Date|string} birthDate - Birth date
     * @returns {number} Age in years
     */
    static getAge(birthDate) {
        try {
            const birth = this.parseDate(birthDate);
            const today = this.getCurrentDateGuatemala();

            if (!birth) {
                return 0;
            }

            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            return Math.max(0, age);
        } catch (error) {
            logger.error('Error calculating age:', error);
            return 0;
        }
    }

    /**
     * Check if date is weekend
     * @param {Date|string} date - Date to check
     * @returns {boolean} True if weekend
     */
    static isWeekend(date) {
        try {
            const dateObj = this.parseDate(date);

            if (!dateObj) {
                return false;
            }

            const dayOfWeek = dateObj.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        } catch (error) {
            logger.error('Error checking if date is weekend:', error);
            return false;
        }
    }

    /**
     * Get next business day
     * @param {Date|string} startDate - Start date
     * @returns {Date} Next business day
     */
    static getNextBusinessDay(startDate) {
        try {
            const date = this.parseDate(startDate);

            if (!date) {
                throw new Error('Invalid start date');
            }

            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            // If next day is weekend, skip to Monday
            if (nextDay.getDay() === 0) { // Sunday
                nextDay.setDate(date.getDate() + 2);
            } else if (nextDay.getDay() === 6) { // Saturday
                nextDay.setDate(date.getDate() + 2);
            }

            return nextDay;
        } catch (error) {
            logger.error('Error getting next business day:', error);
            throw error;
        }
    }
}

export default DateUtils;