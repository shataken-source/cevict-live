// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * SMS VERIFICATION EDGE FUNCTION
 * Handles phone number verification via SMS using Twilio
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send SMS via Twilio
async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; twilioSid?: string; error?: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  // Ensure phone number has +1 prefix
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+1' + formattedPhone.replace(/^1/, '');
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: formattedPhone,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio error:', error);
      return { success: false, error: error };
    }

    const result = await response.json();
    if (result.status === 'queued' || result.status === 'sent' || result.status === 'delivered') {
      return { success: true, twilioSid: result.sid };
    } else {
      return { success: false, error: result.error_message || 'Unknown Twilio error' };
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const { action, phoneNumber, userId, code } = body;

    if (action === 'send') {
      // Send verification code
      if (!phoneNumber || !userId) {
        return new Response(
          JSON.stringify({ error: 'phoneNumber and userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code in database
      const { error: dbError } = await supabase
        .from('phone_verification_codes')
        .insert({
          user_id: userId,
          phone_number: phoneNumber.replace(/\D/g, ''),
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to update if code already exists
        const { error: updateError } = await supabase
          .from('phone_verification_codes')
          .update({
            code: verificationCode,
            expires_at: expiresAt.toISOString(),
            used: false
          })
          .eq('user_id', userId)
          .eq('phone_number', phoneNumber.replace(/\D/g, ''));

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to store verification code', details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Send SMS
      const message = `Your verification code is: ${verificationCode}. It expires in 10 minutes.`;
      const smsResult = await sendSMS(phoneNumber, message);

      if (!smsResult.success) {
        return new Response(
          JSON.stringify({ error: 'Failed to send SMS', details: smsResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Verify code
      if (!code || !userId) {
        return new Response(
          JSON.stringify({ error: 'code and userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check verification code
      const { data: verification, error: verifyError } = await supabase
        .from('phone_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !verification) {
        return new Response(
          JSON.stringify({ verified: false, message: 'Invalid or expired verification code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as used
      await supabase
        .from('phone_verification_codes')
        .update({ used: true })
        .eq('id', verification.id);

      // Update user's phone number and verification status
      const { error: updateError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          phone_number: verification.phone_number,
          phone_verified: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('Update error:', updateError);
        // Try creating the record if it doesn't exist
        await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            phone_number: verification.phone_number,
            phone_verified: true
          });
      }

      return new Response(
        JSON.stringify({ verified: true, message: 'Phone verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "send" or "verify"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('SMS verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

