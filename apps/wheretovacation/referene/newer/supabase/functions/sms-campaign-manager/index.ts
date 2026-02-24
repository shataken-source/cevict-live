// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * SMS CAMPAIGN MANAGER EDGE FUNCTION
 * Manages SMS campaigns - create, list, and send campaigns to subscribers
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action, campaignData } = body;

    if (action === 'list') {
      // List all campaigns
      const { data: campaigns, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return new Response(
          JSON.stringify({ campaigns: [], error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ campaigns: campaigns || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      // Create new campaign
      if (!campaignData || !campaignData.name || !campaignData.message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campaign name and message required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: campaign, error } = await supabase
        .from('sms_campaigns')
        .insert({
          name: campaignData.name,
          message: campaignData.message,
          target_audience: campaignData.targetAudience || 'all',
          scheduled_for: campaignData.scheduledFor || null,
          status: campaignData.scheduledFor ? 'scheduled' : 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, campaign }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      // Send campaign
      if (!campaignData || !campaignData.id || !campaignData.message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campaign ID and message required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get target audience
      const targetAudience = campaignData.targetAudience || 'all';
      
      // First get all subscribers with verified phones and SMS enabled
      let query = supabase
        .from('notification_preferences')
        .select('user_id, phone_number')
        .eq('phone_verified', true)
        .eq('sms_notifications', true)
        .not('phone_number', 'is', null);

      const { data: allSubscribers, error: subscribersError } = await query;

      if (subscribersError) {
        console.error('Error fetching subscribers:', subscribersError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch subscribers' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!allSubscribers || allSubscribers.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No subscribers found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter by role if needed
      let subscribers = allSubscribers;
      if (targetAudience !== 'all') {
        // Get user IDs and check their roles
        const userIds = allSubscribers.map(s => s.user_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, is_captain')
          .in('id', userIds);

        if (users) {
          if (targetAudience === 'captains') {
            const captainIds = users.filter(u => u.is_captain).map(u => u.id);
            subscribers = allSubscribers.filter(s => captainIds.includes(s.user_id));
          } else if (targetAudience === 'customers') {
            const customerIds = users.filter(u => !u.is_captain).map(u => u.id);
            subscribers = allSubscribers.filter(s => customerIds.includes(s.user_id));
          }
        }
      }

      if (!subscribers || subscribers.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No subscribers found for target audience' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add opt-out message
      const messageWithOptOut = `${campaignData.message}\n\nReply STOP to unsubscribe`;

      // Send SMS to all subscribers
      let delivered = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const subscriber of subscribers) {
        if (!subscriber.phone_number) continue;

        const smsResult = await sendSMS(subscriber.phone_number, messageWithOptOut);

        if (smsResult.success) {
          delivered++;
          // Log successful send
          await supabase
            .from('sms_notifications')
            .insert({
              user_id: subscriber.user_id,
              phone_number: subscriber.phone_number.replace(/\D/g, ''),
              message: messageWithOptOut,
              status: 'sent',
              twilio_sid: smsResult.twilioSid,
              notification_type: 'campaign',
              campaign_id: campaignData.id
            });
        } else {
          failed++;
          errors.push(`${subscriber.phone_number}: ${smsResult.error}`);
          // Log failed send
          await supabase
            .from('sms_notifications')
            .insert({
              user_id: subscriber.user_id,
              phone_number: subscriber.phone_number.replace(/\D/g, ''),
              message: messageWithOptOut,
              status: 'failed',
              error_message: smsResult.error,
              notification_type: 'campaign',
              campaign_id: campaignData.id
            });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update campaign status
      await supabase
        .from('sms_campaigns')
        .update({
          status: 'sent',
          sent_count: delivered + failed,
          delivered_count: delivered,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignData.id);

      return new Response(
        JSON.stringify({
          success: true,
          results: {
            delivered,
            failed,
            total: delivered + failed,
            errors: errors.slice(0, 10) // Limit error details
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "list", "create", or "send"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('SMS campaign manager error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

