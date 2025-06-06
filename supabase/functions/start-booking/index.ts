
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

    const { config_id, user_id } = requestBody as { config_id?: string; user_id?: string };
    console.log('Request data:', { config_id, user_id });

    // Create authenticated client
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Fetch booking configs for this user
    console.log('🔍 Fetching booking configs for user:', user.id);
    const { data: allConfigs, error: configsError } = await authenticatedClient
      .from('booking_configs')
      .select('*')
      .eq('user_id', user.id);

    console.log('📊 Database query result:');
    console.log('- Configs found:', allConfigs?.length || 0);
    console.log('- Query error:', configsError?.message);

    if (configsError) {
      console.error('❌ Database error:', configsError);
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + configsError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!allConfigs || allConfigs.length === 0) {
      console.error('❌ No booking configs found');
      return new Response(JSON.stringify({ 
        error: 'No booking configuration found. Please create one first.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the right config
    let targetConfig = null;
    let targetConfigId = config_id;

    if (config_id) {
      targetConfig = allConfigs.find(config => config.id === config_id);
      if (!targetConfig) {
        console.error('❌ Specified config not found:', config_id);
        return new Response(JSON.stringify({ 
          error: 'Specified booking configuration not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      targetConfig = allConfigs[0];
      targetConfigId = targetConfig.id;
      console.log('✅ Using first available config:', targetConfigId);
    }

    console.log('🎯 Selected config:', {
      id: targetConfig.id,
      exam: targetConfig.exam,
      license_type: targetConfig.license_type,
      locations: targetConfig.locations
    });

    // Create booking session
    console.log('📝 Creating booking session...');
    const { data: session, error: sessionError } = await authenticatedClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        config_id: targetConfigId,
        status: 'initializing',
        started_at: new Date().toISOString(),
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

    console.log('📄 Session creation result:');
    console.log('- Session created:', !!session);
    console.log('- Session ID:', session?.id);
    console.log('- Session error:', sessionError?.message);

    if (sessionError || !session) {
      console.error('❌ Failed to create session:', sessionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create booking session: ' + (sessionError?.message || 'Unknown error')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare Trigger.dev payload
    const triggerPayload = {
      user_id: user.id,
      session_id: session.id,
      config: {
        license_type: targetConfig.license_type,
        exam: targetConfig.exam,
        vehicle_language: targetConfig.vehicle_language,
        date_ranges: targetConfig.date_ranges,
        locations: targetConfig.locations,
        personnummer: targetConfig.personnummer
      },
      automation_settings: {
        max_cycles: 100,
        cycle_delay: 10000,
        refresh_interval: 30,
        timeout: 1800000,
        retry_attempts: 3
      }
    };

    console.log('🚀 Triggering automation...');
    console.log('Payload preview:', {
      user_id: triggerPayload.user_id,
      session_id: triggerPayload.session_id,
      exam: triggerPayload.config.exam,
      license_type: triggerPayload.config.license_type
    });

    // Call Trigger.dev
    const triggerResponse = await fetch('https://api.trigger.dev/v3/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${triggerSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskIdentifier: 'trafikverket-booking-advanced',
        payload: triggerPayload
      })
    });

    console.log('📡 Trigger response status:', triggerResponse.status);
    console.log('📡 Trigger response ok:', triggerResponse.ok);

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('❌ Trigger.dev error:', errorText);
      
      await authenticatedClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: 'Failed to start automation: ' + errorText,
          booking_details: {
            stage: 'error',
            message: '❌ Fel vid start av automatisering',
            timestamp: new Date().toISOString(),
            triggerError: errorText
          }
        })
        .eq('id', session.id);

      return new Response(JSON.stringify({ 
        error: 'Failed to trigger automation: ' + errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const triggerData = await triggerResponse.json();
    console.log('✅ Trigger response data:', triggerData);

    // Update session with trigger run ID
    await authenticatedClient
      .from('booking_sessions')
      .update({
        status: 'browser_starting',
        booking_details: {
          trigger_run_id: triggerData.id,
          stage: 'browser_starting',
          message: '🌍 Startar webbläsare...',
          timestamp: new Date().toISOString(),
          automation_type: 'advanced'
        }
      })
      .eq('id', session.id);

    console.log('🎉 SUCCESS - Automation started:', {
      sessionId: session.id,
      triggerRunId: triggerData.id,
      configId: targetConfigId
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      trigger_run_id: triggerData.id,
      automation_type: 'advanced',
      message: 'Automation started successfully'
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
