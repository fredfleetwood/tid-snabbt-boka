
import { sanitizeInput, isValidPersonnummerFormat, logSecurityEvent } from './security';

/**
 * Enhanced validation utilities with security logging
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * Validates and sanitizes booking configuration data
 */
export const validateBookingConfig = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  // Validate and sanitize personnummer
  if (!data.personnummer) {
    errors.push('Personnummer är obligatoriskt');
  } else {
    const sanitizedPersonnummer = sanitizeInput(data.personnummer);
    if (!isValidPersonnummerFormat(sanitizedPersonnummer)) {
      errors.push('Ogiltigt personnummer format. Använd format YYYYMMDD-XXXX');
      logSecurityEvent('INVALID_PERSONNUMMER_FORMAT', { 
        attemptedValue: sanitizedPersonnummer?.substring(0, 6) + '****' // Log only birth date part
      });
    } else {
      sanitizedData.personnummer = sanitizedPersonnummer;
    }
  }

  // Validate license type
  const validLicenseTypes = ['A', 'A1', 'A2', 'B', 'BE', 'C', 'CE', 'D', 'DE'];
  if (!data.license_type || !validLicenseTypes.includes(data.license_type)) {
    errors.push('Ogiltig körkortsbehörighet');
  } else {
    sanitizedData.license_type = sanitizeInput(data.license_type);
  }

  // Validate exam type
  const validExamTypes = ['Körprov', 'Teoriprove'];
  if (!data.exam || !validExamTypes.includes(data.exam)) {
    errors.push('Ogiltig provtyp');
  } else {
    sanitizedData.exam = sanitizeInput(data.exam);
  }

  // Validate vehicle/language array
  if (!Array.isArray(data.vehicle_language) || data.vehicle_language.length === 0) {
    errors.push('Minst en språk/fordon måste väljas');
  } else {
    sanitizedData.vehicle_language = data.vehicle_language.map((item: string) => sanitizeInput(item));
  }

  // Validate date ranges
  if (!Array.isArray(data.date_ranges) || data.date_ranges.length === 0) {
    errors.push('Minst en datumperiod måste väljas');
  } else {
    const validDateRanges = data.date_ranges.filter((range: any) => {
      if (!range.from || !range.to) return false;
      const fromDate = new Date(range.from);
      const toDate = new Date(range.to);
      return !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && fromDate <= toDate;
    });
    
    if (validDateRanges.length === 0) {
      errors.push('Inga giltiga datumperioder funna');
    } else {
      sanitizedData.date_ranges = validDateRanges;
    }
  }

  // Validate locations (optional but must be array if provided)
  if (data.locations && !Array.isArray(data.locations)) {
    errors.push('Platser måste vara en lista');
  } else {
    sanitizedData.locations = data.locations ? data.locations.map((loc: string) => sanitizeInput(loc)) : [];
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};

/**
 * Rate limiting tracker
 */
class RateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window has passed
    if (now - userAttempts.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if limit exceeded
    if (userAttempts.count >= this.maxAttempts) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier });
      return false;
    }

    // Increment count
    userAttempts.count++;
    userAttempts.lastAttempt = now;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Validates subscription data
 */
export const validateSubscriptionData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  // Validate status
  const validStatuses = ['active', 'inactive', 'grace_period', 'expired'];
  if (!data.status || !validStatuses.includes(data.status)) {
    errors.push('Ogiltig prenumerationsstatus');
  } else {
    sanitizedData.status = data.status;
  }

  // Validate currency
  if (data.currency && data.currency !== 'sek') {
    errors.push('Endast SEK stöds för närvarande');
  } else {
    sanitizedData.currency = 'sek';
  }

  // Validate amount if provided
  if (data.amount_paid && (typeof data.amount_paid !== 'number' || data.amount_paid < 0)) {
    errors.push('Ogiltigt belopp');
  } else if (data.amount_paid) {
    sanitizedData.amount_paid = data.amount_paid;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};
