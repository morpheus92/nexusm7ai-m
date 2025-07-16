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
    const { identifier, planId } = await req.json();

    if (!identifier || !planId) {
      return new Response(
        JSON.stringify({ error: '缺少必要的参数：用户标识和套餐ID。' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // DEBUG: 临时日志输出，用于验证 SUPABASE_SERVICE_ROLE_KEY
    console.log('Edge Function DEBUG: SUPABASE_SERVICE_ROLE_KEY (first 10 chars):', supabaseServiceRoleKey ? supabaseServiceRoleKey.substring(0, 10) + '...' : 'Not Set');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL 或 Service Role Key 未设置。');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey); // This is the admin client

    let userIdToActivate: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    // 1. 尝试通过邮箱、用户名或ID查找现有用户
    const { data: existingProfiles, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, email, username')
      .or(`email.eq.${identifier},username.eq.${identifier},id.eq.${identifier}`);

    if (profileFetchError) {
      console.error('Error fetching existing profile:', profileFetchError);
      throw new Error(`查询用户资料失败: ${profileFetchError.message}`);
    }

    if (existingProfiles && existingProfiles.length > 0) {
      // 用户已存在
      const existingUser = existingProfiles[0];
      userIdToActivate = existingUser.id;
      userEmail = existingUser.email;
      userName = existingUser.username;
      console.log(`Found existing user: ${userIdToActivate}`);
    } else {
      // 用户不存在，创建新用户
      console.log(`User ${identifier} not found, attempting to create new user.`);
      const isEmail = identifier.includes('@');
      const newEmail = isEmail ? identifier : `${identifier}@system.generated`; // Fallback email for non-email identifiers
      const newUsername = isEmail ? identifier.split('@')[0] : identifier;
      const tempPassword = Math.random().toString(36).slice(-10); // Generate a temporary password

      // Add logging before creating user
      console.log(`Attempting to create user with email: ${newEmail}, username: ${newUsername}`);
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm for admin-created users
        user_metadata: {
          username: newUsername,
          // You might want to add a flag here to indicate it's an admin-created user
        },
      });

      if (authError) {
        console.error('Error creating new auth user:', authError);
        // Check for duplicate email error specifically
        if (authError.message.includes('User already registered')) {
          return new Response(
            JSON.stringify({ error: `用户 ${identifier} 已注册，请直接为其开通会员。` }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`创建新用户失败: ${authError.message}`); // This is the error message the user is seeing
      }

      if (!authData.user) {
        throw new Error('创建用户成功但未返回用户数据。');
      }
      userIdToActivate = authData.user.id;
      userEmail = authData.user.email;
      userName = newUsername; // Use the generated username for consistency
      console.log(`Successfully created new user: ${userName || userEmail} (ID: ${userIdToActivate})`);
    }

    if (!userIdToActivate) {
      throw new Error('无法确定用户ID进行会员激活。');
    }

    // 2. 调用 activate_membership function
    console.log(`Activating membership for user ID: ${userIdToActivate} with plan ID: ${planId}`);
    const { error: activateError } = await supabase.rpc('activate_membership', {
      p_user_id: userIdToActivate,
      p_plan_id: planId,
      p_order_id: null, // No order ID for manual activation
    });

    if (activateError) {
      console.error('Error activating membership:', activateError);
      throw new Error(`开通会员失败: ${activateError.message}`);
    }

    console.log(`Membership successfully activated for user ${userName || userEmail}.`);
    return new Response(
      JSON.stringify({ success: true, message: `已成功为用户 ${userName || userEmail} 开通会员。`, userId: userIdToActivate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || '内部服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});