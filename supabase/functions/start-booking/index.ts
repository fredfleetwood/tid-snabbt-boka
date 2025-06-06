
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
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { config_id } = await req.json();

    // Get the booking config
    const { data: config, error: configError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('id', config_id)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      throw new Error('Booking config not found');
    }

    // Create a booking session
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        config_id: config_id,
        status: 'initializing',
        booking_details: {
          stage: 'starting',
          message: 'Startar automatisk bokning...',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to create booking session');
    }

    // Trigger the Trigger.dev job
    const triggerResponse = await fetch('https://api.trigger.dev/v3/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('TRIGGER_DEV_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskIdentifier: 'trafikverket-booking',
        payload: {
          user_id: user.id,
          session_id: session.id,
          config: {
            personnummer: config.personnummer,
            license_type: config.license_type,
            exam: config.exam,
            vehicle_language: config.vehicle_language,
            date_ranges: config.date_ranges,
            locations: config.locations
          }
        }
      })
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('Trigger.dev error:', errorText);
      
      // Update session with error
      await supabaseClient
        .from('booking_sessions')
        .update({
          status: 'error',
          error_message: 'Failed to start automation',
          booking_details: {
            stage: 'error',
            message: 'Fel vid start av automatisk bokning',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', session.id);

      throw new Error('Failed to trigger automation');
    }

    const triggerData = await triggerResponse.json();

    // Update session with trigger run ID
    await supabaseClient
      .from('booking_sessions')
      .update({
        booking_details: {
          ...session.booking_details,
          trigger_run_id: triggerData.id,
          stage: 'triggered',
          message: '🚀 Startar webbläsare...',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', session.id);

    console.log('Booking automation started:', {
      sessionId: session.id,
      triggerRunId: triggerData.id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      trigger_run_id: triggerData.id
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
