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
    throw new Error('Supabase URL or Service Role Key environment variables are not set.');
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
    console.log('Alipay Notify: Incoming POST request.');
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        params[key] = value;
      }
    }
    console.log('Alipay Notify: Received params:', params);

    console.log('Alipay Notify: Verifying signature...');
    const signVerified = alipaySdkInstance.checkRsaSign(params, params.sign, params.charset || 'utf-8', params.sign_type || 'RSA2'); // Use alipaySdkInstance
    console.log('Alipay Notify: Signature verified:', signVerified);

    if (!signVerified) {
      console.warn('Alipay Notify: Signature verification failed.');
      return new Response('fail', { status: 400, headers: corsHeaders });
    }

    const tradeStatus = params.trade_status;
    const outTradeNo = params.out_trade_no;
    const alipayTradeNo = params.trade_no;

    if (!outTradeNo) {
      console.error('Alipay Notify: Missing out_trade_no in notification.');
      return new Response('fail', { status: 400, headers: corsHeaders });
    }

    console.log(`Alipay Notify: Fetching order ${outTradeNo} from Supabase...`);
    const { data: order, error: fetchOrderError } = await supabaseClient // Use supabaseClient
      .from('orders')
      .select('*')
      .eq('order_number', outTradeNo)
      .single();

    if (fetchOrderError || !order) {
      console.error('Alipay Notify: Order not found in DB or fetch error:', fetchOrderError?.message);
      return new Response('fail', { status: 404, headers: corsHeaders });
    }
    console.log('Alipay Notify: Order found:', order.id, 'Status:', order.status);

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      if (order.status === 'paid') {
        console.log(`Alipay Notify: Order ${outTradeNo} already processed as paid.`);
        return new Response('success', { status: 200, headers: corsHeaders });
      }

      console.log(`Alipay Notify: Activating membership for user ${order.user_id} with plan ${order.plan_id}...`);
      const { error: activateError } = await supabaseClient.rpc('activate_membership', { // Use supabaseClient
        p_user_id: order.user_id!,
        p_plan_id: order.plan_id!,
        p_order_id: order.id,
      });

      if (activateError) {
        console.error('Alipay Notify: Error activating membership:', activateError.message);
        await supabaseClient.from('orders').update({ status: 'failed', alipay_trade_no: alipayTradeNo, updated_at: new Date().toISOString() }).eq('id', order.id); // Use supabaseClient
        return new Response('fail', { status: 500, headers: corsHeaders });
      }
      console.log('Alipay Notify: Membership activated successfully.');

      const { error: updateTradeNoError } = await supabaseClient // Use supabaseClient
        .from('orders')
        .update({ alipay_trade_no: alipayTradeNo, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateTradeNoError) {
        console.error('Alipay Notify: Error updating trade_no:', updateTradeNoError.message);
      }

      console.log(`Alipay Notify: Payment successful for order ${outTradeNo}. User ${order.user_id} membership activated.`);
      return new Response('success', { status: 200, headers: corsHeaders });
    } else if (tradeStatus === 'TRADE_CLOSED' || tradeStatus === 'TRADE_CANCELED') {
      console.log(`Alipay Notify: Payment closed/canceled for order ${outTradeNo}.`);
      const { error: updateOrderError } = await supabaseClient // Use supabaseClient
        .from('orders')
        .update({
          status: 'cancelled',
          alipay_trade_no: alipayTradeNo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateOrderError) {
        console.error('Alipay Notify: Error updating order status to cancelled:', updateOrderError.message);
        return new Response('fail', { status: 500, headers: corsHeaders });
      }
      return new Response('success', { status: 200, headers: corsHeaders });
    }

    console.warn(`Alipay Notify: Unhandled trade_status: ${tradeStatus} for order ${outTradeNo}.`);
    return new Response('fail', { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error('Alipay Notify Handler Error:', error.message, error.stack);
    return new Response('fail', { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}