# Monetization System Implementation Guide

## Overview
Gulf Coast Charters has a comprehensive revenue generation system with multiple income streams including platform commissions, service fees, premium subscriptions, and featured listings.

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

Navigate to: **`/admin/monetization`**

### Features Available

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
   - Adjust platform commission rate (%)
   - Adjust customer service fee rate (%)
   - Real-time example calculation
   - Save to database (`monetization_settings`)

3. **Subscription Plans Tab**
   - View all subscription tiers (Basic, Pro, Elite)
   - Manage pricing (stored in `monetization_settings`)
   - Track active subscriptions

## Database Schema

Migration: **`20260119_monetization_system.sql`**

- **captain_subscriptions**: id, user_id, plan_type (basic|pro|elite), amount, status, stripe_subscription_id, created_at, expires_at
- **featured_listings**: id, charter_id, user_id, plan_type (featured-day|featured-week|featured-month), amount, status, created_at, expires_at
- **bookings** (columns added): commission_amount, service_fee, captain_payout
- **monetization_settings**: setting_key, setting_value (text), description. Keys: platform_commission_rate, service_fee_rate, pro_subscription_price, elite_subscription_price, featured_day_price, featured_week_price, featured_month_price

## Integration Points

### Booking Flow
When a customer books a charter:
1. Calculate base booking amount
2. Get captain commission rate via `get_captain_commission_rate(captain_id)` (5% elite, 8% pro, 12% basic)
3. Get service fee rate from `monetization_settings.service_fee_rate`
4. Store commission_amount, service_fee, captain_payout on booking
5. Customer total = booking amount + service fee

### Payment Processing
```javascript
const bookingAmount = 500;
const captainTier = 'pro'; // from captain_subscriptions
const commissionRate = captainTier === 'elite' ? 0.05 : captainTier === 'pro' ? 0.08 : 0.12;
const serviceFeeRate = 0.08; // or read from monetization_settings

const platformCommission = bookingAmount * commissionRate;
const serviceFee = bookingAmount * serviceFeeRate;
const captainPayout = bookingAmount - platformCommission;
const customerTotal = bookingAmount + serviceFee;
```

### SQL Helper
Use `calculate_booking_amounts(booking_amount, captain_id)` to get commission_amount, service_fee, captain_payout, customer_total (reads settings and captain tier).

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

1. Set up Stripe/payment processor integration for subscriptions and featured listings
2. Create automated payout system for captains
3. Implement subscription renewal reminders
4. Add featured listing expiration notifications
5. Build revenue forecasting tools
6. Create captain earnings dashboard
7. Implement referral bonuses for captains
8. Add seasonal pricing multipliers

## Support

- Email: jason@gulfcoastcharters.com
- Dashboard: `/admin/monetization`
- Documentation: This guide

---

## Implementation status (no-BS)

**Route:** `/admin/monetization` → **AdminMonetization** (tabs: Revenue Analytics, Commission Settings, Subscription Plans).

**Tables (migration `20260119_monetization_system.sql`):**  
- **captain_subscriptions** – plan_type basic|pro|elite, amount, status, expires_at; RLS by user_id and admin (profiles.role = 'admin').  
- **featured_listings** – charter_id, user_id, plan_type featured-day|featured-week|featured-month, amount, status, expires_at; RLS same pattern.  
- **bookings** – columns commission_amount, service_fee, captain_payout added if missing.  
- **monetization_settings** – key/value (setting_key, setting_value text). Defaults: platform_commission_rate 0.12, service_fee_rate 0.08, pro/elite/featured prices. RLS: admin only.

**Functions:**  
- **get_captain_commission_rate(user_id)** – returns 0.05 (elite), 0.08 (pro), 0.12 (basic) from active captain_subscriptions.  
- **calculate_booking_amounts(booking_amount, captain_id)** – returns commission_amount, service_fee, captain_payout, customer_total using above + service_fee_rate from settings.

**Admin UI:**  
- **Revenue Analytics** – RevenueAnalyticsDashboard: reads bookings (total_amount, commission_amount, service_fee), captain_subscriptions, featured_listings for selected period (7/30/90 days); aggregates and displays.  
- **Commission Settings** – Loads platform_commission_rate and service_fee_rate from monetization_settings (displayed as %); saves back via upsert on Save. Example $500 breakdown shown.  
- **Subscription Plans** – PremiumSubscriptionPlans: shows Basic/Pro/Elite; subscribe flows to `/api/create-subscription` (Stripe). Active subscriptions and plan-based commission are used by get_captain_commission_rate when calculating booking amounts.

**Booking flow:** Payment/checkout code should call `calculate_booking_amounts` or equivalent logic and persist commission_amount, service_fee, captain_payout on the booking row. Stripe/subscription and featured listing payments need to be wired to create/update captain_subscriptions and featured_listings (e.g. Stripe webhooks or existing APIs).
