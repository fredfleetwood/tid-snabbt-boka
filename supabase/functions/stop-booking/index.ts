
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

    // Cancel Trigger.dev job if run ID provided
    if (trigger_run_id) {
      try {
        const cancelResponse = await fetch(`https://api.trigger.dev/v3/runs/${trigger_run_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TRIGGER_DEV_API_KEY')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!cancelResponse.ok) {
          console.warn('Could not cancel Trigger.dev job:', await cancelResponse.text());
        } else {
          console.log('Successfully cancelled Trigger.dev job:', trigger_run_id);
        }
      } catch (error) {
        console.warn('Error cancelling Trigger.dev job:', error);
      }
    }

    // Update booking session to cancelled status
    const { error: updateError } = await supabaseClient
      .from('booking_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        booking_details: {
          stage: 'cancelled',
          message: '⏹️ Bokning stoppad av användare',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', session_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log('Booking session cancelled:', {
      session_id,
      user_id: user.id,
      trigger_run_id
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Booking cancelled successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in stop-booking function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
