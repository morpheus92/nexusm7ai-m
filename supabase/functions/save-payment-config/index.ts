/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Updated Deno std version
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
    const config = await req.json();

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL or Service Role Key is not set in environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const updates = Object.keys(config).map(key => ({
      setting_key: key,
      setting_value: config[key],
      updated_at: new Date().toISOString(),
    }));

    // Upsert (insert or update) the settings
    const { error } = await supabase
      .from('system_settings')
      .upsert(updates, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error saving payment config:', error);
      throw new Error(`Failed to save configuration: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payment configuration saved successfully.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Save Payment Config Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});