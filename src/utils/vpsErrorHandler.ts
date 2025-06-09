
import { toast } from '@/hooks/use-toast';

export interface VPSError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

export class VPSErrorHandler {
  private static retryCounters = new Map<string, number>();
  
  private static readonly ERROR_MAPPINGS: Record<string, VPSError> = {
    // Network errors
    'NETWORK_ERROR': {
      code: 'NETWORK_ERROR',
      message: 'Network error - unable to connect to VPS server',
      userMessage: 'Kan inte ansluta till VPS-servern. Kontrollera din internetanslutning.',
      retryable: true,
      severity: 'high'
    },
    'TIMEOUT': {
      code: 'TIMEOUT',
      message: 'Request timeout',
      userMessage: 'Begäran tog för lång tid. Försöker igen automatiskt.',
      retryable: true,
      severity: 'medium'
    },
    'CONNECTION_REFUSED': {
      code: 'CONNECTION_REFUSED',
      message: 'Connection refused by VPS server',
      userMessage: 'VPS-servern avvisade anslutningen. Servern kan vara överbelastad.',
      retryable: true,
      severity: 'high'
    },

    // Authentication errors
    'INVALID_TOKEN': {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token',
      userMessage: 'Ogiltigt autentiseringstoken. Vänligen logga in igen.',
      retryable: false,
      severity: 'high'
    },
    'UNAUTHORIZED': {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access to VPS server',
      userMessage: 'Otillåten åtkomst till VPS-servern. Kontrollera dina rättigheter.',
      retryable: false,
      severity: 'high'
    },

    // Rate limiting
    'RATE_LIMITED': {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      userMessage: 'För många förfrågningar. Väntar innan nästa försök.',
      retryable: true,
      severity: 'medium'
    },

    // Server errors
    'VPS_OFFLINE': {
      code: 'VPS_OFFLINE',
      message: 'VPS server is offline or unreachable',
      userMessage: 'VPS-servern är offline. Byter till lokalt läge.',
      retryable: true,
      severity: 'critical'
    },
    'VPS_OVERLOADED': {
      code: 'VPS_OVERLOADED',
      message: 'VPS server is overloaded',
      userMessage: 'VPS-servern är överbelastad. Försöker igen senare.',
      retryable: true,
      severity: 'high'
    },
    'INTERNAL_SERVER_ERROR': {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error on VPS',
      userMessage: 'Internt serverfel på VPS. Teknisk support har informerats.',
      retryable: true,
      severity: 'high'
    },

    // WebSocket errors
    'WEBSOCKET_CONNECTION_FAILED': {
      code: 'WEBSOCKET_CONNECTION_FAILED',
      message: 'WebSocket connection failed',
      userMessage: 'Realtidsanslutning misslyckades. Uppdateringar kommer att försenas.',
      retryable: true,
      severity: 'medium'
    },
    'WEBSOCKET_TIMEOUT': {
      code: 'WEBSOCKET_TIMEOUT',
      message: 'WebSocket connection timeout',
      userMessage: 'Realtidsanslutning timeout. Återansluter automatiskt.',
      retryable: true,
      severity: 'medium'
    },

    // Booking errors
    'BOOKING_START_FAILED': {
      code: 'BOOKING_START_FAILED',
      message: 'Failed to start booking automation',
      userMessage: 'Kunde inte starta bokningsautomation. Kontrollera din konfiguration.',
      retryable: true,
      severity: 'high'
    },
    'BOOKING_STOP_FAILED': {
      code: 'BOOKING_STOP_FAILED',
      message: 'Failed to stop booking automation',
      userMessage: 'Kunde inte stoppa bokningsautomation. Kontakta support om problemet kvarstår.',
      retryable: true,
      severity: 'medium'
    },

    // Unknown errors
    'UNKNOWN_ERROR': {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      userMessage: 'Ett oväntat fel inträffade. Försöker igen automatiskt.',
      retryable: true,
      severity: 'medium'
    }
  };

  static handleError(
    error: Error | string, 
    context?: string,
    showToast: boolean = true
  ): VPSError {
    console.error('[VPS-ERROR-HANDLER]', { error, context });

    let vpsError: VPSError;
    
    if (typeof error === 'string') {
      vpsError = this.ERROR_MAPPINGS[error] || this.ERROR_MAPPINGS.UNKNOWN_ERROR;
    } else {
      vpsError = this.mapErrorToVPSError(error);
    }

    // Add context to error message if provided
    if (context) {
      vpsError = {
        ...vpsError,
        message: `${vpsError.message} (Context: ${context})`
      };
    }

    // Show toast notification
    if (showToast) {
      this.showErrorToast(vpsError);
    }

    // Log for monitoring
    this.logError(vpsError, context);

    return vpsError;
  }

