import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
};

interface LogEntry {
  level: string;
  component: string;
  operation: string;
  message: string;
  user_id?: string;
  session_id?: string;
  job_id?: string;
  data?: any;
  duration_ms?: number;
  error_details?: any;
  trace_id?: string;
  step_number?: number;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'view';

    if (req.method === 'GET' && action === 'view') {
      return await viewLogs(supabaseClient, url.searchParams);
    } else if (req.method === 'GET' && action === 'trace') {
      const traceId = url.searchParams.get('trace_id');
      if (!traceId) {
        return new Response(JSON.stringify({ error: 'trace_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return await viewTrace(supabaseClient, traceId);
    } else if (req.method === 'POST' && action === 'log') {
      const logEntry = await req.json();
      return await addLog(supabaseClient, logEntry);
    } else if (req.method === 'DELETE' && action === 'cleanup') {
      const daysOld = parseInt(url.searchParams.get('days') || '7');
      return await cleanupLogs(supabaseClient, daysOld);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('System logs error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function viewLogs(supabaseClient: any, searchParams: URLSearchParams) {
  let query = supabaseClient
    .from('system_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  // Apply filters
  const level = searchParams.get('level');
  const component = searchParams.get('component');
  const operation = searchParams.get('operation');
  const userId = searchParams.get('user_id');
  const jobId = searchParams.get('job_id');
  const traceId = searchParams.get('trace_id');
  const limit = parseInt(searchParams.get('limit') || '100');
  const since = searchParams.get('since');

  if (level) query = query.eq('level', level);
  if (component) query = query.eq('component', component);
  if (operation) query = query.eq('operation', operation);
  if (userId) query = query.eq('user_id', userId);
  if (jobId) query = query.eq('job_id', jobId);
  if (traceId) query = query.eq('trace_id', traceId);
  if (since) query = query.gte('timestamp', since);

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch logs: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    logs: data,
    count: data?.length || 0,
    filters: { level, component, operation, user_id: userId, job_id: jobId, trace_id: traceId, limit, since }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function viewTrace(supabaseClient: any, traceId: string) {
  const { data, error } = await supabaseClient
    .from('system_logs')
    .select('*')
    .eq('trace_id', traceId)
    .order('step_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch trace: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    trace_id: traceId,
    logs: data,
    steps: data?.length || 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function addLog(supabaseClient: any, logEntry: LogEntry) {
  if (!logEntry.timestamp) {
    logEntry.timestamp = new Date().toISOString();
  }

  const { data, error } = await supabaseClient
    .from('system_logs')
    .insert(logEntry)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add log: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    log: data
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function cleanupLogs(supabaseClient: any, daysOld: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabaseClient
    .from('system_logs')
    .delete()
    .lt('timestamp', cutoffDate.toISOString());

  if (error) {
    throw new Error(`Failed to cleanup logs: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Deleted logs older than ${daysOld} days`,
    cutoff_date: cutoffDate.toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
} 