
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { session_id } = await req.json();

    // Get the active session
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Update session to cancelled status
    const { error: updateError } = await supabaseClient
      .from('booking_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        booking_details: {
          ...session.booking_details,
          stage: 'cancelled',
          message: '⏹️ Automatisering stoppad av användare',
          timestamp: new Date().toISOString(),
          cancelled_by_user: true
        }
      })
      .eq('id', session_id);

    if (updateError) {
      throw updateError;
    }

    // If there's a Trigger.dev run ID, attempt to cancel it
    if (session.booking_details?.trigger_run_id) {
      try {
        await fetch(`https://api.trigger.dev/v3/runs/${session.booking_details.trigger_run_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TRIGGER_DEV_API_KEY')}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (cancelError) {
        console.warn('Could not cancel Trigger.dev run:', cancelError);
        // Don't throw here as the session is already marked as cancelled
      }
    }

    console.log('Booking automation stopped:', {
      sessionId: session_id,
      userId: user.id,
      triggerRunId: session.booking_details?.trigger_run_id
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Booking automation stopped successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error stopping booking:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to stop booking automation' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
