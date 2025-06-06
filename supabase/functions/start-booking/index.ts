
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

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!triggerSecretKey) {
      console.error('❌ Missing TRIGGER_SECRET_KEY environment variable');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Trigger.dev API key' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    console.log('Token extracted (length):', token.length);
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    console.log('Auth result:');
    console.log('- User ID:', user?.id);
    console.log('- User email:', user?.email);
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
      console.log('Request body text:', bodyText);
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
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

    const { config_id } = requestBody;
    console.log('Requested config_id:', config_id);

    // Create authenticated client with the user's token
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get ALL booking configs for this user
    console.log('🔍 Fetching all configs for user:', user.id);
    const { data: allConfigs, error: allConfigsError } = await authenticatedClient
      .from('booking_configs')
      .select('*')
      .eq('user_id', user.id);

    console.log('Database query result:');
    console.log('- Data:', allConfigs);
    console.log('- Error:', allConfigsError);
    console.log('- Count:', allConfigs?.length || 0);

    if (allConfigsError) {
      console.error('❌ Database error fetching configs:', allConfigsError);
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + allConfigsError.message,
        debug: {
          userId: user.id,
          queryError: allConfigsError
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!allConfigs || allConfigs.length === 0) {
      console.error('❌ No booking configs found for user');
      return new Response(JSON.stringify({ 
        error: 'No booking configuration found. Please create a booking configuration first.',
        debug: {
          userId: user.id,
          configsFound: 0,
          message: 'User has no booking configurations in the database'
        }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no config_id provided, use the first available config
    let targetConfigId = config_id;
    let targetConfig = null;

    if (targetConfigId) {
      // Find specific config
      targetConfig = allConfigs.find(config => config.id === targetConfigId);
      if (!targetConfig) {
        console.error('❌ Specific config not found:', targetConfigId);
        return new Response(JSON.stringify({ 
          error: 'Specified booking configuration not found',
          debug: {
            requestedConfigId: targetConfigId,
            availableConfigIds: allConfigs.map(c => c.id)
          }
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Use first available config
      targetConfig = allConfigs[0];
      targetConfigId = targetConfig.id;
      console.log('✅ Using first available config:', targetConfigId);
    }

    console.log('✅ Config selected:', {
      id: targetConfig.id,
      license_type: targetConfig.license_type,
      exam: targetConfig.exam,
      locations: targetConfig.locations?.length || 0
    });

    // Create a booking session
    console.log('🔍 Creating booking session...');
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

    console.log('Session creation result:');
    console.log('- Data:', session);
    console.log('- Error:', sessionError);

    if (sessionError || !session) {
      console.error('❌ Session creation error:', sessionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create booking session: ' + (sessionError?.message || 'Unknown error'),
        debug: {
          sessionError: sessionError
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Session created:', session.id);

    // Prepare Trigger.dev job payload
    const advancedPayload = {
      user_id: user.id,
      session_id: session.id,
      config: {
        license_type: targetConfig.license_type,
        exam: targetConfig.exam,
        vehicle_language: targetConfig.vehicle_language,
        date_ranges: targetConfig.date_ranges,
        locations: targetConfig.locations
      },
      automation_settings: {
        max_cycles: 100,
        cycle_delay: 10000,
        refresh_interval: 30,
        timeout: 1800000,
        retry_attempts: 3
      }
    };

    console.log('🚀 Triggering automation job...');
    console.log('Payload:', JSON.stringify(advancedPayload, null, 2));

    // Trigger the automation job
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
      
      // Update session with error
      await authenticatedClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: 'Failed to start automation: ' + errorText,
          booking_details: {
            stage: 'error',
            message: '❌ Fel vid start av automatisering',
            timestamp: new Date().toISOString(),
            triggerError: errorText,
            triggerStatus: triggerResponse.status
          }
        })
        .eq('id', session.id);

      return new Response(JSON.stringify({ 
        error: 'Failed to trigger automation: ' + errorText,
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

    // Update session with trigger run ID
    await authenticatedClient
      .from('booking_sessions')
      .update({
        status: 'browser_starting',
        booking_details: {
          ...session.booking_details,
          trigger_run_id: triggerData.id,
          stage: 'browser_starting',
          message: '🌍 Startar webbläsare...',
          timestamp: new Date().toISOString(),
          automation_type: 'advanced'
        }
      })
      .eq('id', session.id);

    console.log('✅ Automation started successfully:', {
      sessionId: session.id,
      triggerRunId: triggerData.id,
      configId: targetConfigId
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      trigger_run_id: triggerData.id,
      automation_type: 'advanced',
      debug: {
        userId: user.id,
        configId: targetConfigId,
        message: 'Automation started successfully'
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
        errorStack: error.stack?.split('\n').slice(0, 5),
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
