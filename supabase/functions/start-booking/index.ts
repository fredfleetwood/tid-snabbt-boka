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
    console.log('=== INTERMEDIATE TEST FUNCTION CALLED ===');
    
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

    // Return test success response
    return new Response(JSON.stringify({
      success: true,
      job_id: `test-job-${Date.now()}`,
      session_id: `test-session-${Date.now()}`,
      message: '🧪 Intermediate test: Auth working!',
      user_id: data.user.id,
      test_mode: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
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
