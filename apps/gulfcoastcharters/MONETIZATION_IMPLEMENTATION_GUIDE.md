# Monetization System Implementation Guide

## Overview
Gulf Coast Charters now has a comprehensive revenue generation system with multiple income streams including platform commissions, service fees, premium subscriptions, and featured listings.

## Revenue Streams Implemented

### 1. Platform Commission (12% default)
- **What**: Platform takes a percentage of each charter booking
- **Who Pays**: Captains (deducted from their payout)
- **Default Rate**: 12% of booking amount
- **Adjustable**: Yes, via admin dashboard
- **Example**: $500 booking = $60 commission, $440 captain payout

### 2. Service Fee (8% default)
- **What**: Additional fee charged to customers at checkout
- **Who Pays**: Customers (added to booking total)
- **Default Rate**: 8% of booking amount
- **Adjustable**: Yes, via admin dashboard
- **Example**: $500 booking + $40 service fee = $540 customer pays

### 3. Premium Captain Subscriptions
Three tiers with reduced commission rates:

#### Basic (Free)
- 12% platform commission
- Basic profile
- Up to 5 photos
- Standard support

#### Professional ($49/month)
- **8% platform commission** (save 4%)
- Featured in search results
- Unlimited photos
- Custom booking page
- Analytics dashboard
- Priority support

#### Elite ($149/month)
- **5% platform commission** (save 7%)
- Top placement guarantee
- Video listings
- Advanced analytics
- Marketing tools
- API access
- Dedicated account manager

### 4. Featured Listings
Captains can pay to promote their charters:

- **24 Hour Featured**: $19 (3x more views)
- **Weekly Featured**: $79 (Save $54, homepage placement)
- **Monthly Featured**: $249 (Save $321, social media promotion)

Benefits:
- Top of search results
- Featured badge
- Homepage placement
- Increased visibility
- Social media promotion (monthly plan)

## Admin Dashboard Access

Navigate to: `/admin/monetization`

### Features Available:

1. **Revenue Analytics Tab**
   - Total revenue tracking
   - Commission revenue breakdown
   - Service fee revenue
   - Subscription revenue
   - Featured listing revenue
   - Booking statistics
   - Month-over-month growth
   - Time range filters (7, 30, 90 days)

2. **Commission Settings Tab**
   - Adjust platform commission rate
   - Adjust customer service fee rate
   - Real-time calculation preview
   - Example booking breakdown

3. **Subscription Plans Tab**
   - View all subscription tiers
   - Manage pricing
   - Update features
   - Track active subscriptions

## Database Schema Required

```sql
-- Captain subscriptions table
CREATE TABLE captain_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  plan_type TEXT NOT NULL, -- 'basic', 'pro', 'elite'
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Featured listings table
CREATE TABLE featured_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charter_id UUID REFERENCES charters(id),
  user_id UUID REFERENCES auth.users(id),
  plan_type TEXT NOT NULL, -- 'featured-day', 'featured-week', 'featured-month'
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'active', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Update bookings table to include commission tracking
ALTER TABLE bookings ADD COLUMN commission_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN service_fee DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN captain_payout DECIMAL(10,2);
```

## Integration Points

### Booking Flow
When a customer books a charter:
1. Calculate base booking amount
2. Apply platform commission (based on captain's subscription tier)
3. Add service fee for customer
4. Store all amounts in booking record
5. Calculate captain payout (booking - commission)

### Payment Processing
```javascript
const bookingAmount = 500;
const captainTier = 'pro'; // Get from captain_subscriptions
const commissionRate = captainTier === 'elite' ? 0.05 : captainTier === 'pro' ? 0.08 : 0.12;
const serviceFeeRate = 0.08;

const platformCommission = bookingAmount * commissionRate;
const serviceFee = bookingAmount * serviceFeeRate;
const captainPayout = bookingAmount - platformCommission;
const customerTotal = bookingAmount + serviceFee;
```

### Captain Dashboard Integration
Show captains:
- Current subscription tier
- Commission rate
- Upgrade options
- Featured listing options
- Earnings breakdown

## Revenue Projections

### Example Monthly Revenue (100 bookings)
- Average booking: $500
- Platform commission (12%): $6,000
- Service fees (8%): $4,000
- Subscriptions (10 Pro, 3 Elite): $937
- Featured listings (5 weekly): $395
- **Total Monthly Revenue**: $11,332

### Annual Revenue Potential
- Bookings (1,200/year): $120,000
- Subscriptions: $11,244
- Featured listings: $4,740
- **Total Annual Revenue**: $135,984

## Best Practices

1. **Transparent Pricing**: Always show commission and service fees clearly
2. **Value Proposition**: Highlight savings in premium tiers
3. **Featured Listings**: Show ROI data (3-5x more bookings)
4. **Seasonal Adjustments**: Consider dynamic pricing during peak season
5. **A/B Testing**: Test different commission rates and service fees
6. **Captain Retention**: Offer first month free for Pro tier
7. **Bundle Deals**: Combine subscription + featured listing discounts

## Next Steps

1. Set up Stripe/payment processor integration
2. Create automated payout system for captains
3. Implement subscription renewal reminders
4. Add featured listing expiration notifications
5. Build revenue forecasting tools
6. Create captain earnings dashboard
7. Implement referral bonuses for captains
8. Add seasonal pricing multipliers

## Support

For questions or issues:
- Email: jason@gulfcoastcharters.com
- Dashboard: `/admin/monetization`
- Documentation: This guide
