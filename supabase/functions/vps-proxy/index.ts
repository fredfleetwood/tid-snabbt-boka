import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, cache-control, pragma, x-trace-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Enhanced logging utility for VPS Proxy
class ProxyLogger {
  private traceId: string;
  private stepCounter: number = 0;

  constructor(externalTraceId?: string) {
    this.traceId = externalTraceId 
      ? `${externalTraceId}_proxy_${Date.now() % 10000}`
      : `proxy_trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 VPS Proxy trace: ${this.traceId}`);
  }

  async info(operation: string, message: string, data?: any) {
    this.stepCounter++;
    const traceInfo = `[${this.traceId.slice(-8)}]`;
    console.log(`ℹ️ ${traceInfo} [proxy] [${operation}] ${message}`);
    if (data) console.log(`   Data:`, data);
  }

  async error(operation: string, message: string, error?: any) {
    this.stepCounter++;
    const traceInfo = `[${this.traceId.slice(-8)}]`;
    console.log(`❌ ${traceInfo} [proxy] [${operation}] ${message}`);
    if (error) console.log(`   Error:`, error);
  }

  getTraceId(): string {
    return this.traceId;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize logger with potential external trace ID
  const externalTraceId = req.headers.get('x-trace-id') || undefined;
  const logger = new ProxyLogger(externalTraceId);

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    const action = url.searchParams.get('action') || 'qr';

    await logger.info('proxy-start', `VPS Proxy request: ${action}`, {
      job_id: jobId,
      method: req.method,
      action: action
    });

    let vpsUrl: string;
    let method = 'GET';
    let body: string | null = null;
    let requestData: any = null;

    switch (action) {
      case 'qr':
        if (!jobId) {
          return new Response(JSON.stringify({ error: 'job_id parameter required for QR action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        vpsUrl = `http://87.106.247.92:8000/api/v1/qr/${jobId}`;
        break;
      case 'status':
        if (!jobId) {
          return new Response(JSON.stringify({ error: 'job_id parameter required for status action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        vpsUrl = `http://87.106.247.92:8000/api/v1/booking/status/${jobId}`;
        break;
      case 'start':
        // For booking start, we expect POST data in the request body
        if (req.method !== 'POST') {
          await logger.error('start-wrong-method', 'start action requires POST method');
          return new Response(JSON.stringify({ error: 'start action requires POST method' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        try {
          const requestText = await req.text();
          body = requestText;
          requestData = JSON.parse(requestText);
          
          // Add trace ID to the request body for VPS server
          if (requestData && typeof requestData === 'object') {
            requestData.trace_id = logger.getTraceId();
            body = JSON.stringify(requestData);
          }
          
          vpsUrl = `http://87.106.247.92:8000/api/v1/booking/start`;
          method = 'POST';
          
          await logger.info('start-request-prepared', 'Start booking request prepared', {
            has_trace_id: !!requestData.trace_id,
            config_keys: requestData ? Object.keys(requestData) : []
          });
        } catch (e) {
          await logger.error('start-invalid-body', 'Invalid request body for start action', e);
          return new Response(JSON.stringify({ error: 'Invalid request body for start action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
      case 'stop':
        // For booking stop, we expect POST data with job_id in the request body
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'stop action requires POST method' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        try {
          body = await req.text();
          vpsUrl = `http://87.106.247.92:8000/api/v1/booking/stop`;
          method = 'POST';
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid request body for stop action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Supported: qr, status, start, stop' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`📡 Proxying ${method} to: ${vpsUrl}`);

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': 'Bearer test-secret-token-12345',
        'Content-Type': 'application/json'
      },
      ...(body && { body })
    };

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('VPS request timeout after 10 seconds')), 10000);
    });

    try {
      await logger.info('vps-request', `Making request to VPS server`, {
        url: vpsUrl,
        method: method,
        has_body: !!body
      });

      const vpsResponse = await Promise.race([
        fetch(vpsUrl, requestOptions),
        timeoutPromise
      ]) as Response;
      
      await logger.info('vps-response', `VPS server responded`, {
        status: vpsResponse.status,
        ok: vpsResponse.ok
      });

      if (!vpsResponse.ok) {
        const errorText = await vpsResponse.text();
        await logger.error('vps-error', `VPS server returned error: ${vpsResponse.status}`, {
          status: vpsResponse.status,
          error: errorText
        });
        
        return new Response(JSON.stringify({ 
          error: `VPS server error: ${vpsResponse.status}`,
          details: errorText
        }), {
          status: vpsResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await vpsResponse.json();
      
      await logger.info('proxy-success', `VPS Proxy success for ${action}`, {
        response_type: data.type || data.status || 'response',
        job_id: data.job_id || 'unknown'
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (fetchError) {
      await logger.error('vps-fetch-error', 'VPS server fetch failed', {
        error: fetchError.message,
        url: vpsUrl
      });
      
      // Return a specific error for timeout vs other network issues
      const isTimeout = fetchError.message.includes('timeout');
      return new Response(JSON.stringify({ 
        error: isTimeout ? 'VPS server timeout' : 'VPS server unreachable',
        details: fetchError.message,
        vps_url: vpsUrl
      }), {
        status: 504, // Gateway Timeout for timeouts, 502 for other issues
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ VPS Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'VPS Proxy error: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 