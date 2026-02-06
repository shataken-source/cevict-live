/**
 * API endpoint to create a tip
 * POST /api/tips/create
 * Body: { bookingId, amount, percentage, customerMessage, crewSplit }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test mode bypass (DEV ONLY - NEVER ENABLE IN PRODUCTION)
    const isTestMode = process.env.ALLOW_TIP_TEST_MODE === 'true';
    const hasTestHeader = req.headers['x-test-mode'] === 'true';
    const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
    const isTestRoute = req.url?.includes('/test-tip');
    
    let user: any = null;
    
    if (isTestMode && hasTestHeader && (isLocalhost || isTestRoute)) {
      // TEST MODE: Use a test user ID (you can customize this)
      console.warn('⚠️ TEST MODE ACTIVE - Auth bypassed for tip creation');
      
      // Get booking first to use its user_id (which definitely exists)
      const supabaseAdmin = getSupabaseAdmin();
      const { bookingId } = req.body;
      
      let testUserId = req.body.testUserId || process.env.TEST_USER_ID;
      
      // If no test user ID provided, try to get one from the booking
      if (!testUserId && bookingId) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('user_id')
          .eq('id', bookingId)
          .maybeSingle();
        
        if (booking?.user_id) {
          testUserId = booking.user_id;
          console.log('✅ Using booking owner as test user:', testUserId);
        }
      }
      
      // If still no user ID, try to get any user from profiles
      if (!testUserId) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .limit(1)
          .maybeSingle();
        
        if (profile) {
          testUserId = profile.id;
          console.log('✅ Using profile user for test mode:', testUserId);
        }
      }
      
      if (testUserId) {
        user = {
          id: testUserId,
          email: 'test@example.com'
        };
        console.log('✅ Using test user ID:', user.id);
      } else {
        // Last resort: return error asking for a real user
        return res.status(400).json({ 
          error: 'Test mode requires a valid user ID. Options:',
          hint: '1. Set TEST_USER_ID=<real-user-id> in .env.local\n2. Or use a booking that has a user_id\n3. Or create a test user in the database'
        });
      }
    } else {
      // PRODUCTION MODE: Require authentication
      const authResult = await getAuthedUser(req, res);
      user = authResult.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const supabase = getSupabaseAdmin();
    const { bookingId, amount, percentage, customerMessage, crewSplit } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get booking to verify ownership and trip completion
    // Use id (uuid) as the primary key - bookings table only has 'id', not 'booking_id'
    // Join via FK: bookings_captain_id_fkey (left join - no !inner)
    // Use maybeSingle() to avoid PGRST116 when 0 rows
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, captains!bookings_captain_id_fkey(id, user_id)')
      .eq('id', bookingId) // bookings table only has 'id' column, not 'booking_id'
      .maybeSingle(); // Use maybeSingle() to return null instead of error when 0 rows

    if (bookingError) {
      console.error('Booking fetch error:', bookingError);
      return res.status(404).json({ error: `Booking not found: ${bookingError.message}` });
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found (no rows returned - may be RLS blocked)' });
    }

    // In test mode, skip ownership and timing checks
    const isTestModeActive = isTestMode && hasTestHeader && (isLocalhost || isTestRoute);
    
    if (!isTestModeActive) {
      // PRODUCTION: Verify customer owns this booking
      if (booking.user_id !== user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // PRODUCTION: Check if trip is completed (at least 2 hours after end time)
      const tripEndTime = booking.end_time || booking.trip_date;
      if (tripEndTime) {
        const endTime = new Date(tripEndTime);
        const twoHoursLater = new Date(endTime.getTime() + 2 * 60 * 60 * 1000);
        if (new Date() < twoHoursLater) {
          return res.status(400).json({ error: 'Tip option available 2 hours after trip completion' });
        }
      }
    } else {
      console.warn('⚠️ TEST MODE: Skipping booking ownership and timing validation');
    }

    // Calculate platform fee (3%)
    const tipAmount = parseFloat(amount);
    const platformFee = tipAmount * 0.03;
    const netAmount = tipAmount - platformFee;

    // Create tip record
    // Use booking.id (the actual PK) for the tip record
    const actualBookingId = booking.id || bookingId; // Use booking.id if available, fallback to bookingId
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        booking_id: actualBookingId, // This should match the FK column name in tips table
        customer_id: user.id,
        amount: tipAmount,
        percentage: percentage ? parseFloat(percentage) : null,
        platform_fee: platformFee,
        net_amount: netAmount,
        customer_message: customerMessage,
        status: 'pending'
      })
      .select()
      .single();

    if (tipError) {
      console.error('Error creating tip:', tipError);
      console.error('Tip error details:', JSON.stringify(tipError, null, 2));
      return res.status(500).json({ 
        error: 'Failed to create tip',
        details: tipError.message,
        code: tipError.code,
        hint: tipError.hint
      });
    }

    // Handle crew splitting if provided
    if (crewSplit && Array.isArray(crewSplit)) {
      const distributions = crewSplit.map((split: any) => ({
        tip_id: tip.tip_id,
        recipient_id: split.recipientId,
        recipient_type: split.recipientType,
        amount: split.amount,
        percentage: split.percentage
      }));

      await supabase.from('tip_distributions').insert(distributions);
    } else {
      // Default: all to captain
      const captainUserId = booking.captains?.user_id || booking.captain_id;
      if (!captainUserId) {
        console.error('No captain user_id found for booking:', booking.id);
        return res.status(500).json({ error: 'Captain information not available' });
      }
      
      const { error: distributionError } = await supabase.from('tip_distributions').insert({
        tip_id: tip.tip_id,
        recipient_id: captainUserId,
        recipient_type: 'captain',
        amount: netAmount,
        percentage: 100
      });
      
      if (distributionError) {
        console.error('Error creating tip distribution:', distributionError);
        console.error('Distribution error details:', JSON.stringify(distributionError, null, 2));
        // Don't fail the whole request, but log it
      }
    }

    // Payment will be processed via Stripe Checkout Session (created by frontend)
    // This keeps the API simple and uses the existing stripe-checkout edge function
    // The webhook will update the tip status when payment succeeds
    
    return res.status(200).json({
      success: true,
      tip,
      requiresPayment: true, // Frontend will create checkout session
    });
  } catch (error: any) {
    console.error('Error creating tip:', error);
    console.error('Full error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
