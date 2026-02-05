# Custom Email Subscription System Guide

## Overview
Users can now subscribe to premium email plans with monthly/yearly billing, multiple aliases, priority support, and custom forwarding rules.

## Subscription Plans

### Basic (Free)
- 1 custom email
- Standard support
- Basic forwarding

### Pro ($9.99/month or $99/year)
- 1 custom email
- 3 email aliases
- Priority support
- Custom forwarding rules

### Premium ($19.99/month or $199/year)
- 1 custom email
- 10 email aliases
- Priority support
- Advanced forwarding
- Email analytics

## Components Created

1. **EmailSubscriptionPlans** - Displays plan options with monthly/yearly toggle
2. **SubscriptionManager** - Manages active subscriptions, upgrades, downgrades, cancellations

## Edge Functions Updated

1. **stripe-checkout** - Handles subscription creation with recurring billing
2. **stripe-webhook** - Processes subscription events (created, updated, cancelled)
3. **subscription-renewal-reminders** - Sends reminders 7 days before renewal

## Setup Instructions

### 1. Configure Stripe Products
Create products in Stripe Dashboard for:
- Pro Monthly ($9.99/month)
- Pro Yearly ($99/year)
- Premium Monthly ($19.99/month)
- Premium Yearly ($199/year)

### 2. Set Up Webhook Events
Configure Stripe webhook to listen for:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`

### 3. Schedule Renewal Reminders
Set up cron job to run daily:
```bash
curl -X POST https://api.databasepad.com/functions/v1/subscription-renewal-reminders
```

### 4. Integration Points

**In CustomerDashboard:**
```tsx
import SubscriptionManager from '@/components/SubscriptionManager';

// In Profile tab
{customEmail && (
  <SubscriptionManager customEmailId={customEmail.id} />
)}
```

**In CaptainDashboard:**
```tsx
import SubscriptionManager from '@/components/SubscriptionManager';

// In Documents/Settings tab
{customEmail && (
  <SubscriptionManager customEmailId={customEmail.id} />
)}
```

## User Flow

1. User purchases custom email (one-time $25 or 5,000 points)
2. User sees subscription upgrade options in dashboard
3. User selects plan (Pro/Premium) and billing cycle
4. Stripe Checkout opens for payment
5. Webhook activates subscription and sends confirmation
6. User can manage aliases, forwarding rules based on plan
7. System sends renewal reminder 7 days before expiration
8. User can upgrade, downgrade, or cancel anytime

## Features by Plan

### Alias Management
- Pro: Create up to 3 aliases (e.g., sales@, support@, info@)
- Premium: Create up to 10 aliases
- All forward to main email or custom addresses

### Priority Support
- Faster response times
- Dedicated support channel
- Phone support for Premium

### Custom Forwarding
- Set rules based on sender, subject, keywords
- Forward to multiple addresses
- Auto-reply rules

## Cancellation Policy
- Cancellations take effect at end of billing period
- User retains access until period ends
- Can reactivate before period ends
- Downgrades to Basic plan after cancellation

## Testing

1. Test subscription creation with test card (4242 4242 4242 4242)
2. Verify webhook processes subscription.created event
3. Check email confirmation sent
4. Test upgrade/downgrade flows
5. Test cancellation and reactivation
6. Verify renewal reminders sent 7 days before expiration

## Admin Features

Admins can:
- View all active subscriptions
- Grant free upgrades for promotions
- Cancel/refund subscriptions
- View subscription revenue analytics

## Future Enhancements

1. Email analytics dashboard
2. Advanced filtering rules
3. Email templates
4. Auto-responders
5. Email forwarding logs
6. Spam filtering controls
