
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== START BOOKING FUNCTION CALLED ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header value (first 20 chars):', authHeader ? authHeader.substring(0, 20) + '...' : 'NONE');
    
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
    console.log('Token extracted (first 20 chars):', token.substring(0, 20) + '...');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    console.log('Auth result - User:', user ? `${user.id} (${user.email})` : 'NULL');
    console.log('Auth result - Error:', authError);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed: ' + (authError?.message || 'Unknown auth error')
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id, user.email);

    // Parse request body safely
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Request body text:', bodyText);
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { config_id } = requestBody;
    console.log('Requested config_id:', config_id);

    // Get ALL booking configs for this user first for debugging
    console.log('🔍 Fetching all configs for user...');
    const { data: allConfigs, error: allConfigsError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('user_id', user.id);

    console.log('All configs query result:');
    console.log('- Data:', allConfigs);
    console.log('- Error:', allConfigsError);
    console.log('- Count:', allConfigs?.length || 0);

    if (allConfigsError) {
      console.error('❌ Database error fetching configs:', allConfigsError);
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + allConfigsError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no config_id provided, use the first available config
    let targetConfigId = config_id;
    if (!targetConfigId && allConfigs && allConfigs.length > 0) {
      targetConfigId = allConfigs[0].id;
      console.log('✅ Using first available config:', targetConfigId);
    }

    if (!targetConfigId) {
      console.error('❌ No config ID available');
      return new Response(JSON.stringify({ 
        error: 'No booking configuration found. Please create a booking configuration first.',
        debug: {
          userId: user.id,
          configsFound: allConfigs?.length || 0,
          requestedConfigId: config_id
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the specific booking config
    console.log('🔍 Fetching specific config:', targetConfigId);
    const { data: config, error: configError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('id', targetConfigId)
      .eq('user_id', user.id)
      .single();

    console.log('Specific config query result:');
    console.log('- Data:', config);
    console.log('- Error:', configError);

    if (configError || !config) {
      console.error('❌ Config fetch error:', configError);
      console.error('❌ Config not found for ID:', targetConfigId);
      return new Response(JSON.stringify({ 
        error: 'Booking config not found for ID: ' + targetConfigId,
        debug: {
          configError: configError,
          targetConfigId,
          userId: user.id,
          allConfigIds: allConfigs?.map(c => c.id) || []
        }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Config found:', config.id);

    // Create a booking session with advanced tracking
    console.log('🔍 Creating booking session...');
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        config_id: targetConfigId,
        status: 'initializing',
        booking_details: {
          stage: 'starting',
          message: '🚀 Startar automatisering...',
          timestamp: new Date().toISOString(),
          cycle_count: 0,
          slots_found: 0,
          current_operation: 'initialization'
        }
      })
      .select()
      .single();

    console.log('Session creation result:');
    console.log('- Data:', session);
    console.log('- Error:', sessionError);

    if (sessionError || !session) {
      console.error('❌ Session creation error:', sessionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create booking session: ' + (sessionError?.message || 'Unknown error')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Session created:', session.id);

    // Enhanced Trigger.dev job payload
    const advancedPayload = {
      user_id: user.id,
      session_id: session.id,
      config: {
        license_type: config.license_type,
        exam: config.exam,
        vehicle_language: config.vehicle_language,
        date_ranges: config.date_ranges,
        locations: config.locations
      },
      automation_settings: {
        max_cycles: 100,
        cycle_delay: 10000, // 10 seconds between cycles
        refresh_interval: 30, // Refresh every 30 cycles
        timeout: 1800000, // 30 minutes total timeout
        retry_attempts: 3
      }
    };

    // Check if Trigger Secret Key is available
    const triggerSecretKey = Deno.env.get('TRIGGER_SECRET_KEY');
    console.log('Trigger secret key available:', !!triggerSecretKey);
    
    if (!triggerSecretKey) {
      console.error('❌ TRIGGER_SECRET_KEY not found in environment');
      return new Response(JSON.stringify({ 
        error: 'Trigger.dev API key not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🚀 Triggering automation job...');
    console.log('Payload:', JSON.stringify(advancedPayload, null, 2));

    // Trigger the advanced automation job using the correct secret key name
    const triggerResponse = await fetch('https://api.trigger.dev/v3/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${triggerSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskIdentifier: 'trafikverket-booking-advanced',
        payload: advancedPayload
      })
    });

    console.log('Trigger response status:', triggerResponse.status);
    console.log('Trigger response ok:', triggerResponse.ok);

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('❌ Trigger.dev error response:', errorText);
      console.error('❌ Trigger.dev status:', triggerResponse.status);
      
      // Update session with error
      await supabaseClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: 'Failed to start advanced automation: ' + errorText,
          booking_details: {
            stage: 'error',
            message: '❌ Fel vid start av avancerad automatisering',
            timestamp: new Date().toISOString(),
            triggerError: errorText,
            triggerStatus: triggerResponse.status
          }
        })
        .eq('id', session.id);

      return new Response(JSON.stringify({ 
        error: 'Failed to trigger advanced automation: ' + errorText,
        debug: {
          triggerStatus: triggerResponse.status,
          triggerResponse: errorText
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const triggerData = await triggerResponse.json();
    console.log('✅ Trigger response data:', triggerData);

    // Update session with advanced tracking
    await supabaseClient
      .from('booking_sessions')
      .update({
        status: 'browser_starting',
        booking_details: {
          ...session.booking_details,
          trigger_run_id: triggerData.id,
          stage: 'browser_starting',
          message: '🌍 Startar webbläsare (WebKit)...',
          timestamp: new Date().toISOString(),
          automation_type: 'advanced'
        }
      })
      .eq('id', session.id);

    console.log('✅ Advanced booking automation started successfully:', {
      sessionId: session.id,
      triggerRunId: triggerData.id,
      automationType: 'advanced'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      trigger_run_id: triggerData.id,
      automation_type: 'advanced',
      debug: {
        userId: user.id,
        configId: targetConfigId,
        message: 'Advanced automation started successfully'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR in start-booking function:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      debug: {
        errorName: error.name,
        errorStack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
