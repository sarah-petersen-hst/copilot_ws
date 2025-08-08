// validation.js - Input validation utilities for security
const validator = require('validator');

/**
 * Validates city name input - allows German cities with numbers, hyphens, spaces
 * @param {string} city - City name to validate
 * @returns {boolean} - True if valid
 */
function validateCity(city) {
  if (!city || typeof city !== 'string') return false;
  
  // Trim whitespace
  city = city.trim();
  
  // Check length (1-100 characters)
  if (city.length < 1 || city.length > 100) return false;
  
  // Allow letters, numbers, spaces, hyphens, apostrophes, and German characters
  // This allows cities like "Berlin-Mitte", "Frankfurt am Main", etc.
  const cityRegex = /^[a-zA-ZÀ-ÿ0-9\s'-]+$/;
  return cityRegex.test(city);
}

/**
 * Validates event ID parameter
 * @param {any} eventId - Event ID to validate
 * @returns {boolean} - True if valid positive integer
 */
function validateEventId(eventId) {
  if (!eventId) return false;
  
  // Convert to number and check if it's a positive integer
  const id = parseInt(eventId, 10);
  return !isNaN(id) && id > 0 && id.toString() === eventId.toString();
}

/**
 * Validates user ID format (UUID-like format expected)
 * @param {string} userId - User ID to validate
 * @returns {boolean} - True if valid UUID format
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  
  // Check if it's a valid UUID format
  return validator.isUUID(userId, 4); // UUID v4
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid date format
 */
function validateDate(date) {
  if (!date || typeof date !== 'string') return false;
  
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  
  // Check if it's a valid date
  return validator.isDate(date, { format: 'YYYY-MM-DD' });
}

/**
 * Validates vote type
 * @param {string} voteType - Vote type to validate
 * @returns {boolean} - True if valid vote type
 */
function validateVoteType(voteType) {
  return ['exists', 'notexists'].includes(voteType);
}

/**
 * Validates venue vote type
 * @param {string} venueType - Venue type to validate
 * @returns {boolean} - True if valid venue type
 */
function validateVenueType(venueType) {
  return ['indoor', 'outdoor'].includes(venueType);
}

/**
 * Sanitizes error messages to prevent information disclosure
 * @param {Error} error - Error object
 * @returns {string} - Sanitized error message
 */
function sanitizeError(error) {
  // In production, don't expose detailed error messages
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred while processing your request';
  }
  
  // In development, provide more details but still sanitize sensitive info
  const message = error.message || 'Unknown error';
  
  // Remove any potential sensitive information patterns
  return message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/key[=:]\s*\S+/gi, 'key=***')
    .replace(/token[=:]\s*\S+/gi, 'token=***');
}

module.exports = {
  validateCity,
  validateEventId,
  validateUserId,
  validateDate,
  validateVoteType,
  validateVenueType,
  sanitizeError
};
