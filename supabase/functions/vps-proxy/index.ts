import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    const action = url.searchParams.get('action') || 'qr';

    console.log(`🔄 VPS Proxy: ${action} for job ${jobId || 'new'}`);

    let vpsUrl: string;
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'qr':
        if (!jobId) {
          return new Response(JSON.stringify({ error: 'job_id parameter required for QR action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        vpsUrl = `http://87.106.247.92:8000/api/v1/booking/${jobId}/qr`;
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
          return new Response(JSON.stringify({ error: 'start action requires POST method' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        try {
          body = await req.text();
          vpsUrl = `http://87.106.247.92:8000/api/v1/booking/start`;
          method = 'POST';
        } catch (e) {
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
      }
    };

    if (body) {
      requestOptions.body = body;
    }

    const vpsResponse = await fetch(vpsUrl, requestOptions);

    if (!vpsResponse.ok) {
      const errorText = await vpsResponse.text();
      return new Response(JSON.stringify({ 
        error: `VPS server error: ${vpsResponse.status}`,
        details: errorText
      }), {
        status: vpsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await vpsResponse.json();
    
    console.log(`✅ VPS Proxy success for ${action}:`, data.type || data.status || 'response');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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