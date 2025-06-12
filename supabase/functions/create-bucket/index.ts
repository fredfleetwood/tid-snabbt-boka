import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE BUCKET FUNCTION CALLED ===');
    
    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseClient.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.name === 'booking-assets');
    
    if (bucketExists) {
      console.log('Bucket booking-assets already exists');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Bucket booking-assets already exists',
        bucket_name: 'booking-assets',
        status: 'already_exists'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the bucket
    console.log('Creating booking-assets bucket...');
    const { data: bucketData, error: bucketError } = await supabaseClient.storage.createBucket('booking-assets', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
    });

    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      throw new Error(`Failed to create bucket: ${bucketError.message}`);
    }

    console.log('Bucket created successfully:', bucketData);

    // Set bucket policy to allow public access for QR images
    const { error: policyError } = await supabaseClient.rpc('set_bucket_policy', {
      bucket_name: 'booking-assets',
      policy: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": "arn:aws:s3:::booking-assets/*"
          },
          {
            "Effect": "Allow",
            "Principal": {
              "JWT": {
                "role": "service_role"
              }
            },
            "Action": ["s3:PutObject", "s3:DeleteObject"],
            "Resource": "arn:aws:s3:::booking-assets/*"
          }
        ]
      }
    });

    if (policyError) {
      console.warn('Warning: Could not set bucket policy:', policyError);
      // Continue anyway as bucket creation succeeded
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Bucket booking-assets created successfully',
      bucket_name: 'booking-assets',
      bucket_data: bucketData,
      status: 'created'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create bucket function error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Failed to create bucket' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 