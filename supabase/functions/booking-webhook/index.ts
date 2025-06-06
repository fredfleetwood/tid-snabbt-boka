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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = await req.json();
    console.log('Received webhook from Trigger.dev:', payload);

    const { 
      user_id, 
      session_id, 
      status, 
      message, 
      stage,
      qr_code, 
      error_message,
      booking_details 
    } = payload;

    if (!user_id || !session_id) {
      throw new Error('Missing required fields: user_id or session_id');
    }

    // Prepare booking details with logs
    const currentDetails = {
      stage: stage || status,
      message: message || `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
      qr_code: qr_code || undefined,
      logs: [] // Will be populated from existing logs
    };

    // Get existing session to preserve logs
    const { data: existingSession } = await supabaseClient
      .from('booking_sessions')
      .select('booking_details')
      .eq('id', session_id)
      .single();

    if (existingSession?.booking_details?.logs) {
      currentDetails.logs = existingSession.booking_details.logs;
    }

    // Add new log entry
    if (message) {
      currentDetails.logs.push({
        message,
        timestamp: currentDetails.timestamp,
        stage: stage || status
      });
      
      // Keep only last 50 log entries
      currentDetails.logs = currentDetails.logs.slice(-50);
    }

    // Merge with additional booking details if provided
    if (booking_details) {
      Object.assign(currentDetails, booking_details);
    }

    // Update booking session status
    const updateData = {
      status,
      booking_details: currentDetails,
      error_message: error_message || null,
      ...(status === 'completed' && { completed_at: new Date().toISOString() })
    };

    const { error: updateError } = await supabaseClient
      .from('booking_sessions')
      .update(updateData)
      .eq('id', session_id)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating booking session:', updateError);
      throw updateError;
    }

    console.log('Successfully updated booking session:', {
      session_id,
      status,
      stage,
      message: message?.substring(0, 100)
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in booking-webhook function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
