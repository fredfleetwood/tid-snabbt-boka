import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
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

    // Parse query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    console.log('Fetching booking logs:', {
      userId: user.id,
      sessionId,
      limit,
      offset,
      status
    });

    let query = supabaseClient
      .from('booking_sessions')
      .select(`
        id,
        job_id,
        status,
        created_at,
        completed_at,
        booking_details,
        qr_code_image
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by session ID if provided
    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    if (!sessionId) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    // Get total count for pagination
    let totalCount = 0;
    if (!sessionId) {
      let countQuery = supabaseClient
        .from('booking_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (status) {
        countQuery = countQuery.eq('status', status);
      }

      const { count } = await countQuery;
      totalCount = count || 0;
    }

    // Process sessions to format logs
    const processedSessions = sessions?.map(session => ({
      id: session.id,
      job_id: session.job_id,
      status: session.status,
      created_at: session.created_at,
      completed_at: session.completed_at,
      has_qr_code: !!session.qr_code_image,
      booking_details: {
        stage: session.booking_details?.stage,
        message: session.booking_details?.message,
        progress: session.booking_details?.progress || 0,
        timestamp: session.booking_details?.timestamp,
        booking_result: session.booking_details?.booking_result,
        error_details: session.booking_details?.error_details,
        config: session.booking_details?.config ? {
          license_type: session.booking_details.config.license_type,
          exam_type: session.booking_details.config.exam_type,
          locations: session.booking_details.config.locations,
          date_ranges: session.booking_details.config.date_ranges?.length || 0
        } : null
      }
    })) || [];

    console.log('Booking logs retrieved:', {
      userId: user.id,
      sessionCount: processedSessions.length,
      totalCount: sessionId ? 1 : totalCount
    });

    return new Response(JSON.stringify({
      success: true,
      data: processedSessions,
      pagination: sessionId ? null : {
        offset,
        limit,
        total: totalCount,
        has_more: offset + limit < totalCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching booking logs:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to fetch booking logs'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
