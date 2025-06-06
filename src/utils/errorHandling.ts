
import { logSecurityEvent } from './security';

/**
 * Enhanced error handling with security considerations
 */

export interface SafeError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Sanitizes error messages to prevent information leakage
 */
export const sanitizeError = (error: any): SafeError => {
  // Log the original error for debugging (server-side only)
  if (typeof window === 'undefined') {
    console.error('Original error:', error);
  }

  // Common safe error messages
  const safeMessages = {
    NETWORK_ERROR: 'Ett nätverksfel uppstod. Försök igen senare.',
    AUTH_ERROR: 'Autentiseringsfel. Logga in igen.',
    VALIDATION_ERROR: 'Ogiltiga data skickades.',
    PERMISSION_ERROR: 'Du har inte behörighet för denna åtgärd.',
    RATE_LIMIT_ERROR: 'För många försök. Vänta en stund innan du försöker igen.',
    DATABASE_ERROR: 'Ett databasfel uppstod. Försök igen senare.',
    GENERIC_ERROR: 'Ett oväntat fel uppstod. Försök igen senare.'
  };

  // Check for specific error types
  if (error?.message?.includes('rate limit')) {
    logSecurityEvent('RATE_LIMIT_ERROR', { error: error.message });
    return { message: safeMessages.RATE_LIMIT_ERROR, code: 'RATE_LIMIT', statusCode: 429 };
  }

  if (error?.message?.includes('auth') || error?.code === 'PGRST301') {
    logSecurityEvent('AUTH_ERROR', { error: error.message });
    return { message: safeMessages.AUTH_ERROR, code: 'AUTH_ERROR', statusCode: 401 };
  }

  if (error?.message?.includes('permission') || error?.code === 'PGRST116') {
    logSecurityEvent('PERMISSION_ERROR', { error: error.message });
    return { message: safeMessages.PERMISSION_ERROR, code: 'PERMISSION_ERROR', statusCode: 403 };
  }

  if (error?.message?.includes('network') || error?.name === 'NetworkError') {
    return { message: safeMessages.NETWORK_ERROR, code: 'NETWORK_ERROR', statusCode: 500 };
  }

  if (error?.message?.includes('validation') || error?.message?.includes('constraint')) {
    logSecurityEvent('VALIDATION_ERROR', { error: error.message });
    return { message: safeMessages.VALIDATION_ERROR, code: 'VALIDATION_ERROR', statusCode: 400 };
  }

  // Log unknown errors for investigation
  logSecurityEvent('UNKNOWN_ERROR', { 
    message: error?.message || 'Unknown error',
    code: error?.code,
    name: error?.name
  });

  return { message: safeMessages.GENERIC_ERROR, code: 'GENERIC_ERROR', statusCode: 500 };
};

/**
 * Enhanced error boundary component
 */
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    const safeError = sanitizeError(error);
    console.error('Async operation failed:', safeError);
    return fallback;
  }
};

/**
 * Security-aware fetch wrapper
 */
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};
