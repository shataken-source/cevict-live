/**
 * SMS Booking Reminders Edge Function
 * 
 * Sends SMS reminders for bookings 24 hours before departure
 * - Checks user SMS opt-in status
 * - Sends personalized reminder message
 * - Tracks delivery status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendReminderRequest {
  bookingId: string;
  userId: string;
  phoneNumber: string;
  customerName: string;
  charterName: string;
  bookingTime: string;
  batchId?: string;
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

    const { bookingId, userId, phoneNumber, customerName, charterName, bookingTime, batchId } = await req.json() as SendReminderRequest;

    // Verify user has SMS opt-in
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('sms_opt_in, phone_verified')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.sms_opt_in || !profile.phone_verified) {
      return new Response(
        JSON.stringify({ error: 'User has not opted in for SMS reminders' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format booking time
    const bookingDate = new Date(bookingTime);
    const timeString = bookingDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    // Create reminder message
    const message = `Hi ${customerName}! Reminder: Your ${charterName} booking is tomorrow at ${timeString}. See you soon! - Gulf Coast Charters`;

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

      const sinchData = await sinchResponse.json();
      const sentAt = new Date().toISOString();

      // Record reminder in database
      const { error: reminderError } = await supabaseClient
        .from('booking_reminders')
        .insert({
          booking_id: bookingId,
          user_id: userId,
          reminder_type: 'sms_24h',
          scheduled_for: bookingDate.toISOString(),
          sent_at: sentAt,
          status: sinchResponse.ok ? 'sent' : 'failed',
          message_text: message,
          delivery_status: sinchData.id || null,
          batch_id: batchId || sinchData.id || null,
          error_message: sinchResponse.ok ? null : JSON.stringify(sinchData),
        });

      if (reminderError) {
        console.error('Failed to record reminder:', reminderError);
      }

      if (!sinchResponse.ok) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send SMS reminder',
            details: sinchData 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SMS reminder sent successfully',
          batchId: sinchData.id || batchId 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (smsError) {
      console.error('SMS sending error:', smsError);
      
      // Record failed reminder
      await supabaseClient
        .from('booking_reminders')
        .insert({
          booking_id: bookingId,
          user_id: userId,
          reminder_type: 'sms_24h',
          scheduled_for: bookingDate.toISOString(),
          status: 'failed',
          message_text: message,
          error_message: smsError instanceof Error ? smsError.message : 'Unknown error',
        });

      return new Response(
        JSON.stringify({ error: 'Failed to send SMS reminder' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
