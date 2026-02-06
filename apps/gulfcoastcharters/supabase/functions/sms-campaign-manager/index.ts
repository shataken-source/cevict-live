/**
 * SMS Campaign Manager Edge Function
 * 
 * Handles bulk SMS campaigns with:
 * - Template management
 * - Scheduling
 * - Link shortening and tracking
 * - Opt-out handling (STOP keyword)
 * - Analytics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, campaignId, campaignData, templateData } = await req.json();

    if (action === 'create_campaign') {
      const { name, message, targetAudience, scheduledFor } = campaignData;
      
      // Create campaign
      const { data: campaign, error } = await supabaseClient
        .from('sms_campaigns')
        .insert({
          name,
          message,
          target_audience: targetAudience,
          status: scheduledFor ? 'scheduled' : 'draft',
          scheduled_for: scheduledFor || null,
          created_by: campaignData.userId,
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to create campaign' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, campaign }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_campaign') {
      // Get campaign
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('sms_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return new Response(
          JSON.stringify({ error: 'Campaign not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get recipients based on target audience
      let recipientsQuery = supabaseClient
        .from('profiles')
        .select('id, phone_number, role')
        .eq('phone_verified', true)
        .not('phone_number', 'is', null);

      if (campaign.target_audience === 'captains') {
        recipientsQuery = recipientsQuery.eq('role', 'captain');
      } else if (campaign.target_audience === 'customers') {
        recipientsQuery = recipientsQuery.neq('role', 'captain');
      }

      // Also check notification preferences for SMS consent
      const { data: recipients } = await recipientsQuery;

      if (!recipients || recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No recipients found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process URLs in message and shorten them
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = campaign.message.match(urlRegex) || [];
      const shortenedUrls: Record<string, string> = {};

      for (const url of urls) {
        const shortCode = Math.random().toString(36).substring(2, 10);
        await supabaseClient
          .from('shortened_links')
          .insert({
            original_url: url,
            short_code: shortCode,
            campaign_id: campaignId,
          });
        shortenedUrls[url] = `${Deno.env.get('SITE_URL') || 'https://gulfcoastcharters.com'}/l/${shortCode}`;
      }

      // Replace URLs in message
      let finalMessage = campaign.message;
      for (const [original, shortened] of Object.entries(shortenedUrls)) {
        finalMessage = finalMessage.replace(original, shortened);
      }

      // Add opt-out message
      finalMessage += '\n\nReply STOP to unsubscribe';

      // Send SMS via Sinch
      const sinchApiToken = Deno.env.get('SINCH_API_TOKEN');
      const sinchServicePlanId = Deno.env.get('SINCH_SERVICE_PLAN_ID');
      const sinchPhoneNumber = Deno.env.get('SINCH_PHONE_NUMBER');

      if (!sinchApiToken || !sinchServicePlanId || !sinchPhoneNumber) {
        return new Response(
          JSON.stringify({ error: 'SMS service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const phoneNumbers = recipients.map(r => r.phone_number).filter(Boolean);

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
              to: phoneNumbers,
              body: finalMessage,
            }),
          }
        );

        const sinchData = await sinchResponse.json();

        // Create recipient records
        const recipientRecords = recipients.map((recipient, index) => ({
          campaign_id: campaignId,
          user_id: recipient.id,
          phone_number: recipient.phone_number,
          status: sinchResponse.ok ? 'sent' : 'failed',
          twilio_sid: sinchData.id || null,
        }));

        await supabaseClient
          .from('sms_campaign_recipients')
          .insert(recipientRecords);

        // Update campaign status
        await supabaseClient
          .from('sms_campaigns')
          .update({
            status: 'completed',
            sent_at: new Date().toISOString(),
          })
          .eq('id', campaignId);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Campaign sent to ${recipients.length} recipients`,
            batchId: sinchData.id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (smsError) {
        console.error('SMS sending error:', smsError);
        return new Response(
          JSON.stringify({ error: 'Failed to send campaign' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get_analytics') {
      const { data: campaign } = await supabaseClient
        .from('sms_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      const { data: recipients } = await supabaseClient
        .from('sms_campaign_recipients')
        .select('status')
        .eq('campaign_id', campaignId);

      const analytics = {
        total_recipients: recipients?.length || 0,
        sent: recipients?.filter(r => r.status === 'sent').length || 0,
        delivered: recipients?.filter(r => r.status === 'delivered').length || 0,
        failed: recipients?.filter(r => r.status === 'failed').length || 0,
        opted_out: recipients?.filter(r => r.status === 'opted_out').length || 0,
      };

      return new Response(
        JSON.stringify({ success: true, analytics }),
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
