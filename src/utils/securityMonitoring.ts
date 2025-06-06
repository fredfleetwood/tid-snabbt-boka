
import { logSecurityEvent } from './security';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced security monitoring with real-time threat detection
 */

interface SecurityMetrics {
  failedAttempts: number;
  lastAttempt: number;
  blocked: boolean;
}

class SecurityMonitor {
  private userMetrics = new Map<string, SecurityMetrics>();
  private readonly maxFailedAttempts = 5;
  private readonly blockDurationMs = 15 * 60 * 1000; // 15 minutes
  private readonly attemptWindowMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Records a failed authentication attempt
   */
  recordFailedAttempt(identifier: string): boolean {
    const now = Date.now();
    const metrics = this.userMetrics.get(identifier) || {
      failedAttempts: 0,
      lastAttempt: 0,
      blocked: false
    };

    // Reset if window has passed
    if (now - metrics.lastAttempt > this.attemptWindowMs) {
      metrics.failedAttempts = 0;
      metrics.blocked = false;
    }

    metrics.failedAttempts++;
    metrics.lastAttempt = now;

    // Block if too many attempts
    if (metrics.failedAttempts >= this.maxFailedAttempts) {
      metrics.blocked = true;
      logSecurityEvent('USER_BLOCKED_TOO_MANY_ATTEMPTS', { 
        identifier: identifier.substring(0, 10) + '...',
        attempts: metrics.failedAttempts 
      });
    }

    this.userMetrics.set(identifier, metrics);
    return metrics.blocked;
  }

  /**
   * Checks if a user is currently blocked
   */
  isBlocked(identifier: string): boolean {
    const metrics = this.userMetrics.get(identifier);
    if (!metrics || !metrics.blocked) return false;

    // Check if block has expired
    if (Date.now() - metrics.lastAttempt > this.blockDurationMs) {
      metrics.blocked = false;
      metrics.failedAttempts = 0;
      this.userMetrics.set(identifier, metrics);
      return false;
    }

    return true;
  }

  /**
   * Records a successful authentication (clears failed attempts)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.userMetrics.delete(identifier);
  }

  /**
   * Monitors suspicious database operations
   */
  async monitorDatabaseOperation(operation: string, table: string, userId?: string): Promise<void> {
    try {
      // Log the operation for audit trail
      logSecurityEvent('DATABASE_OPERATION', {
        operation,
        table,
        userId: userId?.substring(0, 8) + '...'
      });

      // Check for suspicious patterns
      if (this.isSuspiciousOperation(operation, table)) {
        logSecurityEvent('SUSPICIOUS_DATABASE_OPERATION', {
          operation,
          table,
          userId: userId?.substring(0, 8) + '...'
        });
      }
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }

  private isSuspiciousOperation(operation: string, table: string): boolean {
    // Define suspicious patterns
    const suspiciousPatterns = [
      // Mass deletion attempts
      { op: 'DELETE', tables: ['booking_configs', 'booking_sessions'] },
      // Bulk updates
      { op: 'UPDATE', tables: ['subscriptions'] }
    ];

    return suspiciousPatterns.some(pattern => 
      pattern.op === operation && pattern.tables.includes(table)
    );
  }
}

export const securityMonitor = new SecurityMonitor();

/**
 * Enhanced rate limiter with IP and user-based tracking
 */
export class EnhancedRateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();
  private readonly limits = {
    auth: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    api: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 requests per minute
    booking: { maxAttempts: 3, windowMs: 60 * 60 * 1000 } // 3 booking attempts per hour
  };

  isAllowed(identifier: string, type: keyof typeof this.limits): boolean {
    const limit = this.limits[type];
    const now = Date.now();
    const userAttempts = this.attempts.get(`${type}_${identifier}`);

    if (!userAttempts) {
      this.attempts.set(`${type}_${identifier}`, { count: 1, lastAttempt: now, blocked: false });
      return true;
    }

    // Reset if window has passed
    if (now - userAttempts.lastAttempt > limit.windowMs) {
      this.attempts.set(`${type}_${identifier}`, { count: 1, lastAttempt: now, blocked: false });
      return true;
    }

    // Check if already blocked
    if (userAttempts.blocked) {
      logSecurityEvent('RATE_LIMIT_BLOCKED_REQUEST', { identifier: identifier.substring(0, 10) + '...', type });
      return false;
    }

    // Check if limit exceeded
    if (userAttempts.count >= limit.maxAttempts) {
      userAttempts.blocked = true;
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier: identifier.substring(0, 10) + '...', type });
      return false;
    }

    // Increment count
    userAttempts.count++;
    userAttempts.lastAttempt = now;
    return true;
  }

  reset(identifier: string, type: keyof typeof this.limits): void {
    this.attempts.delete(`${type}_${identifier}`);
  }
}

export const enhancedRateLimiter = new EnhancedRateLimiter();

/**
 * Security validation for frontend operations
 */
export const validateSecureOperation = async (operation: string, data?: any): Promise<boolean> => {
  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logSecurityEvent('UNAUTHENTICATED_OPERATION_ATTEMPT', { operation });
      return false;
    }

    // Check rate limits
    if (!enhancedRateLimiter.isAllowed(user.id, 'api')) {
      return false;
    }

    // Validate data integrity
    if (data && typeof data === 'object') {
      const hasUserId = 'user_id' in data;
      if (hasUserId && data.user_id !== user.id) {
        logSecurityEvent('USER_ID_MISMATCH_ATTEMPT', { 
          operation,
          attemptedUserId: data.user_id?.substring(0, 8) + '...',
          actualUserId: user.id.substring(0, 8) + '...'
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logSecurityEvent('SECURITY_VALIDATION_ERROR', { operation, error: error.message });
    return false;
  }
};
