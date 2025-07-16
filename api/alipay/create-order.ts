/// <reference lib="deno.ns" />
declare const Deno: any; // Explicitly declare Deno for local TypeScript compilation

import { AlipaySdk } from '@alipay/mcp-server-alipay';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types'; // Adjust path as needed

// Initialize Supabase client for the backend function
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role key for backend operations

// Add logging to see what values are being read
console.log('DEBUG: SUPABASE_URL:', SUPABASE_URL);
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set');

// Ensure environment variables are loaded before creating the client
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase URL and Service Role Key must be set in the .env file. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Alipay SDK with environment variables
const alipaySdk = new AlipaySdk({
  appId: Deno.env.get('AP_APP_ID')!,
  privateKey: Deno.env.get('AP_APP_KEY')!,
  alipayPublicKey: Deno.env.get('AP_PUB_KEY')!,
  gateway: Deno.env.get('AP_CURRENT_ENV') === 'sandbox' ? 'https://openapi.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do',
  signType: Deno.env.get('AP_ENCRYPTION_ALGO') || 'RSA2',
});

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
    const { userId, planId, amount, orderNumber, subject } = await req.json();

    if (!userId || !planId || !amount || !orderNumber || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required payment parameters.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Create a pending order in Supabase
    const { data: newOrder, error: insertError } = await supabase
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
      console.error('Supabase Insert Order Error:', insertError);
      throw new Error(`Failed to create order in database: ${insertError?.message || 'Unknown error'}`);
    }

    // Determine the notify_url based on the environment
    // In a real deployment, this should be your Vercel deployment URL + /api/alipay/notify
    const notifyUrl = Deno.env.get('VERCEL_URL') ? `https://${Deno.env.get('VERCEL_URL')}/api/alipay/notify` : 'http://localhost:3000/api/alipay/notify'; // Adjust port if needed

    console.log('Alipay Notify URL:', notifyUrl);

    // 2. Call Alipay trade.precreate API
    const result = await alipaySdk.exec('alipay.trade.precreate', {
      notifyUrl: notifyUrl,
      bizContent: {
        outTradeNo: orderNumber, // Our unique order number
        totalAmount: amount.toFixed(2), // Total amount for the order
        subject: subject, // Subject of the order
        // Optional: buyerId, storeId, terminalId, extendParams, timeoutExpress, goodsDetail, etc.
      },
    });

    if (result.code !== '10000') {
      console.error('Alipay Precreate Error:', result);
      // Update order status to failed if Alipay call fails
      await supabase.from('orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', newOrder.id);
      throw new Error(`Alipay precreate failed: ${result.msg} - ${result.subMsg || ''}`);
    }

    // 3. Return QR code URL
    const qrCodeUrl = result.qrCode;

    return new Response(JSON.stringify({ qrCodeUrl: qrCodeUrl, orderId: newOrder.order_number }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Alipay Create Order Handler Error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
