import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, cache-control, pragma, x-trace-id',
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
    
    // Create Supabase client using the authorization from the request
    const authHeader = req.headers.get('authorization');
    const apiKey = (authHeader?.replace('Bearer ', '')) || (Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      apiKey
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
      
      // Try to upload to Supabase Storage
      let uploadSuccess = false;
      let publicUrl = '';
      
      try {
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('booking-assets')
          .upload(filename, binaryData, {
            contentType: 'image/png',
            cacheControl: '60', // Cache for 60 seconds
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload failed:', uploadError);
          // Don't throw - continue with fallback
        } else {
          // Get public URL
          const { data: urlData } = supabaseClient.storage
            .from('booking-assets')
            .getPublicUrl(filename);
          publicUrl = urlData.publicUrl;
          uploadSuccess = true;
          console.log('QR code uploaded to:', filename);
        }
      } catch (storageError) {
        console.error('Storage bucket error (bucket may not exist):', storageError);
        // Continue with fallback - store QR data directly
      }



      // Find the booking session and update with QR
      const { data: session, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .select('*')
        .eq('booking_details->>job_id', job_id)
        .single();

      if (!sessionError && session) {
        let updatedDetails;
        let qrPayload;
        
        if (uploadSuccess && publicUrl) {
          // Storage upload successful - use URL
          updatedDetails = {
            ...session.booking_details,
            qr_image_url: publicUrl,
            qr_filename: filename,
            qr_updated_at: timestamp_str,
            qr_auth_ref: auth_ref,
            qr_storage_method: 'supabase_storage'
          };
          
          qrPayload = {
            session_id: session.id,
            job_id: job_id,
            qr_url: publicUrl,
            qr_filename: filename,
            timestamp: timestamp_str,
            auth_ref: auth_ref,
            storage_method: 'url'
          };
          
          await supabaseClient
            .from('booking_sessions')
            .update({
              booking_details: updatedDetails,
              qr_code_image: publicUrl
            })
            .eq('id', session.id);
            
          console.log('QR code stored in Supabase Storage and broadcasted');
        } else {
          // Storage failed - fallback to direct QR data
          updatedDetails = {
            ...session.booking_details,
            qr_image_data: qr_image_data,
            qr_updated_at: timestamp_str,
            qr_auth_ref: auth_ref,
            qr_storage_method: 'direct_data'
          };
          
          qrPayload = {
            session_id: session.id,
            job_id: job_id,
            qr_code: qr_image_data,
            timestamp: timestamp_str,
            auth_ref: auth_ref,
            storage_method: 'direct'
          };
          
          await supabaseClient
            .from('booking_sessions')
            .update({
              booking_details: updatedDetails,
              qr_code_image: qr_image_data
            })
            .eq('id', session.id);
            
          console.log('QR code stored as direct data (storage fallback)');
        }

        // Send real-time notification about new QR
        await supabaseClient
          .channel(`booking-${session.user_id}`)
          .send({
            type: 'broadcast',
            event: 'qr_code_update',
            payload: qrPayload
          });
      }

      return new Response(JSON.stringify({ 
        success: true,
        qr_url: uploadSuccess ? publicUrl : null,
        qr_data: uploadSuccess ? null : qr_image_data,
        filename: uploadSuccess ? filename : null,
        storage_method: uploadSuccess ? 'supabase_storage' : 'direct_data',
        message: uploadSuccess ? 'QR code stored in Supabase Storage' : 'QR code stored as direct data (storage fallback)'
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
        .eq('booking_details->>job_id', job_id)
        .single();

      if (sessionError || !session) {
        // FALLBACK: Check VPS Redis if no database session exists
        console.log('No database session found, checking VPS Redis...');
        
        try {
          const vpsQrResponse = await fetch(`http://87.106.247.92:8000/api/v1/booking/${job_id}/qr`, {
            headers: {
              'Authorization': 'Bearer test-secret-token-12345'
            }
          });
          
          if (vpsQrResponse.ok) {
            const vpsQrData = await vpsQrResponse.json();
            console.log('Found QR data in VPS Redis:', !!vpsQrData.image_data);
            
            if (vpsQrData.image_data) {
              return new Response(JSON.stringify({ 
                success: true,
                qr_url: null,
                qr_data: vpsQrData.image_data,
                qr_updated_at: vpsQrData.timestamp,
                job_id: job_id,
                storage_method: 'vps_redis_fallback',
                source: 'VPS Redis (database session missing)'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (vpsError) {
          console.warn('VPS Redis fallback failed:', vpsError);
        }
        
        return new Response(JSON.stringify({ 
          error: 'Session not found in database and VPS Redis'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for QR in storage first (URL), then fallback to direct data
      const qr_url = session.booking_details?.qr_image_url || session.qr_code_image;
      const qr_data = session.booking_details?.qr_image_data;
      const qr_updated_at = session.booking_details?.qr_updated_at;
      const storage_method = session.booking_details?.qr_storage_method || 'unknown';

      // Ensure we return either qr_url OR qr_data
      if (qr_url) {
        return new Response(JSON.stringify({ 
          success: true,
          qr_url: qr_url,
          qr_data: null,
          qr_updated_at: qr_updated_at,
          job_id: job_id,
          storage_method: storage_method
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (qr_data) {
        return new Response(JSON.stringify({ 
          success: true,
          qr_url: null,
          qr_data: qr_data,
          qr_updated_at: qr_updated_at,
          job_id: job_id,
          storage_method: storage_method
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'No QR code found for this job',
          job_id: job_id
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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