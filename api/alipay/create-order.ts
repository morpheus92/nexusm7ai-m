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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL and Service Role Key environment variables are not set.");
  }
  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const AP_APP_ID = process.env.AP_APP_ID;
  const AP_APP_KEY = process.env.AP_APP_KEY;
  const AP_PUB_KEY = process.env.AP_PUB_KEY;
  const AP_CURRENT_ENV = process.env.AP_CURRENT_ENV;
  const AP_ENCRYPTION_ALGO = process.env.AP_ENCRYPTION_ALGO;

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
} catch (error: any) {
  console.error('Serverless Function Initialization Error:', error.message, error.stack);
  initializationError = `Server initialization failed: ${error.message}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  // If initialization failed, return an error immediately
  if (initializationError) {
    return new Response(JSON.stringify({ error: initializationError }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Ensure clients are available (should be if no initializationError)
  if (!alipaySdkInstance || !supabaseClient) {
    // This case should ideally not be hit if initializationError is handled, but as a fallback
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
    console.log('Alipay Create Order: Incoming POST request.');
    const requestBody = await req.json();
    const { userId, planId, amount, orderNumber, subject } = requestBody;
    console.log('Request Body:', { userId, planId, amount, orderNumber, subject });

    if (!userId || !planId || !amount || !orderNumber || !subject) {
      console.error('Missing required payment parameters in request body.');
      return new Response(JSON.stringify({ error: 'Missing required payment parameters.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Create a pending order in Supabase
    console.log('Attempting to insert order into Supabase...');
    const { data: newOrder, error: insertError } = await supabaseClient // Use supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        plan_id: planId,
        order_number: orderNumber,
        amount: amount,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !newOrder) {
      console.error('Supabase Insert Order Error:', insertError?.message || 'Unknown error during Supabase insert.');
      throw new Error(`Failed to create order in database: ${insertError?.message || 'Unknown error'}`);
    }
    console.log('Order inserted into Supabase:', newOrder.id);

    // Determine the notify_url based on the environment
    const notifyUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/alipay/notify` : 'http://localhost:3000/api/alipay/notify'; // Adjust port if needed
    console.log('Alipay Notify URL:', notifyUrl);

    // 2. Call Alipay trade.precreate API
    console.log('Calling Alipay trade.precreate...');
    const result = await alipaySdkInstance.exec('alipay.trade.precreate', { // Use alipaySdkInstance
      notifyUrl: notifyUrl,
      bizContent: {
        outTradeNo: orderNumber, // Our unique order number
        totalAmount: amount.toFixed(2), // Total amount for the order
        subject: subject, // Subject of the order
      },
    });
    console.log('Alipay Precreate Result:', result);

    if (result.code !== '10000') {
      console.error('Alipay Precreate Error:', result.msg, result.subMsg);
      // Update order status to failed if Alipay call fails
      await supabaseClient.from('orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', newOrder.id); // Use supabaseClient
      throw new Error(`Alipay precreate failed: ${result.msg} - ${result.subMsg || ''}`);
    }

    // 3. Return QR code URL
    const qrCodeUrl = result.qrCode;
    console.log('Alipay QR Code URL generated.');

    return new Response(JSON.stringify({ qrCodeUrl: qrCodeUrl, orderId: newOrder.order_number }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Alipay Create Order Handler Error:', error.message, error.stack); // Log stack trace
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}