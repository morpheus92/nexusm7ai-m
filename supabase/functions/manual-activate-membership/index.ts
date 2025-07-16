/// <reference lib="deno.ns" />
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
    const { identifier, planId } = await req.json();

    if (!identifier || !planId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing identifier or planId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL or Service Role Key is not set in environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Find the user ID based on identifier (email or username)
    let userId: string | null = null;
    let userEmail: string | null = null;
    let username: string | null = null;

    // Try to find by email first
    const { data: emailProfile, error: emailError } = await supabase
      .from('profiles')
      .select('id, email, username')
      .eq('email', identifier)
      .single();

    if (emailProfile) {
      userId = emailProfile.id;
      userEmail = emailProfile.email;
      username = emailProfile.username;
    } else if (emailError && emailError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error querying profile by email:', emailError);
      throw new Error(`Database query error by email: ${emailError.message}`);
    }

    // If not found by email, try to find by username
    if (!userId) {
      const { data: usernameProfile, error: usernameError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('username', identifier)
        .single();

      if (usernameProfile) {
        userId = usernameProfile.id;
        userEmail = usernameProfile.email;
        username = usernameProfile.username;
      } else if (usernameError && usernameError.code !== 'PGRST116') {
        console.error('Error querying profile by username:', usernameError);
        throw new Error(`Database query error by username: ${usernameError.message}`);
      }
    }

    // If user still not found, attempt to create a new user (if identifier is an email)
    if (!userId && identifier.includes('@')) {
        console.log(`User with identifier ${identifier} not found, attempting to create new user.`);
        const { data: authSignUpData, error: authSignUpError } = await supabase.auth.admin.createUser({
            email: identifier,
            password: Math.random().toString(36).slice(-8), // Generate a random password
            email_confirm: true, // Require email confirmation for security
            user_metadata: { username: identifier.split('@')[0] } // Set initial username
        });

        if (authSignUpError) {
            console.error('Error creating new auth user:', authSignUpError);
            throw new Error(`Failed to create new user: ${authSignUpError.message}`);
        }
        userId = authSignUpData.user?.id || null;
        userEmail = authSignUpData.user?.email || null;
        username = authSignUpData.user?.user_metadata?.username as string || identifier.split('@')[0];
        console.log(`New user created with ID: ${userId}`);
        // The handle_new_user trigger should create the profile, but we might need to wait a bit or re-fetch
        // For now, assume the trigger works quickly.
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or could not be created.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Call the activate_membership RPC function
    const { error: rpcError } = await supabase.rpc('activate_membership', {
      p_user_id: userId,
      p_plan_id: planId,
      p_order_id: null, // No order ID for manual activation
    });

    if (rpcError) {
      console.error('Error calling activate_membership RPC:', rpcError);
      throw new Error(`Failed to activate membership: ${rpcError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Membership activated for ${username || userEmail || userId}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Manual Activate Membership Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});