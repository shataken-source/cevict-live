import CryptoPaymentService from '@/lib/crypto-payment';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST: Handle Coinbase Commerce webhook
 * Processes payment confirmations and updates database
 */
export async function POST(request: NextRequest) {
  try {
    if (!webhookSecret) {
      console.error('COINBASE_COMMERCE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-cc-webhook-signature') || '';

    // Verify webhook signature
    const cryptoService = CryptoPaymentService.getInstance();
    const isValid = cryptoService.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    console.log(`[Crypto Webhook] Received event: ${type} for charge ${data.id}`);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('Supabase not configured for webhook processing');
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Handle different event types
    switch (type) {
      case 'charge:created':
        // Charge was created - already stored in create-charge endpoint
        break;

      case 'charge:confirmed':
        // Payment confirmed - update status and grant access
        await supabase
          .from('crypto_payments')
          .update({
            status: 'COMPLETED',
            confirmed_at: new Date().toISOString(),
            transaction_id: data.payments?.[0]?.transaction_id || null,
          })
          .eq('charge_id', data.id);

        // Get payment record to find user/plan
        const { data: payment } = await supabase
          .from('crypto_payments')
          .select('user_id, plan_id, amount_usd')
          .eq('charge_id', data.id)
          .single();

        if (payment) {
          // Grant access to user (update subscription, etc.)
          if (payment.user_id && payment.plan_id) {
            // Update user subscription or grant access
            // This depends on your subscription system
            console.log(`[Crypto Payment] Granting access to user ${payment.user_id} for plan ${payment.plan_id}`);
          }
        }
        break;

      case 'charge:failed':
      case 'charge:delayed':
        await supabase
          .from('crypto_payments')
          .update({
            status: type === 'charge:failed' ? 'FAILED' : 'PENDING',
          })
          .eq('charge_id', data.id);
        break;

      case 'charge:pending':
        await supabase
          .from('crypto_payments')
          .update({
            status: 'PENDING',
          })
          .eq('charge_id', data.id);
        break;

      default:
        console.log(`[Crypto Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Error processing crypto webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}

