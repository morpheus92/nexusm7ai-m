/// <reference path="../types/alipay.d.ts" />
import { AlipaySdk } from '@alipay/mcp-server-alipay';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';

// Declare variables outside to be accessible by the handler
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;
let alipaySdkInstance: AlipaySdk | null = null;
let initializationError: string | null = null;

try {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Alipay Create Order Init: SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not Set');
  console.log('Alipay Create Order Init: SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL or Service Role Key environment variables are not set.');
  }
  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const AP_APP_ID = process.env.AP_APP_ID;
  const AP_APP_KEY = process.env.AP_APP_KEY;
  const AP_PUB_KEY = process.env.AP_PUB_KEY;
  const AP_CURRENT_ENV = process.env.AP_CURRENT_ENV;
  const AP_ENCRYPTION_ALGO = process.env.AP_ENCRYPTION_ALGO;

  console.log('Alipay Create Order Init: AP_APP_ID:', AP_APP_ID ? 'Set' : 'Not Set');
  console.log('Alipay Create Order Init: AP_APP_KEY:', AP_APP_KEY ? 'Set (Private Key)' : 'Not Set (Private Key)'); // Log presence, not value
  console.log('Alipay Create Order Init: AP_PUB_KEY:', AP_PUB_KEY ? 'Set (Public Key)' : 'Not Set (Public Key)'); // Log presence, not value
  console.log('Alipay Create Order Init: AP_CURRENT_ENV:', AP_CURRENT_ENV || 'Not Set');
  console.log('Alipay Create Order Init: AP_ENCRYPTION_ALGO:', AP_ENCRYPTION_ALGO || 'Not Set');

  if (!AP_APP_ID || !AP_APP_KEY || !AP_PUB_KEY) {
    throw new Error("Alipay environment variables AP_APP_ID, AP_APP_KEY, or AP_PUB_KEY are not set.");
  }

  alipaySdkInstance = new AlipaySdk({
    appId: AP_APP_ID,
    privateKey: AP_APP_KEY,
    alipayPublicKey: AP_PUB_KEY,
    gateway: AP_CURRENT_ENV === 'sandbox' ? 'https://openapi.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do',
    signType: AP_ENCRYPTION_ALGO || 'RSA2',
  });
  console.log('Alipay Create Order Init: SDKs initialized successfully.');
} catch (error: any) {
  console.error('Alipay Create Order Init Error: Function will return 500 due to initialization failure.', error.message, error.stack);
  initializationError = `Serverless Function Initialization Failed: ${error.message}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  // If initialization failed, return an error immediately
  if (initializationError) {
    console.error('Alipay Create Order Handler: Initialization error detected, returning 500.');
    return new Response(JSON.stringify({ error: initializationError }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Ensure clients are available (should be if no initializationError)
  if (!alipaySdkInstance || !supabaseClient) {
    console.error('Alipay Create Order Handler: SDKs not initialized, but no explicit initializationError. This indicates a deeper issue.');
    return new Response(JSON.stringify({ error: 'Internal server error: SDKs not initialized.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    console.log('Alipay Create Order Handler: Processing POST request.');
    const { userId, planId, amount, orderNumber, subject } = await req.json();
    console.log('Alipay Create Order Handler: Received payload:', { userId, planId, amount, orderNumber, subject });

    if (!userId || !planId || !amount || !orderNumber || !subject) {
      console.warn('Alipay Create Order Handler: Missing required fields in request body.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, planId, amount, orderNumber, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Create a pending order in Supabase
    console.log('Alipay Create Order Handler: Inserting pending order into Supabase...');
    const { data: newOrder, error: insertError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        product_id: planId, // Using product_id for plan_id as per schema
        amount: amount,
        status: 'pending',
        order_number: orderNumber,
        payment_method: 'alipay',
        plan_id: planId, // Also store in plan_id column
      })
      .select()
      .single();

    if (insertError) {
      console.error('Alipay Create Order Handler: Supabase insert error:', insertError.message);
      throw new Error(`Failed to create order in database: ${insertError.message}`);
    }
    console.log('Alipay Create Order Handler: Order created in Supabase:', newOrder.id);

    // 2. Call Alipay precreate API
    console.log('Alipay Create Order Handler: Calling Alipay precreate API...');
    // IMPORTANT: Ensure process.env.VERCEL_URL is correctly set in Vercel environment variables
    // It should be your deployed Vercel URL (e.g., https://your-project.vercel.app)
    const notifyUrl = `${process.env.VERCEL_URL}/api/alipay/notify`;
    console.log('Alipay Create Order Handler: Alipay notifyUrl set to:', notifyUrl);

    const alipayResult = await alipaySdkInstance.exec('alipay.trade.precreate', {
      notifyUrl: notifyUrl,
      bizContent: {
        out_trade_no: orderNumber, // Our internal order number
        total_amount: amount.toFixed(2),
        subject: subject,
        // Add other necessary bizContent fields
      },
    });
    console.log('Alipay Create Order Handler: Alipay precreate result:', alipayResult);

    if (alipayResult.code !== '10000') {
      console.error('Alipay Create Order Handler: Alipay precreate failed:', alipayResult.subMsg || alipayResult.msg);
      // Update order status to failed if Alipay call fails
      await supabaseClient.from('orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', newOrder.id);
      throw new Error(`Alipay precreate failed: ${alipayResult.subMsg || alipayResult.msg}`);
    }

    const qrCodeUrl = alipayResult.qrCode;
    if (!qrCodeUrl) {
      console.error('Alipay Create Order Handler: No QR code received from Alipay.');
      // Update order status to failed if no QR code
      await supabaseClient.from('orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', newOrder.id);
      throw new Error('Failed to get QR code from Alipay.');
    }
    console.log('Alipay Create Order Handler: QR Code URL received.');

    return new Response(
      JSON.stringify({ qrCodeUrl: qrCodeUrl, orderId: newOrder.order_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Alipay Create Order Handler Error: Caught exception during request processing.', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}