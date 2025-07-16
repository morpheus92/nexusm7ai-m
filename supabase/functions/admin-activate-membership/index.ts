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
        JSON.stringify({ error: '缺少必要的参数：用户标识和套餐ID。' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with Service Role Key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let userIdToActivate: string | null = null;
    let userEmail: string | null = null;
    let username: string | null = null;

    // 1. 尝试通过邮箱或用户名查找现有用户
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching existing profile:', profileError);
      throw new Error(`查询用户资料失败: ${profileError.message}`);
    }

    if (existingProfile) {
      userIdToActivate = existingProfile.id;
      userEmail = existingProfile.email;
      username = existingProfile.username;
      console.log(`Found existing user: ${username || userEmail} (ID: ${userIdToActivate})`);
    } else {
      // 2. 如果用户不存在，则创建新用户
      const isEmail = identifier.includes('@');
      const newEmail = isEmail ? identifier : `${identifier}@system.generated`;
      const newUsername = isEmail ? identifier.split('@')[0] : identifier;
      const tempPassword = Math.random().toString(36).slice(-10); // Generate a temporary password

      console.log(`Attempting to create new user with email: ${newEmail}, username: ${newUsername}`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm for admin-created users
        user_metadata: {
          username: newUsername,
          // You might want to add first_name, last_name here if your handle_new_user trigger uses them
        },
      });

      if (authError) {
        console.error('Error creating new user:', authError);
        // Check for duplicate email error specifically
        if (authError.message.includes('User already registered')) {
          return new Response(
            JSON.stringify({ error: `用户 ${identifier} 已注册，请直接为其开通会员。` }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`创建新用户失败: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('创建用户成功但未返回用户数据。');
      }
      userIdToActivate = authData.user.id;
      userEmail = authData.user.email;
      username = newUsername; // Use the generated username for consistency
      console.log(`Successfully created new user: ${username || userEmail} (ID: ${userIdToActivate})`);
    }

    // 3. 调用 activate_membership 函数开通会员
    console.log(`Activating membership for user ID: ${userIdToActivate} with plan ID: ${planId}`);
    const { error: activateError } = await supabaseAdmin.rpc('activate_membership', {
      p_user_id: userIdToActivate,
      p_plan_id: planId,
      p_order_id: null, // No order ID for manual activation
    });

    if (activateError) {
      console.error('Error activating membership:', activateError);
      throw new Error(`开通会员失败: ${activateError.message}`);
    }

    console.log(`Membership successfully activated for user ${username || userEmail}.`);
    return new Response(
      JSON.stringify({ success: true, message: `已为 ${username || userEmail} 开通会员。`, userId: userIdToActivate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin Activate Membership Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || '内部服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});