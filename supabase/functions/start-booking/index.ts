
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== START BOOKING FUNCTION CALLED ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const triggerSecretKey = Deno.env.get('TRIGGER_SECRET_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey, 
      triggerSecretKey: !!triggerSecretKey
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Supabase credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
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

    // Parse request body
    let requestBody = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
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

    const { config_id } = requestBody as { config_id?: string };
    console.log('Request data:', { config_id, user_id: user.id });

    // Create authenticated client
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Fetch booking config
    console.log('🔍 Fetching booking config for user:', user.id);
    const { data: configs, error: configsError } = await authenticatedClient
      .from('booking_configs')
      .select('*')
      .eq('user_id', user.id);

    if (configsError) {
      console.error('❌ Database error:', configsError);
      return new Response(JSON.stringify({ 
        error: 'Database error: ' + configsError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!configs || configs.length === 0) {
      console.error('❌ No booking configs found');
      return new Response(JSON.stringify({ 
        error: 'No booking configuration found. Please create one first.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use specified config or first available
    let targetConfig = config_id 
      ? configs.find(config => config.id === config_id)
      : configs[0];

    if (!targetConfig) {
      console.error('❌ Specified config not found');
      return new Response(JSON.stringify({ 
        error: 'Specified booking configuration not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎯 Selected config:', {
      id: targetConfig.id,
      exam: targetConfig.exam,
      license_type: targetConfig.license_type
    });

    // Create booking session
    console.log('📝 Creating booking session...');
    const { data: session, error: sessionError } = await authenticatedClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        config_id: targetConfig.id,
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

    if (sessionError || !session) {
      console.error('❌ Failed to create session:', sessionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create booking session: ' + (sessionError?.message || 'Unknown error')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Session created:', session.id);

    // Check if Trigger.dev is available
    if (!triggerSecretKey) {
      console.log('⚠️ No Trigger.dev API key - running in simulation mode');
      
      // Update session to simulate automation
      await authenticatedClient
        .from('booking_sessions')
        .update({
          status: 'searching',
          booking_details: {
            stage: 'simulation',
            message: '🧪 Kör i simuleringsläge (ingen Trigger.dev-nyckel)',
            timestamp: new Date().toISOString(),
            simulation: true,
            cycle_count: 1,
            slots_found: 0
          }
        })
        .eq('id', session.id);

      return new Response(JSON.stringify({ 
        success: true, 
        session_id: session.id,
        simulation: true,
        message: 'Automation started in simulation mode (no Trigger.dev key)'
      }), {
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
        vehicle_language: targetConfig.vehicle_language || ['Svenska'],
        date_ranges: targetConfig.date_ranges || [],
        locations: targetConfig.locations || [],
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

    console.log('🚀 Calling Trigger.dev...');
    console.log('Payload:', JSON.stringify(triggerPayload, null, 2));

    try {
      // Call Trigger.dev with improved error handling
      const triggerResponse = await fetch('https://api.trigger.dev/v3/runs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${triggerSecretKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: JSON.stringify({
          taskIdentifier: 'trafikverket-booking-advanced',
          payload: triggerPayload
        })
      });

      console.log('📡 Trigger response status:', triggerResponse.status);
      
      const responseText = await triggerResponse.text();
      console.log('📡 Trigger response body:', responseText);

      if (!triggerResponse.ok) {
        console.error('❌ Trigger.dev API error:', {
          status: triggerResponse.status,
          statusText: triggerResponse.statusText,
          body: responseText
        });

        // Update session with error
        await authenticatedClient
          .from('booking_sessions')
          .update({
            status: 'error',
            error_message: `Trigger.dev API error (${triggerResponse.status}): ${responseText}`,
            booking_details: {
              stage: 'error',
              message: '❌ Fel vid anslutning till automatiseringstjänst',
              timestamp: new Date().toISOString(),
              triggerError: responseText,
              triggerStatus: triggerResponse.status
            }
          })
          .eq('id', session.id);

        return new Response(JSON.stringify({ 
          error: `Trigger.dev API error (${triggerResponse.status}): ${responseText}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let triggerData;
      try {
        triggerData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse Trigger.dev response:', parseError);
        triggerData = { id: 'unknown', response: responseText };
      }

      console.log('✅ Trigger.dev success:', triggerData);

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

      return new Response(JSON.stringify({ 
        success: true, 
        session_id: session.id,
        trigger_run_id: triggerData.id,
        automation_type: 'advanced',
        message: 'Automation started successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (triggerError) {
      console.error('💥 Trigger.dev network error:', triggerError);
      
      // Update session with network error
      await authenticatedClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: `Network error calling Trigger.dev: ${triggerError.message}`,
          booking_details: {
            stage: 'error',
            message: '❌ Nätverksfel vid anslutning till automatiseringstjänst',
            timestamp: new Date().toISOString(),
            networkError: triggerError.message
          }
        })
        .eq('id', session.id);

      return new Response(JSON.stringify({ 
        error: `Network error calling Trigger.dev: ${triggerError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
