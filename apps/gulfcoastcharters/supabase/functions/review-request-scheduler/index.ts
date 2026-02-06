/**
 * Review Request Scheduler
 * 
 * Runs on a cron schedule to automatically send review requests
 * at 4h, 24h, 3d, and 7d after trip completion.
 * 
 * Schedule: Run every hour (can be configured in Supabase Dashboard)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    console.error('=== REVIEW REQUEST SCHEDULER STARTED ===');
    console.error('Current time:', now.toISOString());

    // Find completed bookings that need review requests
    // A booking is "completed" if:
    // 1. Status is 'completed' OR
    // 2. trip_date + duration has passed (for confirmed bookings)
    const { data: completedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        captain_id,
        trip_date,
        end_time,
        duration,
        status
      `)
      .in('status', ['completed', 'confirmed'])
      .or('end_time.not.is.null,trip_date.not.is.null');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    console.error(`Found ${completedBookings?.length || 0} potential bookings to check`);

    let processedCount = 0;
    let sentCount = 0;

    // Process each booking
    for (const booking of completedBookings || []) {
      try {
        // Calculate trip end time
        let tripEndTime: Date | null = null;
        
        if (booking.end_time) {
          tripEndTime = new Date(booking.end_time);
        } else if (booking.trip_date) {
          // If no end_time, calculate from trip_date + duration
          const tripStart = new Date(booking.trip_date);
          const durationHours = booking.duration || 4; // Default 4 hours
          tripEndTime = new Date(tripStart.getTime() + durationHours * 60 * 60 * 1000);
        }

        if (!tripEndTime || tripEndTime > now) {
          // Trip hasn't ended yet, skip
          continue;
        }

        // Check if review request already exists
        // Note: review_requests.booking_id references bookings.id (the PK)
        const { data: existingRequest } = await supabase
          .from('review_requests')
          .select('request_id, status, first_request_sent_at, first_reminder_sent_at, second_reminder_sent_at, final_reminder_sent_at')
          .eq('booking_id', booking.id)
          .maybeSingle();

        // Calculate time since trip ended
        const timeSinceTripEnd = now.getTime() - tripEndTime.getTime();
        const hoursSinceTripEnd = timeSinceTripEnd / (1000 * 60 * 60);
        const daysSinceTripEnd = hoursSinceTripEnd / 24;

        // Create review request record if it doesn't exist
        let reviewRequestId: string;
        let reviewRequest: any;

        if (!existingRequest) {
          // Create new review request
          const expiresAt = new Date(tripEndTime);
          expiresAt.setDate(expiresAt.getDate() + 30); // Expires 30 days after trip

          const { data: newRequest, error: createError } = await supabase
            .from('review_requests')
            .insert({
              booking_id: booking.id,
              customer_id: booking.user_id,
              captain_id: booking.captain_id,
              trip_end_time: tripEndTime.toISOString(),
              status: 'pending',
              expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating review request for booking ${booking.id}:`, createError);
            continue;
          }

          reviewRequestId = newRequest.request_id;
          reviewRequest = newRequest;
          console.error(`Created review request for booking ${booking.id}`);
        } else {
          reviewRequestId = existingRequest.request_id;
          reviewRequest = existingRequest;

          // Skip if already completed or declined
          if (existingRequest.status === 'completed' || existingRequest.status === 'declined') {
            continue;
          }
        }

        processedCount++;

        // Determine which email to send based on timing
        let shouldSend = false;
        let emailType: 'first' | 'first_reminder' | 'second_reminder' | 'final_reminder' | null = null;
        let updateField: string | null = null;

        if (hoursSinceTripEnd >= 4 && hoursSinceTripEnd < 24 && !reviewRequest.first_request_sent_at) {
          // Send first request (4 hours after trip)
          shouldSend = true;
          emailType = 'first';
          updateField = 'first_request_sent_at';
        } else if (hoursSinceTripEnd >= 24 && hoursSinceTripEnd < 72 && !reviewRequest.first_reminder_sent_at) {
          // Send first reminder (24 hours / 1 day after trip)
          shouldSend = true;
          emailType = 'first_reminder';
          updateField = 'first_reminder_sent_at';
        } else if (daysSinceTripEnd >= 3 && daysSinceTripEnd < 7 && !reviewRequest.second_reminder_sent_at) {
          // Send second reminder (3 days after trip)
          shouldSend = true;
          emailType = 'second_reminder';
          updateField = 'second_reminder_sent_at';
        } else if (daysSinceTripEnd >= 7 && daysSinceTripEnd < 30 && !reviewRequest.final_reminder_sent_at) {
          // Send final reminder (7 days after trip)
          shouldSend = true;
          emailType = 'final_reminder';
          updateField = 'final_reminder_sent_at';
        }

        if (shouldSend && emailType && updateField) {
          // Get customer email
          const { data: customer } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', booking.user_id)
            .single();

          // Get captain info
          const { data: captain } = await supabase
            .from('captains')
            .select('full_name, business_name')
            .eq('id', booking.captain_id)
            .single();

          if (customer?.email) {
            // TODO: Send email notification
            // For now, just log and update the database
            console.error(`📧 Would send ${emailType} email to ${customer.email} for booking ${booking.id}`);
            console.error(`   Captain: ${captain?.full_name || captain?.business_name || 'Unknown'}`);
            console.error(`   Hours since trip end: ${hoursSinceTripEnd.toFixed(2)}`);

            // Update review request with sent timestamp
            const updateData: any = {
              [updateField]: now.toISOString(),
              status: emailType === 'first' ? 'sent' : 'reminded',
              updated_at: now.toISOString(),
            };

            const { error: updateError } = await supabase
              .from('review_requests')
              .update(updateData)
              .eq('request_id', reviewRequestId);

            if (updateError) {
              console.error(`Error updating review request ${reviewRequestId}:`, updateError);
            } else {
              sentCount++;
              console.error(`✅ Updated review request ${reviewRequestId} - ${emailType} sent`);
            }
          } else {
            console.error(`⚠️ No email found for customer ${booking.user_id}`);
          }
        }
      } catch (bookingError: any) {
        console.error(`Error processing booking ${booking.id}:`, bookingError);
        // Continue with next booking
      }
    }

    console.error(`=== SCHEDULER COMPLETE ===`);
    console.error(`Processed: ${processedCount} bookings`);
    console.error(`Sent: ${sentCount} review requests`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        sent: sentCount,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Scheduler error:', error);
    console.error('Error stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || 'Scheduler processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
