# Affiliate Marketing Program Guide

## Overview
Gulf Coast Charters' Affiliate Marketing Program allows captains and customers to earn commissions by referring new users to the platform. Affiliates earn 5-15% commission on first bookings based on their performance tier.

## Features Implemented

### 1. Tiered Commission Structure
- **Bronze Tier** (0+ referrals): 5% commission
- **Silver Tier** (5+ referrals): 8% commission
- **Gold Tier** (15+ referrals): 12% commission
- **Platinum Tier** (30+ referrals): 15% commission

### 2. Affiliate Dashboard (`/affiliate-program`)
- Real-time commission tracking
- Referral history with booking values
- Current tier status and progress
- Unique affiliate code generation
- Earnings summary (total, pending, paid)

### 3. Promotional Materials
- Pre-written email templates
- Social media post templates
- Downloadable banner ads (728x90, 300x250, 160x600)
- One-click copy functionality

### 4. Admin Analytics (`/admin/affiliate-analytics`)
- Total affiliate count and active affiliates
- Commission payout tracking
- Growth trends and performance charts
- Tier distribution analytics
- Monthly revenue tracking

### 5. Payout Management
- Pending payout requests
- Batch approval functionality
- Multiple payment methods (PayPal, Bank Transfer, Stripe)
- Payment history tracking
- Automated payout processing

### 6. Leaderboard System
- Top 10 affiliates ranking
- Trophy/medal icons for top performers
- Real-time earnings display
- Tier badges for each affiliate

## Database Schema

### Affiliate Codes Table
```sql
CREATE TABLE affiliate_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### Affiliate Conversions Table
```sql
CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_code TEXT REFERENCES affiliate_codes(code),
  referee_id UUID REFERENCES auth.users(id),
  booking_id UUID REFERENCES bookings(id),
  booking_value DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, approved, paid
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
```

### Affiliate Payouts Table
```sql
CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2),
  payment_method TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, paid, failed
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  transaction_id TEXT
);
```

### Affiliate Stats Table
```sql
CREATE TABLE affiliate_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_referrals INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  pending_commission DECIMAL(10,2) DEFAULT 0,
  current_tier TEXT DEFAULT 'Bronze',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Edge Function: affiliate-tracking

Create `supabase/functions/affiliate-tracking/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { action, ...params } = await req.json();

  try {
    switch (action) {
      case 'generate_code': {
        const { userId } = params;
        const code = `AFF-${userId.substring(0, 8).toUpperCase()}`;
        
        const { data, error } = await supabase
          .from('affiliate_codes')
          .upsert({ user_id: userId, code })
          .select()
          .single();

        return new Response(JSON.stringify({ code: data?.code }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'track_conversion': {
        const { affiliateCode, bookingId, bookingValue } = params;
        
        // Get affiliate code details
        const { data: codeData } = await supabase
          .from('affiliate_codes')
          .select('user_id')
          .eq('code', affiliateCode)
          .single();

        if (!codeData) {
          return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400 });
        }

        // Get affiliate stats to determine tier
        const { data: stats } = await supabase
          .from('affiliate_stats')
          .select('completed_bookings')
          .eq('user_id', codeData.user_id)
          .single();

        const completedBookings = stats?.completed_bookings || 0;
        let commissionRate = 5;
        if (completedBookings >= 30) commissionRate = 15;
        else if (completedBookings >= 15) commissionRate = 12;
        else if (completedBookings >= 5) commissionRate = 8;

        const commissionAmount = (bookingValue * commissionRate) / 100;

        // Record conversion
        await supabase.from('affiliate_conversions').insert({
          affiliate_code: affiliateCode,
          booking_id: bookingId,
          booking_value: bookingValue,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          status: 'pending'
        });

        return new Response(JSON.stringify({ success: true, commission: commissionAmount }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'get_stats': {
        const { userId } = params;
        
        const { data: conversions } = await supabase
          .from('affiliate_conversions')
          .select('*')
          .eq('affiliate_code', `AFF-${userId.substring(0, 8).toUpperCase()}`);

        const totalCommission = conversions
          ?.filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

        const pendingCommission = conversions
          ?.filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

        return new Response(JSON.stringify({
          totalReferrals: conversions?.length || 0,
          completedBookings: conversions?.filter(c => c.status === 'paid').length || 0,
          totalCommission,
          pendingCommission
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

## Integration Points

### 1. Booking Confirmation
When a booking is completed, track the affiliate conversion:

```typescript
// In booking completion handler
if (affiliateCode) {
  await supabase.functions.invoke('affiliate-tracking', {
    body: {
      action: 'track_conversion',
      affiliateCode,
      bookingId: booking.id,
      bookingValue: booking.total_amount
    }
  });
}
```

### 2. URL Tracking
Capture affiliate codes from URL parameters:

```typescript
// In App.tsx or main component
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const affCode = params.get('aff');
  if (affCode) {
    localStorage.setItem('affiliate_code', affCode);
  }
}, []);
```

### 3. Payout Automation
Set up a cron job to process approved payouts:

```typescript
// supabase/functions/process-affiliate-payouts/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get approved payouts
  const { data: payouts } = await supabase
    .from('affiliate_payouts')
    .select('*')
    .eq('status', 'approved');

  for (const payout of payouts || []) {
    try {
      // Process payment via Stripe/PayPal
      // Update status to 'paid'
      await supabase
        .from('affiliate_payouts')
        .update({ status: 'paid', processed_at: new Date().toISOString() })
        .eq('id', payout.id);

      // Send confirmation email
    } catch (error) {
      console.error(`Failed to process payout ${payout.id}:`, error);
    }
  }

  return new Response(JSON.stringify({ processed: payouts?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Revenue Projections

### Conservative Estimate
- 100 active affiliates
- Average 2 referrals per affiliate per month
- Average booking value: $400
- Average commission rate: 8%
- **Monthly Commission Expense**: $6,400
- **Monthly Revenue from Referred Bookings**: $80,000

### Aggressive Growth
- 500 active affiliates
- Average 3 referrals per affiliate per month
- Average booking value: $450
- Average commission rate: 10%
- **Monthly Commission Expense**: $67,500
- **Monthly Revenue from Referred Bookings**: $675,000

## Best Practices

1. **Fraud Prevention**
   - Track IP addresses for conversions
   - Limit self-referrals
   - Require email verification for new users
   - Monitor suspicious patterns

2. **Communication**
   - Send monthly performance reports
   - Notify affiliates of tier upgrades
   - Provide marketing tips and best practices
   - Celebrate top performers

3. **Incentives**
   - Bonus for first 5 referrals
   - Seasonal competitions
   - Exclusive perks for Platinum affiliates
   - Early access to new features

4. **Compliance**
   - Clear terms and conditions
   - Tax documentation (1099 forms)
   - Cookie consent for tracking
   - GDPR compliance

## Next Steps

1. Deploy edge functions to Supabase
2. Create database tables and indexes
3. Set up payment processing integration
4. Configure email notifications
5. Launch beta program with select users
6. Monitor performance and adjust tiers
7. Scale to full platform rollout

## Support

For affiliate program questions:
- Email: affiliates@gulfcoastcharters.com
- Dashboard: /affiliate-program
- Admin Portal: /admin/affiliate-analytics
