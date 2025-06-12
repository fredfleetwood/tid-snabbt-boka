// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Deno global declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Enhanced logging utility for Edge Functions
class EdgeFunctionLogger {
  private traceId: string;
  private stepCounter: number = 0;
  private context: any = {};
  private startTime: number;

  constructor(externalTraceId?: string) {
    this.traceId = externalTraceId 
      ? `${externalTraceId}_edge_${Date.now() % 10000}`
      : `edge_trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    console.log(`🆔 Edge function trace: ${this.traceId}`);
  }

  setContext(context: any) {
    this.context = { ...this.context, ...context };
  }

  private async log(level: string, operation: string, message: string, data?: any, duration_ms?: number) {
    this.stepCounter++;
    
    const logEntry = {
      level,
      component: 'edge-function',
      operation,
      message,
      timestamp: new Date().toISOString(),
      trace_id: this.traceId,
      step_number: this.stepCounter,
      duration_ms: duration_ms || (Date.now() - this.startTime),
      data: data || {},
      ...this.context
    };

    // Enhanced console output
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    const timestamp = new Date().toLocaleTimeString();
    const traceInfo = `[${this.traceId.slice(-8)}]`;
    
    console.log(`${emoji} [${timestamp}] ${traceInfo} [edge] [${operation}] ${message}`);
    if (data) {
      console.log(`   Data:`, data);
    }
    if (duration_ms) {
      console.log(`   Duration: ${duration_ms}ms`);
    }

    // Send to system logs
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kqemgnbqjrqepzkigfcx.supabase.co';
      await fetch(`${supabaseUrl}/functions/v1/system-logs?action=log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send log to system-logs:', error);
    }
  }

  async info(operation: string, message: string, data?: any, duration_ms?: number) {
    await this.log('info', operation, message, data, duration_ms);
  }

  async error(operation: string, message: string, error?: any, data?: any) {
    await this.log('error', operation, message, {
      ...data,
      error_details: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  async warn(operation: string, message: string, data?: any) {
    await this.log('warn', operation, message, data);
  }

  getTraceId(): string {
    return this.traceId;
  }

  async logTraceSummary() {
    const totalDuration = Date.now() - this.startTime;
    await this.info('trace-summary', 'Edge function trace summary', {
      trace_id: this.traceId,
      total_steps: this.stepCounter,
      total_duration_ms: totalDuration,
      context: this.context
    });
  }

  async logTraceHandoff(targetComponent: string): Promise<string> {
    await this.info('trace-handoff', `Handing off trace to ${targetComponent}`, {
      target_component: targetComponent,
      handoff_trace_id: this.traceId,
      step_count: this.stepCounter
    });
    return this.traceId;
  }
}

// Type definitions
interface BookingDetails {
  job_id: string;
  config?: any;
  stage?: string;
  message?: string;
  timestamp?: string;
  test_mode?: boolean;
  vps_job_id?: string;
  vps_response?: any;
  vps_error?: string;
  trace_id?: string;
}

interface BookingSession {
  id: string;
  user_id: string;
  config_id: string;
  status: string;
  booking_details: BookingDetails;
}

interface VPSResponse {
  job_id?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize logger with potential external trace ID
  const externalTraceId = req.headers.get('x-trace-id') || undefined;
  const logger = new EdgeFunctionLogger(externalTraceId);

  try {
    await logger.info('function-start', 'Start booking Edge Function initiated');
    
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kqemgnbqjrqepzkigfcx.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    await logger.info('env-loaded', 'Environment variables loaded', {
      has_service_key: !!supabaseServiceKey,
      supabase_url: supabaseUrl
    });
    
    // Create Supabase client for auth (uses anon key)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create service client for database operations (bypasses RLS)
    const serviceClient = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : supabaseClient; // Fallback to anon client if service key not available
    
    await logger.info('clients-created', 'Supabase clients created', {
      using_service_key: !!supabaseServiceKey
    });

    // Get and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logger.error('auth-missing', 'No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data?.user) {
      await logger.error('auth-failed', 'Authentication failed', authError);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.setContext({ user_id: data.user.id });
    await logger.info('auth-success', 'User authenticated successfully', {
      user_id: data.user.id
    });

    // Parse request body
    const requestBody = await req.json();
    await logger.info('request-parsed', 'Request body parsed', {
      keys: Object.keys(requestBody),
      has_config: !!requestBody.config
    });

    const { user_id, config_id, config } = requestBody;

    // Validate required fields
    if (!user_id || !config_id || !config) {
      await logger.error('validation-failed', 'Missing required fields', {
        has_user_id: !!user_id,
        has_config_id: !!config_id,
        has_config: !!config
      });
      
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, config_id, config',
        received: { user_id: !!user_id, config_id: !!config_id, config: !!config }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id !== data.user.id) {
      await logger.error('user-mismatch', 'User ID mismatch', {
        sent_user_id: user_id,
        auth_user_id: data.user.id
      });
      
      return new Response(JSON.stringify({ 
        error: 'User ID mismatch',
        sent: user_id,
        authenticated: data.user.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.setContext({ config_id, job_type: 'booking' });
    await logger.info('validation-success', 'Request validation passed', {
      config_keys: Object.keys(config),
      locations_count: config.locations?.length || 0
    });

    // Check subscription (relaxed for testing)
    try {
      const { data: subscription, error: subError } = await serviceClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        await logger.warn('subscription-missing', 'No active subscription found, allowing for testing', {
          subscription_error: subError?.message
        });
      } else {
        await logger.info('subscription-valid', 'Active subscription found', {
          subscription_id: subscription.id,
          subscription_status: subscription.status
        });
      }
    } catch (subscriptionError) {
      await logger.warn('subscription-check-failed', 'Subscription check failed, continuing for testing', {
        error: subscriptionError
      });
    }

    // Create booking session in database
    const testJobId = `job-${Date.now()}`;
    logger.setContext({ job_id: testJobId });
    
    try {
      await logger.info('session-creating', 'Creating booking session in database');
      
      const { data: session, error: sessionError } = await serviceClient
        .from('booking_sessions')
        .insert({
          user_id: data.user.id,
          config_id: config_id,
          status: 'starting',
          booking_details: {
            job_id: testJobId,
            config: config,
            stage: 'initializing',
            message: '🚀 Startar automatisk bokning via Supabase...',
            timestamp: new Date().toISOString(),
            test_mode: true,
            trace_id: logger.getTraceId()
          }
        })
        .select()
        .single();

      if (sessionError) {
        await logger.error('session-failed', 'Session creation failed', sessionError);
        throw sessionError;
      }

      const typedSession = session as BookingSession;
      logger.setContext({ session_id: typedSession.id });
      
      await logger.info('session-created', 'Booking session created successfully', {
        session_id: typedSession.id,
        status: 'starting'
      });

      // Now call VPS server to start the actual automation
      let vpsSuccess = false;
      let vpsJobId: string = typedSession.booking_details?.job_id || testJobId;
      let vpsResult: VPSResponse | null = null;

      try {
        await logger.info('vps-starting', 'Starting VPS automation via internal proxy');
        
        // Prepare VPS request - CRITICAL: Include job_id so VPS uses same ID as database session
        const vpsConfig = {
          job_id: testJobId,  // ⭐ FIXED: Include job_id for consistency
          user_id: data.user.id,
          config_id: config_id,
          personal_number: config.personnummer,
          license_type: config.license_type,
          exam_type: config.exam,
          vehicle_language: config.vehicle_language,
          locations: config.locations,
          date_ranges: config.date_ranges,
          webhook_url: `${supabaseUrl}/functions/v1/vps-webhook`,
          trace_id: await logger.logTraceHandoff('vps')
        };

        await logger.info('vps-config-prepared', 'VPS configuration prepared', {
          has_personal_number: !!vpsConfig.personal_number,
          license_type: vpsConfig.license_type,
          exam_type: vpsConfig.exam_type,
          locations_count: vpsConfig.locations?.length || 0,
          date_ranges_count: vpsConfig.date_ranges?.length || 0
        });

        // Call our own vps-proxy Edge Function with action=start
        const vpsProxyUrl = `${supabaseUrl}/functions/v1/vps-proxy?action=start`;
        const vpsStartTime = Date.now();
        
        const vpsResponse = await fetch(vpsProxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'x-trace-id': logger.getTraceId()
          },
          body: JSON.stringify(vpsConfig)
        });

        const vpsDuration = Date.now() - vpsStartTime;

        if (!vpsResponse.ok) {
          const errorText = await vpsResponse.text();
          await logger.error('vps-proxy-failed', 'VPS proxy request failed', null, {
            status: vpsResponse.status,
            error_text: errorText
          });
          throw new Error(`VPS proxy error: ${vpsResponse.status} - ${errorText}`);
        }

        const vpsData = await vpsResponse.json();

        if (vpsData && vpsData.job_id) {
          vpsResult = vpsData as VPSResponse;
          vpsJobId = vpsResult?.job_id || typedSession.booking_details?.job_id || testJobId;
          vpsSuccess = true;
          
          await logger.info('vps-success', 'VPS automation started successfully via internal proxy', {
            vps_job_id: vpsResult?.job_id,
            vps_status: vpsResult?.status,
            response_data: vpsResult
          }, vpsDuration);
          
          // Update session with real VPS job ID
          await serviceClient
            .from('booking_sessions')
            .update({
              booking_details: {
                ...typedSession.booking_details,
                vps_job_id: vpsResult?.job_id,
                vps_response: vpsResult,
                stage: 'automation_started',
                message: '🚀 Automatisering startad via intern proxy!',
                timestamp: new Date().toISOString(),
                trace_id: logger.getTraceId()
              }
            })
            .eq('id', typedSession.id);
            
        } else {
          await logger.error('vps-invalid-response', 'VPS returned unsuccessful result', null, {
            vps_response: vpsData
          });
          throw new Error(`VPS booking function returned unsuccessful result: ${JSON.stringify(vpsData)}`);
        }
        
      } catch (vpsError: any) {
        await logger.error('vps-integration-failed', 'VPS integration failed', vpsError);
        vpsSuccess = false;
        
        // Update session with VPS error
        await serviceClient
          .from('booking_sessions')
          .update({
            booking_details: {
              ...typedSession.booking_details,
              vps_error: vpsError?.message || 'Unknown VPS error',
              stage: 'vps_failed',
              message: '⚠️ VPS fel - använder intern proxy fallback',
              timestamp: new Date().toISOString(),
              trace_id: logger.getTraceId()
            }
          })
          .eq('id', typedSession.id);
      }

      // Broadcast real-time update
      try {
        await serviceClient
          .channel(`booking-${data.user.id}`)
          .send({
            type: 'broadcast',
            event: 'status_update',
            payload: {
              session_id: typedSession.id,
              job_id: vpsJobId,
              status: vpsSuccess ? 'automation_started' : 'vps_failed',
              message: vpsSuccess ? '🚀 Automatisering startad på VPS!' : '⚠️ VPS integration failed',
              progress: vpsSuccess ? 20 : 5,
              vps_success: vpsSuccess,
              test_mode: !vpsSuccess,
              trace_id: logger.getTraceId()
            }
          });
          
        await logger.info('broadcast-sent', 'Real-time update broadcasted', {
          channel: `booking-${data.user.id}`,
          status: vpsSuccess ? 'automation_started' : 'vps_failed'
        });
        
      } catch (broadcastError) {
        await logger.warn('broadcast-failed', 'Real-time broadcast failed', {
          error: broadcastError
        });
      }

      await logger.logTraceSummary();

      // Return success response
      return new Response(JSON.stringify({
        success: true,
        job_id: vpsJobId,
        session_id: typedSession.id,
        message: vpsSuccess 
          ? '🚀 Full automation started successfully!' 
          : '🚀 Session created, VPS integration in fallback mode',
        user_id: data.user.id,
        database_operations: true,
        vps_integration: vpsSuccess,
        vps_result: vpsSuccess && vpsResult ? vpsResult : null,
        status: vpsSuccess ? 'PRODUCTION' : 'FALLBACK',
        trace_id: logger.getTraceId()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (dbError: any) {
      await logger.error('database-failed', 'Database operation failed', dbError);
      
      // Return test success even if DB fails
      return new Response(JSON.stringify({
        success: true,
        job_id: testJobId,
        session_id: `fallback-session-${Date.now()}`,
        message: '⚠️ DB failed but continuing in test mode',
        user_id: data.user.id,
        database_error: dbError?.message || 'Unknown database error',
        test_mode: true,
        trace_id: logger.getTraceId()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error: any) {
    await logger.error('function-error', 'Critical function error', error);
    
    return new Response(JSON.stringify({ 
      error: 'Function error: ' + (error?.message || 'Unknown error'),
      name: error?.name || 'Unknown',
      stack: error?.stack?.split('\n').slice(0, 5) || [],
      trace_id: logger.getTraceId()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
