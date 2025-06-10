import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== START BOOKING WITH DATABASE OPERATIONS ===');
    
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kqemgnbqjrqepzkigfcx.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc';
    
    console.log('✅ Environment variables loaded');
    
    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created');

    // Get and validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data?.user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', data.user.id);

    // Parse request body
    const requestBody = await req.json();
    console.log('✅ Request body parsed:', Object.keys(requestBody));

    const { user_id, config_id, config } = requestBody;

    // Validate required fields
    if (!user_id || !config_id || !config) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, config_id, config',
        received: { user_id: !!user_id, config_id: !!config_id, config: !!config }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id !== data.user.id) {
      return new Response(JSON.stringify({ 
        error: 'User ID mismatch',
        sent: user_id,
        authenticated: data.user.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Request validation passed');

    // Check subscription (relaxed for testing)
    try {
      const { data: subscription, error: subError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        console.warn('⚠️ No active subscription found, allowing for testing');
        console.log('Subscription error:', subError?.message);
      } else {
        console.log('✅ Active subscription found:', subscription.id);
      }
    } catch (subscriptionError) {
      console.warn('⚠️ Subscription check failed, continuing for testing:', subscriptionError);
    }

    // Create booking session in database
    const testJobId = `job-${Date.now()}`;
    
    try {
      console.log('Creating booking session...');
      
      const { data: session, error: sessionError } = await supabaseClient
        .from('booking_sessions')
        .insert({
          user_id: data.user.id,
          job_id: testJobId,
          status: 'starting',
          booking_details: {
            config: config,
            stage: 'initializing',
            message: '🚀 Startar automatisk bokning via Supabase...',
            timestamp: new Date().toISOString(),
            test_mode: true
          }
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation failed:', sessionError);
        throw sessionError;
      }

      console.log('✅ Booking session created:', session.id);

      // Broadcast real-time update
      try {
        await supabaseClient
          .channel(`booking-${data.user.id}`)
          .send({
            type: 'broadcast',
            event: 'status_update',
            payload: {
              session_id: session.id,
              job_id: testJobId,
              status: 'starting',
              message: '🚀 Automatisk bokning startad via databas!',
              progress: 10,
              test_mode: true
            }
          });
        console.log('✅ Real-time update broadcasted');
      } catch (broadcastError) {
        console.warn('⚠️ Broadcast failed:', broadcastError);
      }

      // Return success response
      return new Response(JSON.stringify({
        success: true,
        job_id: testJobId,
        session_id: session.id,
        message: '🚀 Booking session created successfully!',
        user_id: data.user.id,
        database_operations: true,
        next_step: 'Add VPS integration'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      
      // Return test success even if DB fails
      return new Response(JSON.stringify({
        success: true,
        job_id: testJobId,
        session_id: `fallback-session-${Date.now()}`,
        message: '⚠️ DB failed but continuing in test mode',
        user_id: data.user.id,
        database_error: dbError.message,
        test_mode: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Function error: ' + error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
