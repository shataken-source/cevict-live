# Stripe Payment Integration Guide

## Overview
Complete Stripe payment integration for charter bookings with secure checkout, payment tracking, and confirmation emails.

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

The following are already configured as secrets:
- `STRIPE_SECRET_KEY` - For backend payment processing
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `VITE_STRIPE_PUBLISHABLE_KEY` - For frontend Stripe Elements

### 2. Database Tables
The following tables have been created:
- `bookings` - Stores charter booking information
- `payments` - Stores Stripe payment records

### 3. Edge Functions
- **stripe-checkout** - Creates payment intents
- **stripe-webhook** - Handles payment success events

## Features Implemented

### 1. Secure Checkout Flow
- Stripe Elements integration for PCI compliance
- Payment intent creation with metadata
- Real-time payment processing
- Error handling and user feedback

### 2. Booking Management
- Booking details collection (date, guests, trip type)
- Price calculation (half-day vs full-day)
- Special requests field
- Booking confirmation on payment success

### 3. Payment Records
- All payments stored in database
- Stripe payment intent ID tracking
- Receipt URL storage
- Payment status tracking

### 4. Payment History
- User-specific payment history page at `/payment-history`
- View all past transactions
- Download receipts
- Booking ID references

### 5. Email Notifications
- Automatic confirmation emails after successful payment
- Booking details included
- Triggered via webhook

## Usage

### For Users
1. Click "Book Now" on any charter card
2. Select booking date and trip type
3. Enter number of guests and special requests
4. Click "Continue to Payment"
5. Enter payment details securely via Stripe
6. Receive confirmation email
7. View payment history at `/payment-history`

### For Developers

#### Creating a Payment Intent
```typescript
const { data } = await supabase.functions.invoke('stripe-checkout', {
  body: {
    bookingData: {
      charterId: 'charter-123',
      bookingDate: '2025-12-01',
      bookingType: 'full-day',
      numGuests: 4,
      totalAmount: 50000 // Amount in cents
    },
    userId: user.id
  }
});
```

#### Handling Webhooks
The webhook automatically:
1. Creates booking record
2. Creates payment record
3. Sends confirmation email

## Testing

### Test Cards
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Webhook Testing
1. Install Stripe CLI
2. Run: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
3. Copy webhook signing secret to environment

## Security

- Payment processing happens server-side
- PCI compliance via Stripe Elements
- Row Level Security on database tables
- Webhook signature verification
- User authentication required

## Next Steps

1. Configure production Stripe keys
2. Set up webhook endpoint in Stripe Dashboard
3. Test payment flow end-to-end
4. Monitor payments in Stripe Dashboard
5. Set up refund handling if needed