  private static mapErrorToVPSError(error: Error): VPSError {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('fetch') || message.includes('network')) {
      return this.ERROR_MAPPINGS.NETWORK_ERROR;
    }
    if (message.includes('timeout') || message.includes('aborted')) {
      return this.ERROR_MAPPINGS.TIMEOUT;
    }
    if (message.includes('connection refused')) {
      return this.ERROR_MAPPINGS.CONNECTION_REFUSED;
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return this.ERROR_MAPPINGS.UNAUTHORIZED;
    }
    if (message.includes('invalid') && message.includes('token')) {
      return this.ERROR_MAPPINGS.INVALID_TOKEN;
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return this.ERROR_MAPPINGS.RATE_LIMITED;
    }

    // Server errors
    if (message.includes('500') || message.includes('internal server')) {
      return this.ERROR_MAPPINGS.INTERNAL_SERVER_ERROR;
    }
    if (message.includes('503') || message.includes('overload')) {
      return this.ERROR_MAPPINGS.VPS_OVERLOADED;
    }

    // WebSocket errors
    if (message.includes('websocket')) {
      return this.ERROR_MAPPINGS.WEBSOCKET_CONNECTION_FAILED;
    }

    // Default to unknown error
    return this.ERROR_MAPPINGS.UNKNOWN_ERROR;
  }

  private static showErrorToast(vpsError: VPSError): void {
    const variant = vpsError.severity === 'critical' || vpsError.severity === 'high' 
      ? 'destructive' 
      : 'default';

    toast({
      title: this.getErrorTitle(vpsError.severity),
      description: vpsError.userMessage,
      variant,
    });
  }

  private static getErrorTitle(severity: VPSError['severity']): string {
    switch (severity) {
      case 'critical': return '🚨 Kritiskt fel';
      case 'high': return '⚠️ Allvarligt fel';
      case 'medium': return '⚡ Anslutningsproblem';
      case 'low': return 'ℹ️ Information';
      default: return 'Fel';
    }
  }

  private static logError(vpsError: VPSError, context?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      code: vpsError.code,
      message: vpsError.message,
      severity: vpsError.severity,
      context,
      retryable: vpsError.retryable
    };

    // Log to console for debugging
    console.error('[VPS-ERROR-LOG]', logData);

    // TODO: Send to monitoring service in production
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const defaultOptions: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2
    };

    const retryOptions = { ...defaultOptions, ...options };
    const retryKey = operationName;
    let currentAttempt = this.retryCounters.get(retryKey) || 0;

    while (currentAttempt < retryOptions.maxAttempts) {
      try {
        const result = await operation();
        // Reset retry counter on success
        this.retryCounters.delete(retryKey);
        return result;
      } catch (error) {
        currentAttempt++;
        this.retryCounters.set(retryKey, currentAttempt);

        const vpsError = this.handleError(
          error as Error, 
          `Attempt ${currentAttempt}/${retryOptions.maxAttempts} for ${operationName}`,
          currentAttempt === 1 // Only show toast on first failure
        );

        // Don't retry if error is not retryable
        if (!vpsError.retryable) {
          throw error;
        }

        // Don't retry if we've reached max attempts
        if (currentAttempt >= retryOptions.maxAttempts) {
          toast({
            title: '🚨 Upprepade fel',
            description: `Kunde inte genomföra ${operationName} efter ${retryOptions.maxAttempts} försök.`,
            variant: 'destructive'
          });
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.baseDelay * Math.pow(retryOptions.exponentialBase, currentAttempt - 1),
          retryOptions.maxDelay
        );

        console.log(`[VPS-RETRY] ${operationName} attempt ${currentAttempt} failed, retrying in ${delay}ms`);
        
        // Show retry notification
        if (currentAttempt > 1) {
          toast({
            title: '🔄 Försöker igen',
            description: `Försök ${currentAttempt} av ${retryOptions.maxAttempts} för ${operationName}`,
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Max retry attempts exceeded for ${operationName}`);
  }

  static getRetryCount(operationName: string): number {
    return this.retryCounters.get(operationName) || 0;
  }

  static resetRetryCount(operationName: string): void {
    this.retryCounters.delete(operationName);
  }

  static clearAllRetryCounters(): void {
    this.retryCounters.clear();
  }
}

// Convenience functions for common error scenarios
export const handleVPSError = VPSErrorHandler.handleError;
export const retryVPSOperation = VPSErrorHandler.withRetry;
