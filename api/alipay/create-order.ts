/// <reference path="../types/alipay.d.ts" />
// import { AlipaySdk } from '@alipay/mcp-server-alipay'; // Temporarily commented out
// import { createClient } from '@supabase/supabase-js'; // Temporarily commented out
// import type { Database } from '../../src/integrations/supabase/types'; // Temporarily commented out

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    console.log('Alipay Create Order: Dummy handler started.');
    // Always return a successful dummy response
    return new Response(JSON.stringify({ qrCodeUrl: 'https://example.com/dummy-qr-code.png', orderId: 'dummy_order_123' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Alipay Create Order: Dummy handler caught unexpected error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error (Dummy)' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}