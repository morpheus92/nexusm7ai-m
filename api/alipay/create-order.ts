// api/alipay/create-order.ts
// This is an ultra-minimal dummy handler to diagnose Vercel timeout issues.
// It does not import any external libraries or process any request data.

export default function handler(req: Request) {
  // Log to confirm function execution start
  console.log('Alipay Create Order: Ultra-minimal handler started.');

  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Directly return a simple JSON response
  return new Response(JSON.stringify({
    qrCodeUrl: 'https://example.com/ultra-minimal-dummy-qr-code.png',
    orderId: 'ultra_minimal_dummy_order_123',
    message: 'This is an ultra-minimal dummy response to test Vercel function execution.'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders // Apply CORS headers
    },
  });
}