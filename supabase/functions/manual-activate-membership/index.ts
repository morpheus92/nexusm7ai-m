// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference types="https://deno.land/std@0.190.0/http/server.d.ts" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.45.0/dist/index.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 这是一个最小化的测试日志
    console.log('Edge Function Test: manual-activate-membership was called!');

    // 尝试解析请求体，即使不使用它，以确保请求体解析不会导致崩溃
    try {
      const body = await req.json();
      console.log('Request body received:', body);
    } catch (e) {
      console.warn('Could not parse request body as JSON:', e);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Edge Function Test: Function received call successfully!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge Function Test Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error during test' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});