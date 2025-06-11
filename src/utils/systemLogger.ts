import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Component = 'frontend' | 'edge-function' | 'vps' | 'database';

interface LogEntry {
  level: LogLevel;
  component: Component;
  operation: string;
  message: string;
  user_id?: string;
  session_id?: string;
  job_id?: string;
  data?: any;
  duration_ms?: number;
  error_details?: any;
  trace_id?: string;
  step_number?: number;
}

class SystemLogger {
  private traceId: string = '';
  private stepCounter: number = 0;
  private context: Partial<LogEntry> = {};

  constructor() {
    this.generateNewTrace();
  }

  generateNewTrace(): string {
    this.traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.stepCounter = 0;
    console.log(`🆔 New trace: ${this.traceId}`);
    return this.traceId;
  }

  setContext(context: Partial<LogEntry>): void {
    this.context = { ...this.context, ...context };
  }

  async log(entry: Omit<LogEntry, 'trace_id' | 'step_number'>): Promise<void> {
    this.stepCounter++;
    
    const fullEntry: LogEntry = {
      ...this.context,
      ...entry,
      trace_id: this.traceId,
      step_number: this.stepCounter,
    };

    // Console log
    const emoji = this.getLogEmoji(entry.level);
    console.log(
      `${emoji} [${entry.component}] [${entry.operation}] ${entry.message}`,
      entry.data || ''
    );

    // Store in Supabase
    try {
      await (supabase as any).from('system_logs').insert(fullEntry);
    } catch (error) {
      console.warn('Failed to store log:', error);
    }
  }

  // Basic methods
  async info(operation: string, message: string, data?: any): Promise<void> {
    await this.log({
      level: 'info',
      component: 'frontend',
      operation,
      message,
      data
    });
  }

  async error(operation: string, message: string, error?: any, data?: any): Promise<void> {
    await this.log({
      level: 'error',
      component: 'frontend',
      operation,
      message,
      data,
      error_details: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  // Booking-specific helpers
  async logBookingStart(userId: string, configId: string, config: any): Promise<void> {
    this.generateNewTrace();
    this.setContext({ user_id: userId, session_id: configId });
    await this.info('start-booking', 'Booking initiated', {
      config_id: configId,
      license_type: config.license_type,
      exam: config.exam,
      locations: config.locations?.length || 0
    });
  }

  async logEdgeFunctionCall(functionName: string, payload: any): Promise<void> {
    await this.info('edge-function-call', `Calling: ${functionName}`, {
      function_name: functionName,
      payload_size: JSON.stringify(payload).length
    });
  }

  async logEdgeFunctionResponse(functionName: string, success: boolean, data?: any, error?: any): Promise<void> {
    if (success) {
      await this.info('edge-function-response', `Success: ${functionName}`, data);
    } else {
      await this.error('edge-function-response', `Failed: ${functionName}`, error);
    }
  }

  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  getCurrentTraceId(): string {
    return this.traceId;
  }
}

export const systemLogger = new SystemLogger();
export default systemLogger; 