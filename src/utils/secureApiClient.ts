
import { supabase } from '@/integrations/supabase/client';
import { sanitizeError } from './errorHandling';
import { validateSecureOperation, securityMonitor } from './securityMonitoring';
import { logSecurityEvent } from './security';

/**
 * Secure API client wrapper with enhanced error handling and monitoring
 */

interface SecureQueryOptions {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  requireAuth?: boolean;
  rateLimitType?: 'api' | 'booking';
}

class SecureApiClient {
  /**
   * Secure database query wrapper
   */
  async secureQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: SecureQueryOptions
  ): Promise<{ data: T | null; error: any }> {
    try {
      // Validate the operation is secure
      const isValid = await validateSecureOperation(`${options.operation}_${options.table}`);
      if (!isValid) {
        return {
          data: null,
          error: { message: 'Unauthorized operation', code: 'UNAUTHORIZED' }
        };
      }

      // Monitor the database operation
      const { data: { user } } = await supabase.auth.getUser();
      await securityMonitor.monitorDatabaseOperation(
        options.operation,
        options.table,
        user?.id
      );

      // Execute the query
      const result = await queryFn();

      // Log successful operations for audit trail
      if (!result.error) {
        logSecurityEvent('SECURE_OPERATION_SUCCESS', {
          operation: options.operation,
          table: options.table,
          userId: user?.id?.substring(0, 8) + '...'
        });
      } else {
        logSecurityEvent('SECURE_OPERATION_ERROR', {
          operation: options.operation,
          table: options.table,
          error: result.error.message
        });
      }

      return result;
    } catch (error) {
      const safeError = sanitizeError(error);
      logSecurityEvent('SECURE_QUERY_EXCEPTION', {
        operation: options.operation,
        table: options.table,
        error: safeError.message
      });

      return {
        data: null,
        error: safeError
      };
    }
  }

  /**
   * Secure function invocation wrapper
   */
  async secureInvoke<T>(
    functionName: string,
    body?: any
  ): Promise<{ data: T | null; error: any }> {
    try {
      // Validate the operation
      const isValid = await validateSecureOperation(`FUNCTION_${functionName}`, body);
      if (!isValid) {
        return {
          data: null,
          error: { message: 'Unauthorized function call', code: 'UNAUTHORIZED' }
        };
      }

      // Execute the function
      const result = await supabase.functions.invoke(functionName, { body });

      // Log the operation
      const { data: { user } } = await supabase.auth.getUser();
      logSecurityEvent('SECURE_FUNCTION_CALL', {
        function: functionName,
        userId: user?.id?.substring(0, 8) + '...',
        success: !result.error
      });

      return result;
    } catch (error) {
      const safeError = sanitizeError(error);
      logSecurityEvent('SECURE_FUNCTION_ERROR', {
        function: functionName,
        error: safeError.message
      });

      return {
        data: null,
        error: safeError
      };
    }
  }
}

export const secureApiClient = new SecureApiClient();

/**
 * Secure hooks for common database operations
 */
export const useSecureBookingConfigs = () => {
  const fetchConfigs = async () => {
    return secureApiClient.secureQuery(
      async () => {
        const result = await supabase.from('booking_configs').select('*').order('created_at', { ascending: false });
        return result;
      },
      { table: 'booking_configs', operation: 'SELECT' }
    );
  };

  const createConfig = async (config: any) => {
    return secureApiClient.secureQuery(
      async () => {
        const result = await supabase.from('booking_configs').insert(config).select().single();
        return result;
      },
      { table: 'booking_configs', operation: 'INSERT' }
    );
  };

  const updateConfig = async (id: string, updates: any) => {
    return secureApiClient.secureQuery(
      async () => {
        const result = await supabase.from('booking_configs').update(updates).eq('id', id).select().single();
        return result;
      },
      { table: 'booking_configs', operation: 'UPDATE' }
    );
  };

  const deleteConfig = async (id: string) => {
    return secureApiClient.secureQuery(
      async () => {
        const result = await supabase.from('booking_configs').delete().eq('id', id);
        return result;
      },
      { table: 'booking_configs', operation: 'DELETE' }
    );
  };

  return { fetchConfigs, createConfig, updateConfig, deleteConfig };
};

export const useSecureBookingSessions = () => {
  const fetchSessions = async (configId?: string) => {
    return secureApiClient.secureQuery(
      async () => {
        const query = supabase.from('booking_sessions').select('*');
        if (configId) {
          query.eq('config_id', configId);
        }
        const result = await query.order('created_at', { ascending: false });
        return result;
      },
      { table: 'booking_sessions', operation: 'SELECT' }
    );
  };

  const startBooking = async (configId: string) => {
    return secureApiClient.secureInvoke('start-booking', { config_id: configId });
  };

  const stopBooking = async (sessionId: string, triggerRunId?: string) => {
    return secureApiClient.secureInvoke('stop-booking', { 
      session_id: sessionId,
      trigger_run_id: triggerRunId 
    });
  };

  return { fetchSessions, startBooking, stopBooking };
};
