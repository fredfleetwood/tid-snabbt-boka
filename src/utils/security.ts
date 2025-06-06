
/**
 * Security utility functions for handling sensitive data
 */

/**
 * Masks a Swedish personnummer for display purposes
 * Shows only the first 6 digits (birth date) and masks the last 4 digits
 * @param personnummer - The personnummer to mask (format: YYYYMMDD-XXXX)
 * @returns Masked personnummer (format: YYYYMMDD-****)
 */
export const maskPersonnummer = (personnummer: string): string => {
  if (!personnummer) return '';
  
  // Remove any existing dashes and spaces for normalization
  const cleaned = personnummer.replace(/[-\s]/g, '');
  
  // Swedish personnummer can be 10 or 12 digits
  if (cleaned.length === 10) {
    // Format: YYMMDDXXXX -> YYMMDD-****
    return `${cleaned.slice(0, 6)}-****`;
  } else if (cleaned.length === 12) {
    // Format: YYYYMMDDXXXX -> YYYYMMDD-****
    return `${cleaned.slice(0, 8)}-****`;
  }
  
  // If format is unexpected, mask everything except first 6 characters
  return cleaned.length > 6 ? `${cleaned.slice(0, 6)}****` : '****';
};

/**
 * Validates personnummer format (basic client-side validation)
 * @param personnummer - The personnummer to validate
 * @returns boolean indicating if format is valid
 */
export const isValidPersonnummerFormat = (personnummer: string): boolean => {
  if (!personnummer) return false;
  
  const cleaned = personnummer.replace(/[-\s]/g, '');
  
  // Should be 10 or 12 digits
  if (![10, 12].includes(cleaned.length)) return false;
  
  // Should contain only digits
  return /^\d+$/.test(cleaned);
};

/**
 * Sanitizes input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim();
};

/**
 * Logs security events for monitoring
 * @param event - The security event type
 * @param details - Additional details about the event
 */
export const logSecurityEvent = (event: string, details?: any): void => {
  console.log(`[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  });
};
