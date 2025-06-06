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

    const { config_id } = await req.json();

    // Get the booking config
    const { data: config, error: configError } = await supabaseClient
      .from('booking_configs')
      .select('*')
      .eq('id', config_id)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      throw new Error('Booking config not found');
    }

    // Create a test booking session
    const { data: session, error: sessionError } = await supabaseClient
      .from('booking_sessions')
      .insert({
        user_id: user.id,
        config_id: config_id,
        status: 'initializing',
        started_at: new Date().toISOString(),
        booking_details: {
          stage: 'test_mode',
          message: '🧪 TEST MODE: Startar simulerad bokning...',
          timestamp: new Date().toISOString(),
          logs: [{
            message: '🧪 TEST MODE: Startar simulerad bokning...',
            timestamp: new Date().toISOString(),
            stage: 'test_initializing'
          }]
        }
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error('Failed to create test booking session');
    }

    console.log('Test booking session created:', session.id);

    // Simulate the booking process with delays
    const simulateBookingSteps = async () => {
      const steps = [
        {
          status: 'initializing',
          stage: 'test_browser_start',
          message: '🧪 TEST: Startar webbläsare...',
          delay: 2000
        },
        {
          status: 'waiting_bankid',
          stage: 'test_bankid',
          message: '🧪 TEST: Simulerar BankID-inloggning...',
          qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          delay: 5000
        },
        {
          status: 'searching',
          stage: 'test_search',
          message: '🧪 TEST: Söker efter lediga tider...',
          delay: 3000
        },
        {
          status: 'booking',
          stage: 'test_booking',
          message: '🧪 TEST: Försöker boka tid...',
          delay: 2000
        },
        {
          status: 'completed',
          stage: 'test_completed',
          message: '🧪 TEST: Simulering slutförd! (Ingen riktig bokning gjordes)',
          delay: 1000
        }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));

        const currentDetails = {
          stage: step.stage,
          message: step.message,
          timestamp: new Date().toISOString(),
          qr_code: step.qr_code || undefined,
          logs: [] // Will be populated from existing logs
        };

        // Get existing session to preserve logs
        const { data: existingSession } = await supabaseClient
          .from('booking_sessions')
          .select('booking_details')
          .eq('id', session.id)
          .single();

        if (existingSession?.booking_details?.logs) {
          currentDetails.logs = existingSession.booking_details.logs;
        }

        // Add new log entry
        currentDetails.logs.push({
          message: step.message,
          timestamp: currentDetails.timestamp,
          stage: step.stage
        });

        // Keep only last 50 log entries
        currentDetails.logs = currentDetails.logs.slice(-50);

        const updateData = {
          status: step.status,
          booking_details: currentDetails,
          ...(step.status === 'completed' && { completed_at: new Date().toISOString() })
        };

        await supabaseClient
          .from('booking_sessions')
          .update(updateData)
          .eq('id', session.id);

        console.log(`Test step completed: ${step.stage}`);
      }
    };

    // Start the simulation asynchronously
    simulateBookingSteps().catch(error => {
      console.error('Test simulation error:', error);
    });

    return new Response(JSON.stringify({ 
      success: true, 
      session_id: session.id,
      message: 'Test booking simulation started',
      test_mode: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-booking function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
