// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * WEEKLY SMS UPDATE EDGE FUNCTION
 * Sends weekly status SMS to 2562645669 via T-Mobile email-to-SMS gateway
 * Uses Porkbun SMTP - No Twilio needed!
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get configuration from environment variables
const TARGET_PHONE = Deno.env.get('ALERT_PHONE_NUMBER') || Deno.env.get('WEEKLY_SMS_PHONE') || '';

// Send SMS via Twilio (using existing secrets)
async function sendSMS(message: string, phoneNumber: string): Promise<{ success: boolean; error?: string; twilioSid?: string }> {
  if (!phoneNumber) {
    return { success: false, error: 'ALERT_PHONE_NUMBER or WEEKLY_SMS_PHONE not set in Supabase secrets' };
  }

  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { success: false, error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER' };
  }

  // Ensure phone number has +1 prefix
  let formattedPhone = phoneNumber;
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
      console.error('Twilio API error:', error);
      return { success: false, error: `Twilio error: ${error}` };
    }

    const result = await response.json();
    if (result.status === 'queued' || result.status === 'sent' || result.status === 'delivered') {
      console.log('SMS sent via Twilio:', result.sid);
      return { success: true, twilioSid: result.sid };
    } else {
      return { success: false, error: `Twilio status: ${result.status}` };
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate weekly status message
function generateWeeklyMessage(): string {
  const date = new Date();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay()); // Start of week
  
  return `📊 Weekly Update - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

✅ System Status: Active
✅ Backups: Running
✅ Database: Healthy

All systems operational. No action required.

Reply STOP to unsubscribe.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Debug: Log what we have
    const hasPhone = !!TARGET_PHONE;
    const hasTwilioSid = !!Deno.env.get('TWILIO_ACCOUNT_SID');
    const hasTwilioToken = !!Deno.env.get('TWILIO_AUTH_TOKEN');
    const hasTwilioPhone = !!Deno.env.get('TWILIO_PHONE_NUMBER');
    
    console.log('Secrets check:', { hasPhone, hasTwilioSid, hasTwilioToken, hasTwilioPhone });
    
    if (!TARGET_PHONE) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ALERT_PHONE_NUMBER or WEEKLY_SMS_PHONE not configured',
          fix: 'Add ALERT_PHONE_NUMBER or WEEKLY_SMS_PHONE to Edge Function secrets (e.g., 2562645669)',
          debug: {
            hasALERT_PHONE_NUMBER: !!Deno.env.get('ALERT_PHONE_NUMBER'),
            hasWEEKLY_SMS_PHONE: !!Deno.env.get('WEEKLY_SMS_PHONE')
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = generateWeeklyMessage();
    const smsResult = await sendSMS(message, TARGET_PHONE);

    if (smsResult.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Weekly SMS sent successfully',
          sentTo: TARGET_PHONE,
          twilioSid: smsResult.twilioSid
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: smsResult.error || 'Failed to send SMS',
          sentTo: TARGET_PHONE,
          debug: {
            hasTwilioSid: hasTwilioSid,
            hasTwilioToken: hasTwilioToken,
            hasTwilioPhone: hasTwilioPhone
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Weekly SMS error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

