
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

    const { session_id, trigger_run_id } = await req.json();

    let statusResponse = {};

    // Get booking session status from database
    if (session_id) {
      const { data: session, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();

      if (sessionError) {
        throw new Error('Booking session not found');
      }

      statusResponse = {
        session_id,
        status: session.status,
        booking_details: session.booking_details,
        error_message: session.error_message,
        started_at: session.started_at,
        completed_at: session.completed_at
      };
    }

    // Get Trigger.dev job status if run ID provided
    if (trigger_run_id) {
      try {
        const triggerResponse = await fetch(`https://api.trigger.dev/v3/runs/${trigger_run_id}`, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TRIGGER_DEV_API_KEY')}`,
            'Content-Type': 'application/json'
          }
        });

        if (triggerResponse.ok) {
          const triggerData = await triggerResponse.json();
          statusResponse = {
            ...statusResponse,
            trigger_status: triggerData.status,
            trigger_details: triggerData
          };
        }
      } catch (triggerError) {
        console.warn('Could not fetch Trigger.dev status:', triggerError);
      }
    }

    return new Response(JSON.stringify(statusResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in booking-status function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
