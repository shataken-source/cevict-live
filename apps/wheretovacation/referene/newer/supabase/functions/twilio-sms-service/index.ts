// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * TWILIO SMS SERVICE EDGE FUNCTION
 * General SMS service for sending notifications and verification codes
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send SMS via Twilio
async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; twilioSid?: string; error?: string }> {
  const sinchServicePlanId = Deno.env.get('SINCH_SERVICE_PLAN_ID') || Deno.env.get('SINCH_SERVICE_PLAN');
  const sinchApiToken = Deno.env.get('SINCH_API_TOKEN') || Deno.env.get('SINCH_TOKEN');
  const sinchFrom = Deno.env.get('SINCH_FROM') || Deno.env.get('SINCH_SENDER') || Deno.env.get('SINCH_PHONE_NUMBER');
  const sinchBaseUrl = (Deno.env.get('SINCH_API_BASE_URL') || 'https://us.sms.api.sinch.com').replace(/\/$/, '');

  if (!sinchServicePlanId || !sinchApiToken || !sinchFrom) {
    return {
      success: false,
      error: 'Sinch credentials not configured. Set SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, and SINCH_FROM',
    };
  }

  // Ensure phone number is E.164 (default to +1 for US numbers)
  let formattedPhone = phoneNumber.trim();
  if (!formattedPhone.startsWith('+')) {
    const digits = formattedPhone.replace(/\D/g, '').replace(/^1/, '');
    formattedPhone = `+1${digits}`;
  }

  try {
    const response = await fetch(`${sinchBaseUrl}/xms/v1/${sinchServicePlanId}/batches`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${sinchServicePlanId}:${sinchApiToken}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sinchFrom,
        to: [formattedPhone],
        body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Sinch error:', error);
      return { success: false, error };
    }

    const result = await response.json().catch(() => ({}));
    // Sinch returns a batch id in `id`
    return { success: true, twilioSid: result?.id };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check rate limit
async function checkRateLimit(supabase: any, userId: string, phoneNumber: string): Promise<{ allowed: boolean; error?: string }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get or create rate limit record
  const { data: rateLimit, error: fetchError } = await supabase
    .from('sms_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber.replace(/\D/g, ''))
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Rate limit check error:', fetchError);
    return { allowed: true }; // Allow on error to not block legitimate messages
  }

  if (!rateLimit) {
    // Create new rate limit record
    await supabase
      .from('sms_rate_limits')
      .insert({
        user_id: userId,
        phone_number: phoneNumber.replace(/\D/g, ''),
        messages_sent: 1,
        window_start: now.toISOString()
      });
    return { allowed: true };
  }

  // Check if window has expired
  const windowStart = new Date(rateLimit.window_start);
  if (windowStart < oneHourAgo) {
    // Reset window
    await supabase
      .from('sms_rate_limits')
      .update({
        messages_sent: 1,
        window_start: now.toISOString()
      })
      .eq('id', rateLimit.id);
    return { allowed: true };
  }

  // Check if limit exceeded
  if (rateLimit.messages_sent >= 10) {
    return { allowed: false, error: 'Rate limit exceeded. Maximum 10 messages per hour.' };
  }

  // Increment counter
  await supabase
    .from('sms_rate_limits')
    .update({
      messages_sent: rateLimit.messages_sent + 1
    })
    .eq('id', rateLimit.id);

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action, phoneNumber, userId, verificationCode } = body;

    if (action === 'get_stats') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: rows, error } = await supabase
        .from('sms_notifications')
        .select('status,cost,created_at')
        .eq('user_id', userId)
        .gte('created_at', since);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to load SMS stats', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stats = (rows || []).reduce(
        (acc: { totalSent: number; totalFailed: number; totalCost: number }, row: any) => {
          if (row?.status === 'sent' || row?.status === 'delivered') acc.totalSent += 1;
          if (row?.status === 'failed') acc.totalFailed += 1;
          if (typeof row?.cost === 'number') acc.totalCost += row.cost;
          return acc;
        },
        { totalSent: 0, totalFailed: 0, totalCost: 0 }
      );

      return new Response(
        JSON.stringify({ success: true, ...stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_verification') {
      // Send verification code
      if (!phoneNumber || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'phoneNumber and userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(supabase, userId, phoneNumber);
      if (!rateLimitCheck.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: rateLimitCheck.error }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code
      const { error: dbError } = await supabase
        .from('phone_verification_codes')
        .insert({
          user_id: userId,
          phone_number: phoneNumber.replace(/\D/g, ''),
          code: code,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (dbError) {
        // Try update if exists
        await supabase
          .from('phone_verification_codes')
          .update({
            code: code,
            expires_at: expiresAt.toISOString(),
            used: false
          })
          .eq('user_id', userId)
          .eq('phone_number', phoneNumber.replace(/\D/g, ''));
      }

      // Send SMS
      const message = `Your verification code is: ${code}. It expires in 10 minutes.`;
      const smsResult = await sendSMS(phoneNumber, message);

      if (!smsResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: smsResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log SMS notification
      await supabase
        .from('sms_notifications')
        .insert({
          user_id: userId,
          phone_number: phoneNumber.replace(/\D/g, ''),
          message: message,
          status: 'sent',
          twilio_sid: smsResult.twilioSid,
          notification_type: 'verification'
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_code') {
      // Verify code
      if (!verificationCode || !userId || !phoneNumber) {
        return new Response(
          JSON.stringify({ success: false, error: 'verificationCode, userId, and phoneNumber required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: verification, error: verifyError } = await supabase
        .from('phone_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber.replace(/\D/g, ''))
        .eq('code', verificationCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !verification) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired verification code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as used
      await supabase
        .from('phone_verification_codes')
        .update({ used: true })
        .eq('id', verification.id);

      // Update user preferences
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          phone_number: verification.phone_number,
          phone_verified: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Phone verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_notification') {
      // Send general notification
      if (!phoneNumber || !body.message || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'phoneNumber, message, and userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(supabase, userId, phoneNumber);
      if (!rateLimitCheck.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: rateLimitCheck.error }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const smsResult = await sendSMS(phoneNumber, body.message);

      if (!smsResult.success) {
        // Log failed notification
        await supabase
          .from('sms_notifications')
          .insert({
            user_id: userId,
            phone_number: phoneNumber.replace(/\D/g, ''),
            message: body.message,
            status: 'failed',
            error_message: smsResult.error,
            notification_type: body.notificationType || 'general'
          });

        return new Response(
          JSON.stringify({ success: false, error: smsResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log successful notification
      await supabase
        .from('sms_notifications')
        .insert({
          user_id: userId,
          phone_number: phoneNumber.replace(/\D/g, ''),
          message: body.message,
          status: 'sent',
          twilio_sid: smsResult.twilioSid,
          notification_type: body.notificationType || 'general'
        });

      return new Response(
        JSON.stringify({ success: true, twilioSid: smsResult.twilioSid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "send_verification", "verify_code", or "send_notification"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Twilio SMS service error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

