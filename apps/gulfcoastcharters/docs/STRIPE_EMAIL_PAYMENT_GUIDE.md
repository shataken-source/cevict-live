# Stripe Payment Integration for Custom Email Purchases

## Overview
Complete Stripe payment processing for @gulfcoastcharters.com custom email purchases with checkout flow, webhooks, receipts, refunds, and payment history.

## Features Implemented

### 1. Stripe Checkout Flow
- **Component**: `StripeEmailCheckout.tsx`
- Secure Stripe Checkout Sessions
- Redirects to Stripe hosted payment page
- Success/cancel URL handling
- $25 one-time payment

### 2. Payment Confirmation Webhook
- **Function**: `stripe-webhook` (updated)
- Handles `checkout.session.completed` events
- Activates custom email on successful payment
- Sends email receipt via Brevo
- Updates database with payment info

### 3. Refund Processing
- **Function**: `stripe-refund-processor`
- Admin-initiated refunds
- Deactivates custom email
- Sends refund confirmation email
- Tracks refund status

### 4. Payment History
- **Component**: `PaymentHistory.tsx`
- View all past transactions
- Download invoices
- Payment status tracking

## Setup Instructions

### 1. Stripe Configuration
Already configured with existing secrets:
- `STRIPE_SECRET_KEY` ✓
- `STRIPE_WEBHOOK_SECRET` ✓
- `VITE_STRIPE_PUBLISHABLE_KEY` ✓

### 2. Webhook Endpoint
Configure in Stripe Dashboard:
```
URL: https://api.databasepad.com/functions/v1/stripe-webhook
Events: checkout.session.completed
```

### 3. Test Payment Flow
```bash
# Use Stripe test cards
4242 4242 4242 4242 - Success
4000 0000 0000 9995 - Declined
```

## Usage

### Customer Purchase Flow
1. User enters desired email prefix
2. Selects "Cash" payment method ($25)
3. Clicks "Purchase with Card"
4. Redirected to Stripe Checkout
5. Completes payment
6. Webhook activates email
7. Receipt sent automatically

### Points Purchase Flow
1. User selects "Points" (5,000 pts)
2. Processes via existing function
3. No Stripe involved

### Admin Refund Process
```javascript
await supabase.functions.invoke('stripe-refund-processor', {
  body: {
    sessionId: 'cs_xxx',
    reason: 'Customer request',
    emailAddress: 'user@gulfcoastcharters.com'
  }
});
```

## Integration Points

### CustomEmailPurchase Component
- Dual payment options (Stripe/Points)
- Opens StripeEmailCheckout modal for cash
- Handles success callback
- Updates UI on completion

### Database Updates
Payment tracked in `custom_emails` table:
- `payment_method`: 'stripe'
- `stripe_session_id`: Session ID
- `status`: 'active' after payment
- `activated_at`: Timestamp

## Email Receipts

Sent automatically via Brevo after payment:
- Purchase confirmation
- Email address details
- Payment amount & ID
- Activation notice

## Testing Checklist

- [ ] Cash payment completes successfully
- [ ] Points payment works (existing)
- [ ] Email activates after Stripe payment
- [ ] Receipt email received
- [ ] Payment history displays
- [ ] Refund processes correctly
- [ ] Webhook signature validates

## Production Deployment

1. Verify webhook endpoint in Stripe
2. Test with live mode cards
3. Monitor webhook logs
4. Check email delivery
5. Verify database updates

## Support & Troubleshooting

### Payment Not Processing
- Check Stripe webhook logs
- Verify secret keys configured
- Ensure webhook signature valid

### Email Not Activating
- Check webhook received event
- Verify database update query
- Check RLS policies

### Receipt Not Sent
- Verify BREVO_API_KEY set
- Check email template
- Monitor Brevo dashboard

## Security Notes

- All payments via Stripe hosted checkout
- No card data touches your servers
- Webhook signature verification required
- PCI compliance handled by Stripe
- Refunds admin-only via RLS policies

## Next Steps

1. Configure email forwarding infrastructure
2. Set up custom domain email routing
3. Add invoice PDF generation
4. Implement subscription renewals (optional)
5. Add payment analytics dashboard