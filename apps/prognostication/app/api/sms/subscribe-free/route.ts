import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Subscribe to FREE SMS daily best bets
 * Stores subscription in Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('sms_subscriptions')
      .select('id, phone_number, tier, active')
      .eq('phone_number', cleanedPhone)
      .eq('tier', 'free')
      .single();

    if (existing) {
      if (existing.active) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed to free SMS bets',
        });
      } else {
        // Reactivate subscription
        const { error: updateError } = await supabase
          .from('sms_subscriptions')
          .update({
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }

        return NextResponse.json({
          success: true,
          message: 'SMS subscription reactivated',
        });
      }
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('sms_subscriptions')
      .insert({
        phone_number: cleanedPhone,
        tier: 'free',
        active: true,
        subscribed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting SMS subscription:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to free SMS bets',
    });
  } catch (error: any) {
    console.error('Error subscribing to free SMS:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to subscribe to SMS alerts',
      },
      { status: 500 }
    );
  }
}

