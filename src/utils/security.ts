/**
 * Enhanced security utility functions for handling sensitive data
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
 * Enhanced personnummer validation with security logging
 * @param personnummer - The personnummer to validate
 * @returns boolean indicating if format is valid
 */
export const isValidPersonnummerFormat = (personnummer: string): boolean => {
  if (!personnummer) return false;
  
  const cleaned = personnummer.replace(/[-\s]/g, '');
  
  // Should be 10 or 12 digits
  if (![10, 12].includes(cleaned.length)) {
    logSecurityEvent('INVALID_PERSONNUMMER_LENGTH', { length: cleaned.length });
    return false;
  }
  
  // Should contain only digits
  if (!/^\d+$/.test(cleaned)) {
    logSecurityEvent('INVALID_PERSONNUMMER_CHARACTERS');
    return false;
  }

  // Additional validation for Swedish personnummer
  if (cleaned.length === 10) {
    // YYMMDDXXXX format
    const year = parseInt(cleaned.slice(0, 2));
    const month = parseInt(cleaned.slice(2, 4));
    const day = parseInt(cleaned.slice(4, 6));
    
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      logSecurityEvent('INVALID_PERSONNUMMER_DATE');
      return false;
    }
  } else if (cleaned.length === 12) {
    // YYYYMMDDXXXX format
    const year = parseInt(cleaned.slice(0, 4));
    const month = parseInt(cleaned.slice(4, 6));
    const day = parseInt(cleaned.slice(6, 8));
    
    if (year < 1900 || year > new Date().getFullYear() || 
        month < 1 || month > 12 || day < 1 || day > 31) {
      logSecurityEvent('INVALID_PERSONNUMMER_DATE');
      return false;
    }
  }
  
  return true;
};

/**
 * Enhanced input sanitization to prevent XSS and injection attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim()
    .slice(0, 1000); // Limit length to prevent DoS
};

/**
 * Enhanced security event logging with rate limiting
 * @param event - The security event type
 * @param details - Additional details about the event
 */
const logRateLimit = new Map<string, { count: number; lastLog: number }>();

export const logSecurityEvent = (event: string, details?: any): void => {
  const now = Date.now();
  const key = `${event}_${details?.userId || 'anonymous'}`;
  const rateLimit = logRateLimit.get(key);
  
  // Rate limit logging to prevent log spam
  if (rateLimit && now - rateLimit.lastLog < 60000 && rateLimit.count > 10) {
    return; // Skip logging if more than 10 events per minute for same user/event
  }
  
  if (!rateLimit) {
    logRateLimit.set(key, { count: 1, lastLog: now });
  } else {
    rateLimit.count++;
    rateLimit.lastLog = now;
  }

  // Clean sensitive data from logs
  const cleanedDetails = details ? {
    ...details,
    // Remove sensitive fields
    personnummer: details.personnummer ? maskPersonnummer(details.personnummer) : undefined,
    password: undefined,
    token: undefined,
    // Keep only first 100 chars of error messages
    error: typeof details.error === 'string' ? details.error.slice(0, 100) : details.error,
  } : undefined;

  console.log(`[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    ...cleanedDetails
  });
};

/**
 * Validates file uploads for security
 * @param file - The file to validate
 * @returns Validation result
 */
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (file.size > maxSize) {
    logSecurityEvent('FILE_UPLOAD_SIZE_EXCEEDED', { size: file.size, fileName: file.name });
    return { isValid: false, error: 'Filen är för stor (max 10MB)' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    logSecurityEvent('FILE_UPLOAD_INVALID_TYPE', { type: file.type, fileName: file.name });
    return { isValid: false, error: 'Filtypen stöds inte' };
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [/\.php$/i, /\.jsp$/i, /\.asp$/i, /\.exe$/i, /\.bat$/i];
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    logSecurityEvent('FILE_UPLOAD_SUSPICIOUS_NAME', { fileName: file.name });
    return { isValid: false, error: 'Filnamnet är inte tillåtet' };
  }
  
  return { isValid: true };
};

/**
 * Generates a secure random string
 * @param length - The length of the string to generate
 * @returns Random string
 */
export const generateSecureRandom = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for server-side
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
};

/**
 * Enhanced CSRF protection
 */
export const generateCSRFToken = (): string => {
  const token = generateSecureRandom(32);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  if (typeof window === 'undefined') return true; // Skip on server
  
  const storedToken = sessionStorage.getItem('csrf_token');
  const isValid = storedToken === token;
  
  if (!isValid) {
    logSecurityEvent('CSRF_TOKEN_VALIDATION_FAILED');
  }
  
  return isValid;
};
