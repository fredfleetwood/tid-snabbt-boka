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

  try {
    console.log('=== START BOOKING WITH DATABASE OPERATIONS ===');
    
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kqemgnbqjrqepzkigfcx.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('✅ Environment variables loaded');
    
    // Create Supabase client for auth (uses anon key)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created');

    // Create service client for database operations (bypasses RLS)
    const serviceClient = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : supabaseClient; // Fallback to anon client if service key not available
    
    console.log('✅ Service client created:', !!supabaseServiceKey ? 'with SERVICE_ROLE' : 'fallback to ANON');

    // Get and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data?.user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', data.user.id);

    // Parse request body
    const requestBody = await req.json();
    console.log('✅ Request body parsed:', Object.keys(requestBody));

    const { user_id, config_id, config } = requestBody;

    // Validate required fields
    if (!user_id || !config_id || !config) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, config_id, config',
        received: { user_id: !!user_id, config_id: !!config_id, config: !!config }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id !== data.user.id) {
      return new Response(JSON.stringify({ 
        error: 'User ID mismatch',
        sent: user_id,
        authenticated: data.user.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Request validation passed');

    // Check subscription (relaxed for testing)
    try {
      const { data: subscription, error: subError } = await serviceClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        console.warn('⚠️ No active subscription found, allowing for testing');
        console.log('Subscription error:', subError?.message);
      } else {
        console.log('✅ Active subscription found:', subscription.id);
      }
    } catch (subscriptionError) {
      console.warn('⚠️ Subscription check failed, continuing for testing:', subscriptionError);
    }

    // Create booking session in database
    const testJobId = `job-${Date.now()}`;
    
    try {
      console.log('Creating booking session...');
      
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
            test_mode: true
          }
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation failed:', sessionError);
        throw sessionError;
      }

      console.log('✅ Booking session created:', session.id);

      // Type the session properly
      const typedSession = session as BookingSession;

      // Now call VPS server to start the actual automation
      let vpsSuccess = false;
      let vpsJobId: string = typedSession.booking_details?.job_id || testJobId;
      let vpsResult: VPSResponse | null = null;

      try {
        console.log('🚀 Starting VPS automation...');
        
        // Prepare VPS request
        const vpsConfig = {
          user_id: data.user.id,
          config_id: config_id,
          personal_number: config.personnummer,
          license_type: config.license_type,
          exam_type: config.exam,
          vehicle_language: config.vehicle_language,
          locations: config.locations,
          date_ranges: config.date_ranges,
          webhook_url: `${supabaseUrl}/functions/v1/vps-webhook`
        };

        console.log('VPS request config:', vpsConfig);

        const vpsResponse = await fetch('http://87.106.247.92:8000/api/v1/booking/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-secret-token-12345'
          },
          body: JSON.stringify(vpsConfig)
        });

        if (vpsResponse.ok) {
          vpsResult = await vpsResponse.json() as VPSResponse;
          vpsJobId = vpsResult?.job_id || typedSession.booking_details?.job_id || testJobId;
          vpsSuccess = true;
          
          console.log('✅ VPS automation started:', vpsResult);
          
          // Update session with real VPS job ID
          await serviceClient
            .from('booking_sessions')
            .update({
              booking_details: {
                ...typedSession.booking_details,
                vps_job_id: vpsResult?.job_id,
                vps_response: vpsResult,
                stage: 'automation_started',
                message: '🚀 Automatisering startad på VPS server!',
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', typedSession.id);
            
        } else {
          const errorText = await vpsResponse.text();
          console.warn('⚠️ VPS server failed:', vpsResponse.status, errorText);
          throw new Error(`VPS server error: ${vpsResponse.status} ${errorText}`);
        }
        
      } catch (vpsError: any) {
        console.warn('⚠️ VPS integration failed:', vpsError);
        vpsSuccess = false;
        
        // Update session with VPS error
        await serviceClient
          .from('booking_sessions')
          .update({
            booking_details: {
              ...typedSession.booking_details,
              vps_error: vpsError?.message || 'Unknown VPS error',
              stage: 'vps_failed',
              message: '⚠️ VPS fel - session sparad i testläge',
              timestamp: new Date().toISOString()
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
              test_mode: !vpsSuccess
            }
          });
        console.log('✅ Real-time update broadcasted');
      } catch (broadcastError) {
        console.warn('⚠️ Broadcast failed:', broadcastError);
      }

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
        status: vpsSuccess ? 'PRODUCTION' : 'FALLBACK'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (dbError: any) {
      console.error('❌ Database operation failed:', dbError);
      
      // Return test success even if DB fails
      return new Response(JSON.stringify({
        success: true,
        job_id: testJobId,
        session_id: `fallback-session-${Date.now()}`,
        message: '⚠️ DB failed but continuing in test mode',
        user_id: data.user.id,
        database_error: dbError?.message || 'Unknown database error',
        test_mode: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error: any) {
    console.error('💥 ERROR:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Function error: ' + (error?.message || 'Unknown error'),
      name: error?.name || 'Unknown',
      stack: error?.stack?.split('\n').slice(0, 5) || []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
