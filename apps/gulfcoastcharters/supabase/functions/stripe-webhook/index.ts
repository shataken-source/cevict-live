/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events (payment success, failure, refunds, etc.)
 * Updates bookings and payments tables accordingly.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CRITICAL: Log to database FIRST to verify function execution
  // This works even if console.log is buffered/filtered
  // Wrap in try-catch so database errors don't break the webhook
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Log webhook hit to database immediately (non-blocking)
      supabase.from('debug_logs').insert({
        event_type: 'webhook_request_received',
        payload: {
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString(),
          has_signature: !!req.headers.get('stripe-signature'),
        },
      }).then(() => {
        console.error('✅ Logged to debug_logs');
      }).catch((err) => {
        // Silently fail - table might not exist, but webhook should still work
        console.error('⚠️ Failed to log to debug_logs (non-critical):', err.message);
      });
    }
  } catch (dbLogError) {
    // If debug_logs table doesn't exist, continue anyway
    console.error('⚠️ Failed to initialize debug logging (non-critical):', dbLogError);
  }

  // Use console.error for visibility (console.log may be filtered)
  console.error('=== WEBHOOK REQUEST RECEIVED ===');
  console.error('Method:', req.method);
  console.error('URL:', req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.error('OPTIONS request - returning CORS');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe webhook secret
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeWebhookSecret) {
      console.error('ERROR: STRIPE_WEBHOOK_SECRET not configured');
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('ERROR: STRIPE_SECRET_KEY not configured');
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Initialize Stripe
    const stripe = await import('https://esm.sh/stripe@14.21.0');
    const stripeClient = stripe.default(stripeSecretKey);

    // Get Supabase client (already initialized above, but re-initialize for clarity)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('ERROR: Missing stripe-signature header');
      throw new Error('Missing stripe-signature header');
    }

    // Get raw body
    const body = await req.text();
    console.error('Body length:', body.length);

    // Log to database before signature verification
    await supabase.from('debug_logs').insert({
      event_type: 'webhook_body_received',
      payload: {
        body_length: body.length,
        has_signature: !!signature,
        timestamp: new Date().toISOString(),
      },
    });

    // Verify webhook signature
    let event: any;
    try {
      event = await stripeClient.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.error('✅ Webhook signature verified');
      console.error('Event type:', event.type);
      console.error('Event ID:', event.id);

      // Log successful verification to database
      await supabase.from('debug_logs').insert({
        event_type: 'webhook_signature_verified',
        payload: {
          event_type: event.type,
          event_id: event.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      // Log signature failure to database
      await supabase.from('debug_logs').insert({
        event_type: 'webhook_signature_failed',
        payload: {
          error: err.message,
          timestamp: new Date().toISOString(),
        },
      });
      // Return 400 to Stripe so it shows as failed
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Handle different event types
    console.error('Processing event type:', event.type);
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};

        // Create payment record
        const paymentData: any = {
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || 'usd',
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_charge_id: session.payment_intent as string,
          metadata: metadata,
        };

        // Link to booking if exists
        if (metadata.bookingId) {
          paymentData.booking_id = metadata.bookingId;

          // Update booking status
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              stripe_checkout_session_id: session.id,
            })
            .eq('id', metadata.bookingId);

          // Get booking details for confirmation email
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              id,
              user_id,
              captain_id,
              trip_date,
              duration,
              guests,
              total_price,
              captains!inner(full_name, business_name, email, phone)
            `)
            .eq('id', metadata.bookingId)
            .single();

          if (booking?.user_id) {
            paymentData.user_id = booking.user_id;
          }

          // Send booking confirmation email
          if (booking && (session.customer_email || metadata.customerEmail)) {
            try {
              const customerEmail = session.customer_email || metadata.customerEmail;
              const customerName = metadata.customerName || 'Valued Customer';
              const captainName = booking.captains?.full_name || booking.captains?.business_name || 'Your Captain';
              const charterName = booking.captains?.business_name || captainName;
              const tripDate = booking.trip_date ? new Date(booking.trip_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'TBD';
              const tripTime = booking.trip_date ? new Date(booking.trip_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'TBD';
              const duration = booking.duration || 4;
              const guests = booking.guests || 1;
              const totalPrice = booking.total_price || (session.amount_total ? session.amount_total / 100 : 0);

              // Get Resend API key from environment
              const resendApiKey = Deno.env.get('RESEND_API_KEY');
              const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Gulf Coast Charters <onboarding@resend.dev>';

              if (resendApiKey) {
                // Import Resend dynamically
                const { Resend } = await import('https://esm.sh/resend@2.0.0');
                const resend = new Resend(resendApiKey);

                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                      .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1e40af; }
                      .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                      .detail-row:last-child { border-bottom: none; }
                      .detail-label { font-weight: bold; color: #6b7280; }
                      .detail-value { color: #111827; }
                      .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                      .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>🎣 Booking Confirmed!</h1>
                      </div>
                      <div class="content">
                        <p>Hi ${customerName},</p>
                        <p>Your charter fishing booking has been confirmed! We're excited to have you join us on the water.</p>

                        <div class="booking-details">
                          <h2 style="margin-top: 0; color: #1e40af;">Booking Details</h2>
                          <div class="detail-row">
                            <span class="detail-label">Charter:</span>
                            <span class="detail-value">${charterName}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Captain:</span>
                            <span class="detail-value">${captainName}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">${tripDate}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Time:</span>
                            <span class="detail-value">${tripTime}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value">${duration} hours</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Guests:</span>
                            <span class="detail-value">${guests}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Total Paid:</span>
                            <span class="detail-value">$${totalPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        <p>Your captain will contact you before your trip with meeting location and any additional details.</p>

                        <p>If you have any questions, please don't hesitate to reach out.</p>

                        <p>We look forward to seeing you on the water!</p>
                        <p><strong>The Gulf Coast Charters Team</strong></p>

                        <div class="footer">
                          <p>Booking ID: ${metadata.bookingId}</p>
                          <p>This is an automated confirmation email.</p>
                        </div>
                      </div>
                    </div>
                  </body>
                  </html>
                `;

                const emailText = `
Booking Confirmed!

Hi ${customerName},

Your charter fishing booking has been confirmed!

Booking Details:
- Charter: ${charterName}
- Captain: ${captainName}
- Date: ${tripDate}
- Time: ${tripTime}
- Duration: ${duration} hours
- Guests: ${guests}
- Total Paid: $${totalPrice.toFixed(2)}

Your captain will contact you before your trip with meeting location and any additional details.

Booking ID: ${metadata.bookingId}

We look forward to seeing you on the water!

The Gulf Coast Charters Team
                `;

                const { data: emailData, error: emailError } = await resend.emails.send({
                  from: fromEmail,
                  to: [customerEmail],
                  subject: `🎣 Your Charter Booking is Confirmed!`,
                  html: emailHtml,
                  text: emailText,
                });

                if (emailError) {
                  console.error('❌ Error sending booking confirmation email:', emailError);
                } else {
                  console.log(`✅ Booking confirmation email sent to ${customerEmail} for booking ${metadata.bookingId}`);
                }
              } else {
                console.log('⚠️ RESEND_API_KEY not configured - skipping booking confirmation email');
              }
            } catch (emailErr: any) {
              console.error('❌ Error in booking confirmation email process:', emailErr);
              // Don't fail the webhook if email fails
            }
          }
        }

        // Link to user if customer email matches
        if (session.customer_email || metadata.customerEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', session.customer_email || metadata.customerEmail)
            .single();

          if (profile && !paymentData.user_id) {
            paymentData.user_id = profile.id;
          }
        }

        // Handle tip payments
        console.log('Checking metadata:', { type: metadata.type, tip_id: metadata.tip_id, bookingId: metadata.bookingId });
        if (metadata.type === 'tip' && metadata.tip_id) {
          console.log(`Processing tip payment: ${metadata.tip_id}`);
          // Update tip status to completed
          const { error: tipUpdateError } = await supabase
            .from('tips')
            .update({
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_transaction_id: session.payment_intent as string,
              updated_at: new Date().toISOString(),
            })
            .eq('tip_id', metadata.tip_id);

          if (tipUpdateError) {
            console.error('❌ Error updating tip:', tipUpdateError);
            console.error('Tip update error details:', JSON.stringify(tipUpdateError, null, 2));
          } else {
            console.log(`✅ Tip payment completed: ${metadata.tip_id}`);
            // TODO: Send notifications to recipients
          }
        } else if (metadata.type === 'gift_card' && metadata.gift_certificate_id) {
          // Handle gift card purchases
          console.log(`Processing gift card purchase: ${metadata.gift_certificate_id}`);

          // Generate unique gift certificate code
          const { data: codeData, error: codeError } = await supabase.rpc('generate_gift_certificate_code');

          if (codeError) {
            console.error('❌ Error generating gift certificate code:', codeError);
            // Continue anyway - we'll use a fallback code
          }

          const giftCode = codeData || `GCC-${metadata.gift_certificate_id.substring(0, 8).toUpperCase()}`;

          // Update gift certificate to active status with generated code
          const { error: certUpdateError } = await supabase
            .from('gift_certificates')
            .update({
              code: giftCode,
              status: 'active',
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString(),
            })
            .eq('certificate_id', metadata.gift_certificate_id);

          if (certUpdateError) {
            console.error('❌ Error updating gift certificate:', certUpdateError);
            console.error('Gift certificate update error details:', JSON.stringify(certUpdateError, null, 2));
          } else {
            console.log(`✅ Gift card purchase completed: ${metadata.gift_certificate_id} with code ${giftCode}`);
            // TODO: Send email to recipient with gift card code
          }
        } else if (metadata.type === 'custom_email' && metadata.email && metadata.user_id) {
          // Custom @gulfcoastcharters.com email purchase: insert into custom_emails
          const emailAddress = String(metadata.email);
          const emailPrefix = emailAddress.includes('@') ? emailAddress.split('@')[0] : emailAddress;
          const userType = (metadata.user_type === 'captain' || metadata.user_type === 'customer') ? metadata.user_type : 'customer';
          const amountPaid = session.amount_total ? session.amount_total / 100 : 25;

          const { error: customEmailError } = await supabase.from('custom_emails').insert({
            user_id: metadata.user_id,
            email_address: emailAddress,
            email_prefix: emailPrefix,
            user_type: userType,
            payment_method: 'stripe',
            amount_paid: amountPaid,
            is_active: true,
          });

          if (customEmailError) {
            console.error('❌ Error inserting custom email:', customEmailError);
          } else {
            console.log(`✅ Custom email purchased: ${emailAddress} for user ${metadata.user_id}`);
          }
        } else {
          console.log('Not a tip or gift card or custom email payment, inserting payment record');
          // Insert payment record for other payments
          await supabase.from('payments').insert(paymentData);
        }

        console.log(`✅ Payment completed: ${session.id} for ${metadata.type || 'booking'} ${metadata.bookingId || metadata.tip_id || 'N/A'}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata || {};

        console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);

        // Handle tip payments
        if (metadata.type === 'tip' && metadata.tip_id) {
          // Update tip status to completed
          const { error: tipUpdateError } = await supabase
            .from('tips')
            .update({
              status: 'completed',
              stripe_transaction_id: paymentIntent.id,
              updated_at: new Date().toISOString(),
            })
            .eq('tip_id', metadata.tip_id);

          if (tipUpdateError) {
            console.error('Error updating tip:', tipUpdateError);
          } else {
            console.log(`✅ Tip payment completed: ${metadata.tip_id}`);

            // TODO: Send notifications to recipients
            // This would trigger email notifications to captain/crew
          }
        }

        // Handle booking payments (existing logic)
        if (metadata.bookingId) {
          // Payment record should already be created by checkout.session.completed
          // But update booking if needed
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
            })
            .eq('id', metadata.bookingId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata || {};

        // Handle tip payment failures
        if (metadata.type === 'tip' && metadata.tip_id) {
          await supabase
            .from('tips')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('tip_id', metadata.tip_id);

          console.log(`❌ Tip payment failed: ${metadata.tip_id}`);
        }

        // Update booking payment status
        if (metadata.bookingId) {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'failed',
            })
            .eq('id', metadata.bookingId);
        }

        // Update payment record if exists
        await supabase
          .from('payments')
          .update({
            status: 'failed',
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent as string;

        // Find payment record
        const { data: payment } = await supabase
          .from('payments')
          .select('id, booking_id, amount')
          .eq('stripe_charge_id', charge.id)
          .single();

        if (payment) {
          const refundAmount = charge.amount_refunded ? charge.amount_refunded / 100 : payment.amount;

          // Update payment record
          await supabase
            .from('payments')
            .update({
              status: 'refunded',
              refund_amount: refundAmount,
              refund_reason: charge.refund_reason || 'Customer request',
            })
            .eq('id', payment.id);

          // Update booking if exists
          if (payment.booking_id) {
            await supabase
              .from('bookings')
              .update({
                payment_status: 'refunded',
                status: 'cancelled',
              })
              .eq('id', payment.booking_id);
          }
        }

        console.log(`💰 Refund processed: ${charge.id}`);
        break;
      }

      default:
        console.error(`⚠️ Unhandled event type: ${event.type}`);

        // Log unhandled event to database
        await supabase.from('debug_logs').insert({
          event_type: 'unhandled_event_type',
          payload: {
            event_type: event.type,
            event_id: event.id,
            timestamp: new Date().toISOString(),
          },
        });
    }

    console.error('=== WEBHOOK PROCESSING COMPLETE ===');

    // Log completion to database
    await supabase.from('debug_logs').insert({
      event_type: 'webhook_processing_complete',
      payload: {
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    console.error('Error stack:', error.stack);

    // Log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('debug_logs').insert({
        event_type: 'webhook_error',
        payload: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (dbError) {
      // If we can't log to database, at least log to console
      console.error('Failed to log error to database:', dbError);
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Webhook processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
