
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[VPS-WEBHOOK] Webhook received');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body
    const payload: WebhookPayload = await req.json();
    console.log('[VPS-WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.type || !payload.job_id || !payload.timestamp) {
      console.error('[VPS-WEBHOOK] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, job_id, timestamp' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate webhook signature (basic implementation)
    const expectedToken = Deno.env.get('VPS_WEBHOOK_SECRET') || 'test-secret-token-12345';
    const receivedSignature = payload.signature || req.headers.get('x-webhook-signature');
    
    if (!receivedSignature || receivedSignature !== expectedToken) {
      console.error('[VPS-WEBHOOK] Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the booking session by job_id
    const { data: session, error: sessionError } = await supabase
      .from('booking_sessions')
      .select('*')
      .eq('id', payload.job_id)
      .single();

    if (sessionError || !session) {
      console.error('[VPS-WEBHOOK] Session not found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Booking session not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[VPS-WEBHOOK] Found session:', session.id);

    // Process webhook based on type
    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    let realtimeData: any = {
      type: payload.type,
      job_id: payload.job_id,
      timestamp: payload.timestamp,
    };

    switch (payload.type) {
      case 'status_update':
        const statusData = payload.data as StatusUpdateData;
        updateData.status = statusData.status;
        
        // Update booking_details with status information
        const currentDetails = session.booking_details || {};
        updateData.booking_details = {
          ...currentDetails,
          stage: statusData.stage || statusData.status,
          message: statusData.message,
          timestamp: payload.timestamp,
          cycle_count: statusData.cycle_count,
          slots_found: statusData.slots_found,
          current_operation: statusData.current_operation,
        };

        realtimeData.data = statusData;
        console.log('[VPS-WEBHOOK] Processing status_update:', statusData.status);
        break;

      case 'qr_code_update':
        const qrData = payload.data as QRCodeUpdateData;
        
        // Update booking_details with QR code
        const currentQRDetails = session.booking_details || {};
        updateData.booking_details = {
          ...currentQRDetails,
          qr_code: qrData.qr_code,
          timestamp: payload.timestamp,
        };

        realtimeData.data = qrData;
        console.log('[VPS-WEBHOOK] Processing qr_code_update');
        break;

      case 'booking_completed':
        const completedData = payload.data as BookingCompletedData;
        updateData.status = 'completed';
        updateData.completed_at = payload.timestamp;
        
        // Update booking_details with completion info
        const currentCompletedDetails = session.booking_details || {};
        updateData.booking_details = {
          ...currentCompletedDetails,
          stage: 'completed',
          message: completedData.completion_message || 'Booking completed successfully',
          timestamp: payload.timestamp,
          booking_details: completedData.booking_details,
        };

        realtimeData.data = completedData;
        console.log('[VPS-WEBHOOK] Processing booking_completed');
        break;

      case 'booking_failed':
        const failedData = payload.data as BookingFailedData;
        updateData.status = 'error';
        updateData.error_message = failedData.error_message;
        updateData.completed_at = payload.timestamp;
        
        // Update booking_details with error info
        const currentFailedDetails = session.booking_details || {};
        updateData.booking_details = {
          ...currentFailedDetails,
          stage: 'error',
          message: failedData.error_message,
          timestamp: payload.timestamp,
          error_code: failedData.error_code,
        };

        realtimeData.data = failedData;
        console.log('[VPS-WEBHOOK] Processing booking_failed');
        break;

      default:
        console.error('[VPS-WEBHOOK] Unknown webhook type:', payload.type);
        return new Response(
          JSON.stringify({ error: 'Unknown webhook type' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    // Update the booking session in the database
    const { error: updateError } = await supabase
      .from('booking_sessions')
      .update(updateData)
      .eq('id', payload.job_id);

    if (updateError) {
      console.error('[VPS-WEBHOOK] Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update booking session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[VPS-WEBHOOK] Session updated successfully');

    // Send real-time update to the frontend via Supabase Realtime
    // This will trigger the real-time subscription in the frontend
    const channel = supabase.channel(`booking-${session.user_id}`);
    
    try {
      await channel.send({
        type: 'broadcast',
        event: 'vps_update',
        payload: realtimeData,
      });
      console.log('[VPS-WEBHOOK] Real-time update sent');
    } catch (realtimeError) {
      console.error('[VPS-WEBHOOK] Failed to send real-time update:', realtimeError);
      // Don't fail the webhook if real-time update fails
    }

    // Log the webhook event for audit purposes
    try {
      await supabase.from('audit_log').insert({
        table_name: 'booking_sessions',
        operation: 'UPDATE',
        user_id: session.user_id,
        record_id: payload.job_id,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error('[VPS-WEBHOOK] Failed to log audit event:', auditError);
      // Don't fail the webhook if audit logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        job_id: payload.job_id,
        type: payload.type,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[VPS-WEBHOOK] Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
