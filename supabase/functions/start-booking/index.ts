import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

const VPS_SERVER_URL = 'http://87.106.247.92:8080';
const VPS_AUTH_TOKEN = 'test-secret-token-12345'; // Use environment variable in production

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== START BOOKING FUNCTION CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const triggerSecretKey = Deno.env.get('TRIGGER_SECRET_KEY');
    
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', !!supabaseUrl);
    console.log('- SUPABASE_ANON_KEY:', !!supabaseAnonKey);
    console.log('- TRIGGER_SECRET_KEY:', !!triggerSecretKey);

    if (!supabaseUrl || !supabaseAnonKey || !triggerSecretKey) {
      console.error('❌ Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        debug: {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          triggerSecretKey: !!triggerSecretKey
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'No authorization header provided'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    console.log('Auth result:');
    console.log('- User ID:', user?.id);
    console.log('- Auth error:', authError?.message);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed: ' + (authError?.message || 'Unknown auth error')
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body safely
    let requestBody = {};
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      if (bodyText && bodyText.trim()) {
        requestBody = JSON.parse(bodyText);
        console.log('Parsed request body:', requestBody);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { config_id, user_id, config } = requestBody as { 
      config_id?: string; 
      user_id?: string; 
      config?: any;
    };
    console.log('Request data:', { config_id, user_id, config });

    // Detailed validation with specific error messages
    if (!user_id) {
      console.error('❌ Missing required field: user_id');
      return new Response(JSON.stringify({ 
        error: 'Missing required field: user_id',
        received_data: requestBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config_id) {
      console.error('❌ Missing required field: config_id');
      return new Response(JSON.stringify({ 
        error: 'Missing required field: config_id',
        received_data: requestBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config) {
      console.error('❌ Missing required field: config');
      return new Response(JSON.stringify({ 
        error: 'Missing required field: config',
        received_data: requestBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id !== user.id) {
      console.error('❌ User ID mismatch:', { sent: user_id, authenticated: user.id });
      return new Response(JSON.stringify({ 
        error: 'User ID mismatch',
        sent_user_id: user_id,
        authenticated_user_id: user.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has active subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.warn('⚠️ No active subscription found, allowing for testing');
      console.log('Subscription error:', subError?.message);
      // For testing purposes, we'll allow users without subscriptions
      // In production, uncomment the return statement below:
      // return new Response(JSON.stringify({ 
      //   error: 'Active subscription required'
      // }), {
      //   status: 400,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    // Create webhook URL for VPS callbacks
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vps-webhook`;

    // Prepare VPS booking configuration
    const vpsConfig = {
      user_id: user.id,
      config_id: config_id,
      personal_number: config?.personnummer,
      license_type: config?.license_type,
      exam_type: config?.exam,
      vehicle_language: config?.vehicle_language,
      locations: config?.locations,
      date_ranges: config?.date_ranges,
      webhook_url: webhookUrl
    };

    console.log('Starting VPS booking:', { userId: user.id, config: vpsConfig });

    // Call VPS server to start booking
    const vpsResponse = await fetch(`${VPS_SERVER_URL}/api/v1/booking/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_AUTH_TOKEN}`
      },
      body: JSON.stringify(vpsConfig)
    });

    if (!vpsResponse.ok) {
      throw new Error(`VPS server error: ${vpsResponse.status} ${vpsResponse.statusText}`);
    }

    const vpsResult = await vpsResponse.json();

    // Create booking session record
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        job_id: vpsResult.job_id,
        status: 'starting',
        booking_details: {
          config: vpsConfig,
          vps_response: vpsResult,
          stage: 'initializing',
          message: '🚀 Startar automatisk bokning...',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (sessionError) {
      // Try to stop the VPS job if session creation failed
      try {
        await fetch(`${VPS_SERVER_URL}/api/v1/booking/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VPS_AUTH_TOKEN}`
          },
          body: JSON.stringify({ job_id: vpsResult.job_id })
        });
      } catch (cleanupError) {
        console.warn('Failed to cleanup VPS job after session error:', cleanupError);
      }
      throw sessionError;
    }

    // Broadcast real-time update
    await supabaseClient
      .channel(`booking-${user.id}`)
      .send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          session_id: session.id,
          job_id: vpsResult.job_id,
          status: 'starting',
          message: '🚀 Automatisk bokning startad!',
          progress: 10
        }
      });

    console.log('Booking session created:', {
      sessionId: session.id,
      jobId: vpsResult.job_id,
      userId: user.id
    });

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      job_id: vpsResult.job_id,
      message: 'Booking automation started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10)
    });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
