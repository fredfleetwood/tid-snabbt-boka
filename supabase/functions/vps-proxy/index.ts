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

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'job_id parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 VPS Proxy: ${action} for job ${jobId}`);

    let vpsUrl: string;
    let method = 'GET';

    switch (action) {
      case 'qr':
        vpsUrl = `http://87.106.247.92:8000/api/v1/booking/${jobId}/qr`;
        break;
      case 'status':
        vpsUrl = `http://87.106.247.92:8000/api/v1/booking/${jobId}/status`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`📡 Proxying to: ${vpsUrl}`);

    const vpsResponse = await fetch(vpsUrl, {
      method,
      headers: {
        'Authorization': 'Bearer test-secret-token-12345',
        'Content-Type': 'application/json'
      }
    });

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