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
    console.log('Alipay Create Order: Minimal handler executed.');
    // Always return a hardcoded successful dummy response
    return new Response(JSON.stringify({ qrCodeUrl: 'https://example.com/minimal-dummy-qr-code.png', orderId: 'minimal_dummy_order_123' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Alipay Create Order: Minimal handler caught unexpected error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error (Minimal Dummy)' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}