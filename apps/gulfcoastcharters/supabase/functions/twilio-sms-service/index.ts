/**
 * Twilio SMS Service Edge Function
 * 
 * Handles SMS notifications via Twilio with:
 * - Rate limiting (10 messages per hour per user)
 * - Cost tracking
 * - Delivery status tracking
 * - Multiple notification types
 * 
 * Actions:
 * - send_verification: Send 6-digit verification code
 * - verify_code: Verify the code
 * - send_sms: Send SMS notification
 * - get_stats: Get SMS usage statistics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MESSAGES = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

interface SendSMSRequest {
  action: 'send_sms';
  userId: string;
  phoneNumber: string;
  message: string;
  notificationType: 'booking_confirmed' | 'booking_reminder' | 'booking_cancelled' | 'urgent_message';
}

interface GetStatsRequest {
  action: 'get_stats';
  userId: string;
}

async function checkRateLimit(
  supabaseClient: any,
  userId: string,
  phoneNumber: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Get or create rate limit record
  const { data: rateLimit, error } = await supabaseClient
    .from('sms_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Error other than "not found"
    console.error('Rate limit check error:', error);
    return { allowed: false };
  }

  if (!rateLimit) {
    // First message - create rate limit entry
    await supabaseClient
      .from('sms_rate_limits')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        messages_sent: 0,
        window_start: now.toISOString(),
      });
    return { allowed: true };
  }

  // Check if window has expired
  const windowStartTime = new Date(rateLimit.window_start);
  if (windowStartTime < windowStart) {
    // Window expired - reset
    await supabaseClient
      .from('sms_rate_limits')
      .update({
        messages_sent: 0,
        window_start: now.toISOString(),
      })
      .eq('id', rateLimit.id);
    return { allowed: true };
  }

  // Check if limit exceeded
  if (rateLimit.messages_sent >= RATE_LIMIT_MESSAGES) {
    const resetAt = new Date(windowStartTime.getTime() + RATE_LIMIT_WINDOW_MS);
    return { allowed: false, resetAt };
  }

  return { allowed: true };
}

async function incrementRateLimit(
  supabaseClient: any,
  userId: string,
  phoneNumber: string
) {
  await supabaseClient.rpc('increment_sms_rate_limit', {
    p_user_id: userId,
    p_phone_number: phoneNumber,
  }).catch(async () => {
    // If RPC doesn't exist, use update
    const { data } = await supabaseClient
      .from('sms_rate_limits')
      .select('messages_sent')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .single();
    
    if (data) {
      await supabaseClient
        .from('sms_rate_limits')
        .update({ messages_sent: data.messages_sent + 1 })
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber);
    }
  });
}

serve(async (req) => {
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

    const { action, userId, phoneNumber, verificationCode, message, notificationType } = await req.json();

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Must be E.164 format (e.g., +15551234567)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_verification') {
      // Check rate limit
      const rateLimitCheck = await checkRateLimit(supabaseClient, userId, phoneNumber);
      if (!rateLimitCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            resetAt: rateLimitCheck.resetAt?.toISOString()
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Store verification code
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
        return new Response(
          JSON.stringify({ error: 'Failed to store verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send SMS via Twilio
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return new Response(
          JSON.stringify({ error: 'SMS service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const smsMessage = `Your Gulf Coast Charters verification code is: ${code}. Valid for 10 minutes.`;

      try {
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioPhoneNumber,
              To: phoneNumber,
              Body: smsMessage,
            }),
          }
        );

        const twilioData = await twilioResponse.json();

        // Record notification
        await supabaseClient
          .from('sms_notifications')
          .insert({
            user_id: userId,
            phone_number: phoneNumber,
            message: smsMessage,
            notification_type: 'verification_code',
            status: twilioResponse.ok ? 'sent' : 'failed',
            twilio_sid: twilioData.sid,
            cost: twilioData.price ? parseFloat(twilioData.price) : null,
            error_message: twilioResponse.ok ? null : JSON.stringify(twilioData),
            sent_at: twilioResponse.ok ? new Date().toISOString() : null,
          });

        // Increment rate limit
        if (twilioResponse.ok) {
          await incrementRateLimit(supabaseClient, userId, phoneNumber);
        }

        if (!twilioResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to send SMS', details: twilioData }),
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
          JSON.stringify({ error: 'Failed to send SMS' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'verify_code') {
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

      const expiresAt = new Date(codeData.expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (codeData.verified) {
        return new Response(
          JSON.stringify({ error: 'This code has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as verified
      await supabaseClient
        .from('phone_verification_codes')
        .update({ verified: true })
        .eq('id', codeData.id);

      // Update profile
      await supabaseClient
        .from('profiles')
        .update({
          phone_number: phoneNumber,
          phone_verified: true,
        })
        .eq('id', userId);

      // Update notification preferences
      await supabaseClient
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          phone_number: phoneNumber,
          phone_verified: true,
        }, {
          onConflict: 'user_id',
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Phone number verified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_sms') {
      // Check user preferences
      const { data: preferences } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!preferences?.sms_notifications || !preferences?.phone_verified) {
        return new Response(
          JSON.stringify({ error: 'SMS notifications not enabled or phone not verified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check specific notification type preference
      const prefKey = `sms_${notificationType}` as keyof typeof preferences;
      if (prefKey && !preferences[prefKey]) {
        return new Response(
          JSON.stringify({ error: `SMS notifications for ${notificationType} are disabled` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(supabaseClient, userId, phoneNumber);
      if (!rateLimitCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Maximum 10 messages per hour.',
            resetAt: rateLimitCheck.resetAt?.toISOString()
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send SMS via Twilio
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return new Response(
          JSON.stringify({ error: 'SMS service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioPhoneNumber,
              To: phoneNumber,
              Body: message,
            }),
          }
        );

        const twilioData = await twilioResponse.json();

        // Record notification
        await supabaseClient
          .from('sms_notifications')
          .insert({
            user_id: userId,
            phone_number: phoneNumber,
            message: message,
            notification_type: notificationType,
            status: twilioResponse.ok ? 'sent' : 'failed',
            twilio_sid: twilioData.sid,
            cost: twilioData.price ? parseFloat(twilioData.price) : null,
            error_message: twilioResponse.ok ? null : JSON.stringify(twilioData),
            sent_at: twilioResponse.ok ? new Date().toISOString() : null,
          });

        // Increment rate limit
        if (twilioResponse.ok) {
          await incrementRateLimit(supabaseClient, userId, phoneNumber);
        }

        if (!twilioResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to send SMS', details: twilioData }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'SMS sent successfully', sid: twilioData.sid }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (smsError) {
        console.error('SMS sending error:', smsError);
        return new Response(
          JSON.stringify({ error: 'Failed to send SMS' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get_stats') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: notifications, error } = await supabaseClient
        .from('sms_notifications')
        .select('status, cost')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch statistics' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stats = {
        total_sent: notifications?.filter(n => n.status === 'sent' || n.status === 'delivered').length || 0,
        total_failed: notifications?.filter(n => n.status === 'failed').length || 0,
        total_cost: notifications?.reduce((sum, n) => sum + (parseFloat(n.cost) || 0), 0) || 0,
        period: '30_days',
      };

      return new Response(
        JSON.stringify({ success: true, stats }),
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
