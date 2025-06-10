import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'status_update' | 'qr_code_update' | 'booking_completed' | 'booking_failed';
  job_id: string;
  data: any;
  timestamp: string;
  signature?: string;
}

interface StatusUpdateData {
  status: string;
  stage?: string;
  message?: string;
  cycle_count?: number;
  slots_found?: number;
  current_operation?: string;
}

interface QRCodeUpdateData {
  qr_code: string;
}

interface BookingCompletedData {
  booking_details?: any;
  completion_message?: string;
}

interface BookingFailedData {
  error_message: string;
  error_code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== VPS WEBHOOK CALLED ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for webhooks
    );

    // Parse webhook payload
    const payload = await req.json();
    console.log('VPS webhook payload:', payload);

    const { 
      job_id, 
      status, 
      message, 
      progress, 
      qr_code_image, 
      booking_result,
      error_details,
      timestamp 
    } = payload;

    if (!job_id) {
      throw new Error('job_id is required');
    }

    // Find the session by job_id
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .select('*')
      .eq('job_id', job_id)
      .single();

    if (sessionError || !session) {
      console.error('Session not found for job_id:', job_id);
      throw new Error('Session not found');
    }

    console.log('Found session:', session.id, 'for job:', job_id);

    // Prepare updated booking details
    const updatedDetails = {
      ...session.booking_details,
      stage: status,
      message: message || session.booking_details?.message,
      progress: progress || session.booking_details?.progress || 0,
      timestamp: timestamp || new Date().toISOString(),
      last_vps_update: new Date().toISOString()
    };

    // Add QR code if provided
    if (qr_code_image) {
      updatedDetails.qr_code_image = qr_code_image;
      updatedDetails.qr_updated_at = new Date().toISOString();
    }

    // Add booking result if completed
    if (booking_result) {
      updatedDetails.booking_result = booking_result;
    }

    // Add error details if failed
    if (error_details) {
      updatedDetails.error_details = error_details;
    }

    // Determine final status
    let finalStatus = status;
    if (status === 'completed' || status === 'success') {
      finalStatus = 'completed';
      updatedDetails.completed_at = new Date().toISOString();
    } else if (status === 'failed' || status === 'error') {
      finalStatus = 'failed';
      updatedDetails.completed_at = new Date().toISOString();
    } else if (status === 'cancelled' || status === 'stopped') {
      finalStatus = 'cancelled';
      updatedDetails.completed_at = new Date().toISOString();
    }

    // Update the session
    const { error: updateError } = await supabaseClient
      .from('booking_sessions')
      .update({
        status: finalStatus,
        booking_details: updatedDetails,
        ...(finalStatus === 'completed' || finalStatus === 'failed' || finalStatus === 'cancelled' 
          ? { completed_at: new Date().toISOString() } 
          : {}),
        ...(qr_code_image ? { qr_code_image } : {})
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      throw updateError;
    }

    // Broadcast real-time updates to the user
    const broadcastPayload: any = {
      session_id: session.id,
      job_id: job_id,
      status: finalStatus,
      message: message,
      progress: progress
    };

    // Include QR code in broadcast if provided
    if (qr_code_image) {
      broadcastPayload.qr_code = qr_code_image;
    }

    // Include booking result if completed
    if (booking_result) {
      broadcastPayload.booking_result = booking_result;
    }

    // Broadcast status update
    await supabaseClient
      .channel(`booking-${session.user_id}`)
      .send({
        type: 'broadcast',
        event: 'status_update',
        payload: broadcastPayload
      });

    // If QR code is provided, also send QR-specific event
    if (qr_code_image) {
      await supabaseClient
        .channel(`booking-${session.user_id}`)
        .send({
          type: 'broadcast',
          event: 'qr_code_update',
          payload: {
            session_id: session.id,
            job_id: job_id,
            qr_code: qr_code_image,
            timestamp: new Date().toISOString()
          }
        });
    }

    console.log('VPS webhook processed successfully:', {
      sessionId: session.id,
      jobId: job_id,
      status: finalStatus,
      hasQR: !!qr_code_image,
      hasResult: !!booking_result
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      session_id: session.id,
      status: finalStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('VPS webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process webhook' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
