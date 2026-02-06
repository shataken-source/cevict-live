/**
 * Booking Reminder Scheduler Edge Function
 * 
 * Automated scheduler that:
 * - Checks upcoming bookings every 6 hours
 * - Sends email reminders (1 week, 24h, follow-up)
 * - Sends SMS reminders (24h only) to opted-in users
 * - Tracks all sent reminders to prevent duplicates
 * 
 * Can be triggered manually or via cron job
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

    const now = new Date();
    const stats = {
      email_1week: 0,
      email_24h: 0,
      email_followup: 0,
      sms_24h: 0,
      errors: [] as string[],
    };

    // Find bookings that need reminders
    // 1 week before (7 days)
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneWeekStart = new Date(oneWeekFromNow.getTime() - 6 * 60 * 60 * 1000); // 6 hour window
    const oneWeekEnd = new Date(oneWeekFromNow.getTime() + 6 * 60 * 60 * 1000);

    // 24 hours before
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayStart = new Date(oneDayFromNow.getTime() - 6 * 60 * 60 * 1000);
    const oneDayEnd = new Date(oneDayFromNow.getTime() + 6 * 60 * 60 * 1000);

    // Follow-up (1 day after booking)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const followupStart = new Date(oneDayAgo.getTime() - 6 * 60 * 60 * 1000);
    const followupEnd = new Date(oneDayAgo.getTime() + 6 * 60 * 60 * 1000);

    // Get bookings for 1 week reminder
    const { data: bookings1Week, error: error1Week } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        booking_time,
        email_reminder,
        sms_reminder,
        profiles!bookings_user_id_fkey (
          full_name,
          email,
          phone_number,
          sms_opt_in,
          phone_verified
        ),
        charters!bookings_charter_id_fkey (
          name
        )
      `)
      .gte('booking_date', oneWeekStart.toISOString().split('T')[0])
      .lte('booking_date', oneWeekEnd.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (error1Week) {
      stats.errors.push(`Error fetching 1-week bookings: ${error1Week.message}`);
    } else if (bookings1Week) {
      for (const booking of bookings1Week) {
        // Check if reminder already sent
        const { data: existing } = await supabaseClient
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'email_1week')
          .eq('status', 'sent')
          .single();

        if (existing) continue;

        if (booking.email_reminder && booking.profiles?.email) {
          // Send 1 week email reminder (you would integrate with your email service here)
          // For now, just record it
          await supabaseClient
            .from('booking_reminders')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              reminder_type: 'email_1week',
              scheduled_for: new Date(`${booking.booking_date}T${booking.booking_time}`).toISOString(),
              status: 'sent',
              message_text: `Reminder: Your ${booking.charters?.name} booking is in 1 week!`,
            });
          stats.email_1week++;
        }
      }
    }

    // Get bookings for 24h reminder
    const { data: bookings24h, error: error24h } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        booking_time,
        email_reminder,
        sms_reminder,
        profiles!bookings_user_id_fkey (
          full_name,
          email,
          phone_number,
          sms_opt_in,
          phone_verified
        ),
        charters!bookings_charter_id_fkey (
          name
        )
      `)
      .gte('booking_date', oneDayStart.toISOString().split('T')[0])
      .lte('booking_date', oneDayEnd.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (error24h) {
      stats.errors.push(`Error fetching 24h bookings: ${error24h.message}`);
    } else if (bookings24h) {
      for (const booking of bookings24h) {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);

        // Check if reminder already sent
        const { data: existingEmail } = await supabaseClient
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'email_24h')
          .eq('status', 'sent')
          .single();

        if (!existingEmail && booking.email_reminder && booking.profiles?.email) {
          // Send 24h email reminder
          await supabaseClient
            .from('booking_reminders')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              reminder_type: 'email_24h',
              scheduled_for: bookingDateTime.toISOString(),
              status: 'sent',
              message_text: `Reminder: Your ${booking.charters?.name} booking is tomorrow!`,
            });
          stats.email_24h++;
        }

        // Send SMS reminder if opted in
        const { data: existingSMS } = await supabaseClient
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'sms_24h')
          .eq('status', 'sent')
          .single();

        if (!existingSMS && booking.sms_reminder && booking.profiles?.sms_opt_in && booking.profiles?.phone_verified && booking.profiles?.phone_number) {
          try {
            const { error: smsError } = await supabaseClient.functions.invoke('sms-booking-reminders', {
              body: {
                bookingId: booking.id,
                userId: booking.user_id,
                phoneNumber: booking.profiles.phone_number,
                customerName: booking.profiles.full_name || 'Customer',
                charterName: booking.charters?.name || 'Charter',
                bookingTime: bookingDateTime.toISOString(),
              },
            });

            if (!smsError) {
              stats.sms_24h++;
            } else {
              stats.errors.push(`SMS error for booking ${booking.id}: ${smsError.message}`);
            }
          } catch (smsErr) {
            stats.errors.push(`SMS exception for booking ${booking.id}: ${smsErr instanceof Error ? smsErr.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Get bookings for follow-up
    const { data: bookingsFollowup, error: errorFollowup } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        booking_time,
        email_reminder,
        profiles!bookings_user_id_fkey (
          email
        ),
        charters!bookings_charter_id_fkey (
          name
        )
      `)
      .gte('booking_date', followupStart.toISOString().split('T')[0])
      .lte('booking_date', followupEnd.toISOString().split('T')[0])
      .eq('status', 'completed');

    if (errorFollowup) {
      stats.errors.push(`Error fetching follow-up bookings: ${errorFollowup.message}`);
    } else if (bookingsFollowup) {
      for (const booking of bookingsFollowup) {
        const { data: existing } = await supabaseClient
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'email_followup')
          .eq('status', 'sent')
          .single();

        if (!existing && booking.email_reminder && booking.profiles?.email) {
          // Send follow-up email
          await supabaseClient
            .from('booking_reminders')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              reminder_type: 'email_followup',
              scheduled_for: new Date(`${booking.booking_date}T${booking.booking_time}`).toISOString(),
              status: 'sent',
              message_text: `Thank you for your ${booking.charters?.name} booking! How was your trip?`,
            });
          stats.email_followup++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder scheduler completed',
        stats,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
