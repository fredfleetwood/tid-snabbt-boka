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
  parent_trace_id?: string;
}

interface TraceMetrics {
  startTime: number;
  stepCount: number;
  errors: number;
}

class SystemLogger {
  private traceId: string = '';
  private stepCounter: number = 0;
  private context: Partial<LogEntry> = {};
  private parentTraceId?: string;
  private traceMetrics: TraceMetrics = { startTime: 0, stepCount: 0, errors: 0 };

  constructor() {
    this.generateNewTrace();
  }

  generateNewTrace(): string {
    this.traceId = `frontend_trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.stepCounter = 0;
    this.parentTraceId = undefined;
    this.traceMetrics = { startTime: Date.now(), stepCount: 0, errors: 0 };
    
    console.log(`🆔 New frontend trace: ${this.traceId}`);
    return this.traceId;
  }

  continueTrace(externalTraceId: string): string {
    this.parentTraceId = this.traceId;
    this.traceId = `${externalTraceId}_frontend_${Date.now() % 10000}`;
    this.stepCounter = 0;
    this.traceMetrics = { startTime: Date.now(), stepCount: 0, errors: 0 };
    
    console.log(`🔗 Continuing trace: ${externalTraceId} -> ${this.traceId}`);
    return this.traceId;
  }

  setContext(context: Partial<LogEntry>): void {
    this.context = { ...this.context, ...context };
  }

  async log(entry: Omit<LogEntry, 'trace_id' | 'step_number'>): Promise<void> {
    this.stepCounter++;
    this.traceMetrics.stepCount++;
    
    if (entry.level === 'error') {
      this.traceMetrics.errors++;
    }

    const fullEntry: LogEntry = {
      ...this.context,
      ...entry,
      trace_id: this.traceId,
      step_number: this.stepCounter,
      parent_trace_id: this.parentTraceId,
    };

    // Enhanced console log with trace correlation
    const emoji = this.getLogEmoji(entry.level);
    const traceInfo = `[${this.traceId.slice(-8)}]`; // Show last 8 chars of trace
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(
      `${emoji} [${timestamp}] ${traceInfo} [${entry.component}] [${entry.operation}] ${entry.message}`,
      entry.data || ''
    );

    if (entry.duration_ms) {
      console.log(`   Duration: ${entry.duration_ms}ms`);
    }

    // Store in Supabase
    try {
      await (supabase as any).from('system_logs').insert(fullEntry);
    } catch (error) {
      console.warn('Failed to store log:', error);
    }
  }

  // Enhanced basic methods
  async info(operation: string, message: string, data?: any, duration_ms?: number): Promise<void> {
    await this.log({
      level: 'info',
      component: 'frontend',
      operation,
      message,
      data,
      duration_ms
    });
  }

  async debug(operation: string, message: string, data?: any): Promise<void> {
    await this.log({
      level: 'debug',
      component: 'frontend',
      operation,
      message,
      data
    });
  }

  async warn(operation: string, message: string, data?: any): Promise<void> {
    await this.log({
      level: 'warn',
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

  // Enhanced booking-specific helpers with performance tracking
  async logBookingStart(userId: string, configId: string, config: any): Promise<void> {
    this.generateNewTrace();
    this.setContext({ user_id: userId, session_id: configId });
    await this.info('start-booking', 'Booking initiated from frontend', {
      config_id: configId,
      license_type: config.license_type,
      exam: config.exam,
      locations: config.locations?.length || 0,
      date_ranges: config.date_ranges?.length || 0,
      has_vehicle_language: !!config.vehicle_language
    });
  }

  async logEdgeFunctionCall(functionName: string, payload: any, startTime?: number): Promise<void> {
    const duration = startTime ? Date.now() - startTime : undefined;
    await this.info('edge-function-call', `Calling: ${functionName}`, {
      function_name: functionName,
      payload_size: JSON.stringify(payload).length,
      payload_keys: Object.keys(payload)
    }, duration);
  }

  async logEdgeFunctionResponse(functionName: string, success: boolean, data?: any, error?: any, startTime?: number): Promise<void> {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    if (success) {
      await this.info('edge-function-response', `Success: ${functionName}`, {
        function_name: functionName,
        response_data: data,
        success: true
      }, duration);
    } else {
      await this.error('edge-function-response', `Failed: ${functionName}`, error, {
        function_name: functionName,
        success: false
      });
    }
  }

  async logConfigValidation(configId: string, isValid: boolean, errors?: string[]): Promise<void> {
    await this.info('config-validation', `Configuration ${isValid ? 'valid' : 'invalid'}`, {
      config_id: configId,
      is_valid: isValid,
      validation_errors: errors || []
    });
  }

  async logSubscriptionCheck(userId: string, isSubscribed: boolean, subscriptionData?: any): Promise<void> {
    await this.info('subscription-check', `Subscription status: ${isSubscribed ? 'active' : 'inactive'}`, {
      user_id: userId,
      is_subscribed: isSubscribed,
      subscription_data: subscriptionData
    });
  }

  async logUserInteraction(action: string, element: string, data?: any): Promise<void> {
    await this.debug('user-interaction', `User ${action}: ${element}`, {
      action,
      element,
      ...data
    });
  }

  async logTraceHandoff(targetComponent: string, traceId?: string): Promise<string> {
    const handoffTraceId = traceId || this.traceId;
    await this.info('trace-handoff', `Handing off trace to ${targetComponent}`, {
      target_component: targetComponent,
      handoff_trace_id: handoffTraceId,
      current_trace_id: this.traceId,
      step_count: this.stepCounter
    });
    return handoffTraceId;
  }

  async logTraceSummary(): Promise<void> {
    const duration = Date.now() - this.traceMetrics.startTime;
    await this.info('trace-summary', `Frontend trace summary for ${this.traceId}`, {
      trace_id: this.traceId,
      parent_trace_id: this.parentTraceId,
      total_steps: this.traceMetrics.stepCount,
      total_errors: this.traceMetrics.errors,
      total_duration_ms: duration,
      context: this.context
    });
  }

  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'debug': return '🔍';
      default: return 'ℹ️';
    }
  }

  getCurrentTraceId(): string {
    return this.traceId;
  }

  getParentTraceId(): string | undefined {
    return this.parentTraceId;
  }

  getTraceMetrics(): TraceMetrics {
    return {
      ...this.traceMetrics,
      stepCount: this.stepCounter
    };
  }
}

export const systemLogger = new SystemLogger();
export default systemLogger; 