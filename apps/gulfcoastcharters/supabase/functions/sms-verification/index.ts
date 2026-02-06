/**
 * SMS Verification Edge Function
 * 
 * Handles phone number verification with 6-digit codes via Sinch SMS API
 * Actions:
 * - send_verification: Send 6-digit code to phone number
 * - verify_code: Verify the code entered by user
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendVerificationRequest {
  action: 'send_verification';
  userId: string;
  phoneNumber: string;
}

interface VerifyCodeRequest {
  action: 'verify_code';
  userId: string;
  phoneNumber: string;
  verificationCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, userId, phoneNumber, verificationCode } = await req.json();

    // Validate phone number format (E.164: +1XXXXXXXXXX)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Must be E.164 format (e.g., +15551234567)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_verification') {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiration

      // Store verification code in database
      const { error: dbError } = await supabaseClient
        .from('phone_verification_codes')
        .upsert({
          user_id: userId,
          phone_number: phoneNumber,
          verification_code: code,
          expires_at: expiresAt.toISOString(),
          verified: false,
        }, {
          onConflict: 'user_id,phone_number',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to store verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send SMS via Sinch
      const sinchApiToken = Deno.env.get('SINCH_API_TOKEN');
      const sinchServicePlanId = Deno.env.get('SINCH_SERVICE_PLAN_ID');
      const sinchPhoneNumber = Deno.env.get('SINCH_PHONE_NUMBER');

      if (!sinchApiToken || !sinchServicePlanId || !sinchPhoneNumber) {
        console.error('Sinch credentials not configured');
        return new Response(
          JSON.stringify({ error: 'SMS service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const message = `Your Gulf Coast Charters verification code is: ${code}. Valid for 10 minutes.`;

      try {
        const sinchResponse = await fetch(
          `https://us.sms.api.sinch.com/xms/v1/${sinchServicePlanId}/batches`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sinchApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: sinchPhoneNumber,
              to: [phoneNumber],
              body: message,
            }),
          }
        );

        if (!sinchResponse.ok) {
          const errorData = await sinchResponse.text();
          console.error('Sinch API error:', errorData);
          return new Response(
            JSON.stringify({ error: 'Failed to send SMS. Please check your phone number and try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Verification code sent' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (smsError) {
        console.error('SMS sending error:', smsError);
        return new Response(
          JSON.stringify({ error: 'Failed to send SMS. Please try again later.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'verify_code') {
      // Verify the code
      const { data: codeData, error: codeError } = await supabaseClient
        .from('phone_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .eq('verification_code', verificationCode)
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code is expired
      const expiresAt = new Date(codeData.expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already verified
      if (codeData.verified) {
        return new Response(
          JSON.stringify({ error: 'This code has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as verified
      const { error: updateError } = await supabaseClient
        .from('phone_verification_codes')
        .update({ verified: true })
        .eq('id', codeData.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user profile with verified phone
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          phone_number: phoneNumber,
          phone_verified: true,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't fail the verification if profile update fails
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
