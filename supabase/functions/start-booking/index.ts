
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('Authentication failed');
    }

    console.log('User authenticated:', user.id);

    const { config_id } = await req.json();
    console.log('Requested config_id:', config_id);

    // Get the booking config - first let's see what configs exist for this user
    const { data: allConfigs, error: allConfigsError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('user_id', user.id);

    console.log('All configs for user:', allConfigs);
    console.log('All configs error:', allConfigsError);

    // If no config_id provided, use the first available config
    let targetConfigId = config_id;
    if (!targetConfigId && allConfigs && allConfigs.length > 0) {
      targetConfigId = allConfigs[0].id;
      console.log('Using first available config:', targetConfigId);
    }

    if (!targetConfigId) {
      console.error('No config ID available');
      throw new Error('No booking configuration found. Please create a booking configuration first.');
    }

    // Get the specific booking config
    const { data: config, error: configError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('id', targetConfigId)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      console.error('Config fetch error:', configError);
      console.error('Config not found for ID:', targetConfigId);
      throw new Error('Booking config not found');
    }

    console.log('Config found:', config.id);

    // Create a booking session with advanced tracking
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

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError);
      throw new Error('Failed to create booking session');
    }

    console.log('Session created:', session.id);

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
    if (!triggerSecretKey) {
      console.error('TRIGGER_SECRET_KEY not found in environment');
      throw new Error('Trigger.dev API key not configured');
    }

    console.log('Triggering automation job...');

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

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('Trigger.dev error:', errorText);
      
      // Update session with error
      await supabaseClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: 'Failed to start advanced automation',
          booking_details: {
            stage: 'error',
            message: '❌ Fel vid start av avancerad automatisering',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', session.id);

      throw new Error('Failed to trigger advanced automation');
    }

    const triggerData = await triggerResponse.json();
    console.log('Trigger response data:', triggerData);

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

    console.log('Advanced booking automation started:', {
      sessionId: session.id,
      triggerRunId: triggerData.id,
      automationType: 'advanced'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      trigger_run_id: triggerData.id,
      automation_type: 'advanced'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in start-booking function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
