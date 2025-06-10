import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VPS_SERVER_URL = 'http://87.106.247.92:8080';
const VPS_AUTH_TOKEN = 'test-secret-token-12345'; // Use environment variable in production

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

    const { session_id, job_id } = await req.json();

    if (!session_id && !job_id) {
      throw new Error('Either session_id or job_id is required');
    }

    // Get the active session
    let session: any = null;
    if (session_id) {
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found');
      }
      session = sessionData;
    } else if (job_id) {
      // Find session by job_id
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('job_id', job_id)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found for job_id');
      }
      session = sessionData;
    }

    if (!session) {
      throw new Error('Session not found');
    }

    console.log('Stopping VPS booking:', {
      sessionId: session.id,
      jobId: session.job_id,
      userId: user.id
    });

    // Call VPS server to stop the booking job
    let vpsStopSuccess = false;
    if (session.job_id) {
      try {
        const vpsResponse = await fetch(`${VPS_SERVER_URL}/api/v1/booking/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VPS_AUTH_TOKEN}`
          },
          body: JSON.stringify({ job_id: session.job_id })
        });

        if (vpsResponse.ok) {
          const vpsResult = await vpsResponse.json();
          console.log('VPS stop response:', vpsResult);
          vpsStopSuccess = true;
        } else {
          console.warn('VPS stop failed:', vpsResponse.status, vpsResponse.statusText);
        }
      } catch (vpsError) {
        console.warn('Error calling VPS stop:', vpsError);
      }
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
          cancelled_by_user: true,
          vps_stop_success: vpsStopSuccess
        }
      })
      .eq('id', session.id);

    if (updateError) {
      throw updateError;
    }

    // Broadcast real-time update
    await supabaseClient
      .channel(`booking-${user.id}`)
      .send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          session_id: session.id,
          job_id: session.job_id,
          status: 'cancelled',
          message: '⏹️ Automatisering stoppad',
          progress: 0
        }
      });

    console.log('Booking automation stopped:', {
      sessionId: session.id,
      jobId: session.job_id,
      userId: user.id,
      vpsStopSuccess
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Booking automation stopped successfully',
      vps_stop_success: vpsStopSuccess
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
