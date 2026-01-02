import CryptoPaymentService from '@/lib/crypto-payment';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST: Create a crypto payment charge
 * Creates a payment request for BTC or ETH
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, description, metadata, userId, planId } = body;

    if (!amount || !currency || !description) {
      return NextResponse.json(
        { error: 'Amount, currency, and description are required' },
        { status: 400 }
      );
    }

    if (currency !== 'BTC' && currency !== 'ETH') {
      return NextResponse.json(
        { error: 'Currency must be BTC or ETH' },
        { status: 400 }
      );
    }

    const cryptoService = CryptoPaymentService.getInstance();

    // Create charge with Coinbase Commerce
    const charge = await cryptoService.createCharge({
      amount: parseFloat(amount),
      currency: currency as 'BTC' | 'ETH',
      description,
      metadata: {
        ...metadata,
        userId: userId || 'anonymous',
        planId: planId || '',
        timestamp: new Date().toISOString(),
      },
    });

    // Store payment record in database
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('crypto_payments').insert({
          charge_id: charge.id,
          code: charge.code,
          user_id: userId || null,
          plan_id: planId || null,
          amount_usd: parseFloat(charge.pricing.local.amount),
          amount_crypto: parseFloat(charge.amount.amount),
          currency: charge.amount.currency,
          address: charge.address,
          status: charge.status,
          hosted_url: charge.hosted_url,
          expires_at: charge.expires_at,
          metadata: metadata || {},
        });
      } catch (dbError) {
        console.error('Error storing crypto payment in database:', dbError);
        // Continue even if DB insert fails - payment is still created
      }
    }

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        code: charge.code,
        hosted_url: charge.hosted_url,
        address: charge.address,
        amount: charge.amount,
        pricing: charge.pricing,
        expires_at: charge.expires_at,
        status: charge.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating crypto payment charge:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create crypto payment',
      },
      { status: 500 }
    );
  }
}

