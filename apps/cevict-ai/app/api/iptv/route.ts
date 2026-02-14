import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Subscription tiers for IPTV Viewer
export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    period: '1 month',
    features: ['Basic EPG', '3 Channels', 'Standard Quality'],
    maxChannels: 3,
    recordingMinutes: 0,
    quality: '720p',
    adSupported: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    period: 'month',
    features: ['All Channels', 'Cloud Recording', '4K', 'No Ads', 'Multi-Device'],
    maxChannels: -1, // unlimited
    recordingMinutes: 5000, // 5 hours cloud storage
    quality: '4K',
    adSupported: false,
  },
  provider: {
    id: 'provider',
    name: 'Provider Partner',
    price: 7.99,
    period: 'month',
    features: ['All Channels', 'Basic Recording', 'HD', 'Provider Support'],
    maxChannels: -1,
    recordingMinutes: 500,
    quality: '1080p',
    adSupported: false,
  },
};

export type TierId = keyof typeof SUBSCRIPTION_TIERS;

// Provider partnership configuration
export interface ProviderPartner {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  webhookUrl?: string;
  commissionPercent: number;
}

const PROVIDER_PARTNERS: ProviderPartner[] = [
  {
    id: 'provider-1',
    name: 'Example IPTV Provider',
    code: 'EXAMPLE20',
    discountPercent: 20,
    commissionPercent: 15,
  },
];

// Initialize Supabase client
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
};

// GET /api/iptv - Get subscription info and tiers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tierId = searchParams.get('tier');

    // Return tier info
    if (tierId && SUBSCRIPTION_TIERS[tierId as TierId]) {
      return NextResponse.json({
        tier: SUBSCRIPTION_TIERS[tierId as TierId],
      });
    }

    // Return all tiers
    const tiers = Object.values(SUBSCRIPTION_TIERS);

    // If userId provided, return their subscription status
    if (userId) {
      const supabase = getSupabase();

      const { data: subscription, error } = await supabase
        .from('iptv_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return NextResponse.json({
        tiers,
        currentTier: subscription?.tier_id || null,
        expiresAt: subscription?.expires_at || null,
        providerCode: subscription?.provider_code || null,
        isTrial: subscription?.is_trial || false,
        trialUsed: subscription?.trial_used || false,
      });
    }

    return NextResponse.json({
      tiers,
      providers: PROVIDER_PARTNERS,
    });
  } catch (error) {
    console.error('IPTV API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/iptv - Create subscription, apply provider code, cancel, etc.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, tierId, providerCode, paymentMethodId } = body;

    const supabase = getSupabase();

    switch (action) {
      case 'start-trial': {
        // Start free 1-month trial
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        const { error } = await supabase
          .from('iptv_subscriptions')
          .upsert({
            user_id: userId,
            tier_id: 'free',
            is_trial: true,
            trial_used: true,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: 'Trial started successfully',
          expiresAt: expiresAt.toISOString(),
        });
      }

      case 'apply-provider-code': {
        // Apply provider code for discounted rate
        const provider = PROVIDER_PARTNERS.find(p => p.code === providerCode);

        if (!provider) {
          return NextResponse.json(
            { error: 'Invalid provider code' },
            { status: 400 }
          );
        }

        // Calculate discounted price
        const baseTier = SUBSCRIPTION_TIERS.provider;
        const discountedPrice = baseTier.price * (1 - provider.discountPercent / 100);

        return NextResponse.json({
          success: true,
          provider: {
            name: provider.name,
            discountPercent: provider.discountPercent,
          },
          pricing: {
            originalPrice: baseTier.price,
            discountedPrice: discountedPrice.toFixed(2),
            period: baseTier.period,
          },
        });
      }

      case 'subscribe': {
        // Create subscription with Stripe
        // This would integrate with Stripe in production

        const tier = SUBSCRIPTION_TIERS[tierId as TierId];
        if (!tier) {
          return NextResponse.json(
            { error: 'Invalid tier' },
            { status: 400 }
          );
        }

        // For provider tier, check if provider code is valid
        let effectivePrice = tier.price;
        let appliedProviderCode = null;

        if (tierId === 'provider' && providerCode) {
          const provider = PROVIDER_PARTNERS.find(p => p.code === providerCode);
          if (provider) {
            effectivePrice = tier.price * (1 - provider.discountPercent / 100);
            appliedProviderCode = providerCode;
          }
        }

        // In production, create Stripe subscription here
        // const stripeSubscription = await stripe.subscriptions.create({...});

        // For now, just return the configuration
        return NextResponse.json({
          success: true,
          message: 'Subscription created',
          tier: tier,
          effectivePrice,
          appliedProviderCode,
          // Stripe checkout URL would be returned here
          checkoutUrl: `https://checkout.stripe.com/pay/cs_test_...`,
        });
      }

      case 'cancel': {
        // Cancel subscription
        const { error } = await supabase
          .from('iptv_subscriptions')
          .update({
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled',
        });
      }

      case 'check-status': {
        // Check if subscription is active
        const { data: subscription, error } = await supabase
          .from('iptv_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const now = new Date();
        const isActive = subscription &&
          new Date(subscription.expires_at) > now &&
          !subscription.cancelled_at;

        return NextResponse.json({
          isActive,
          tierId: subscription?.tier_id || null,
          expiresAt: subscription?.expires_at || null,
          isTrial: subscription?.is_trial || false,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('IPTV subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
