import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, cache-control',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

interface QRStoragePayload {
  job_id: string;
  qr_image_data: string; // base64 data
  auth_ref?: string;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== QR STORAGE FUNCTION CALLED ===');
    
    // Create Supabase client with service role for storage operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      // Store new QR code
      const payload: QRStoragePayload = await req.json();
      const { job_id, qr_image_data, auth_ref, timestamp } = payload;

      if (!job_id || !qr_image_data) {
        throw new Error('job_id and qr_image_data are required');
      }

      console.log('Storing QR code for job:', job_id);

      // Convert base64 to blob
      const base64Data = qr_image_data.replace(/^data:image\/[a-z]+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Generate unique filename with timestamp
      const timestamp_str = timestamp || new Date().toISOString();
      const filename = `qr-codes/${job_id}/${Date.now()}.png`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('booking-assets')
        .upload(filename, binaryData, {
          contentType: 'image/png',
          cacheControl: '60', // Cache for 60 seconds
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload failed:', uploadError);
        throw uploadError;
      }

      console.log('QR code uploaded to:', filename);

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('booking-assets')
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;
      console.log('QR code public URL:', publicUrl);

      // Find the booking session and update with QR URL
      const { data: session, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('job_id', job_id)
        .single();

      if (!sessionError && session) {
        // Update session with QR URL
        const updatedDetails = {
          ...session.booking_details,
          qr_image_url: publicUrl,
          qr_filename: filename,
          qr_updated_at: timestamp_str,
          qr_auth_ref: auth_ref
        };

        await supabaseClient
          .from('booking_sessions')
          .update({
            booking_details: updatedDetails,
            qr_code_image: publicUrl // Store URL instead of base64
          })
          .eq('id', session.id);

        // Send real-time notification about new QR
        await supabaseClient
          .channel(`booking-${session.user_id}`)
          .send({
            type: 'broadcast',
            event: 'qr_code_update',
            payload: {
              session_id: session.id,
              job_id: job_id,
              qr_url: publicUrl,
              qr_filename: filename,
              timestamp: timestamp_str,
              auth_ref: auth_ref
            }
          });

        console.log('QR code stored and broadcasted successfully');
      }

      return new Response(JSON.stringify({ 
        success: true,
        qr_url: publicUrl,
        filename: filename,
        message: 'QR code stored successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (req.method === 'GET') {
      // Get latest QR code for a job
      const url = new URL(req.url);
      const job_id = url.searchParams.get('job_id');

      if (!job_id) {
        throw new Error('job_id parameter is required');
      }

      // Find the session and get latest QR
      const { data: session, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('job_id', job_id)
        .single();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ 
          error: 'Session not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const qr_url = session.booking_details?.qr_image_url || session.qr_code_image;
      const qr_updated_at = session.booking_details?.qr_updated_at;

      return new Response(JSON.stringify({ 
        success: true,
        qr_url: qr_url,
        qr_updated_at: qr_updated_at,
        job_id: job_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('QR Storage function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process QR storage request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 