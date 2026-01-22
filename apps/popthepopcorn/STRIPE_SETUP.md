# Stripe Integration Setup - PopThePopcorn

## ✅ Implementation Complete

Stripe integration has been implemented for:
- ✅ Kernel Pack purchases (one-time payments)
- ✅ Season Pass subscriptions (recurring payments)
- ✅ Webhook handling for payment confirmations

---

## 📋 Setup Steps

### 1. Install Dependencies

```bash
cd apps/popthepopcorn
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Get Stripe API Keys

1. Go to: https://dashboard.stripe.com/
2. Create account or sign in
3. Go to: **Developers → API keys**
4. Copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

### 3. Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (or `pk_live_...` for production)
- `STRIPE_SECRET_KEY` = `sk_test_...` (or `sk_live_...` for production)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (see step 4)

### 4. Set Up Webhook

1. Go to: **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://www.popthepopcorn.com/api/stripe/webhook
   ```
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

### 5. Create Season Pass Price (Optional but Recommended)

1. Go to: **Stripe Dashboard → Products**
2. Click **"Add product"**
3. Name: "Drama Season Pass"
4. Price: $2.99/month (recurring)
5. Copy the **Price ID** (starts with `price_`)
6. Add to Vercel env vars as `STRIPE_SEASON_PASS_PRICE_ID`

**Note:** If not set, the system will create prices on-the-fly (works but not recommended for production).

---

## 🔧 API Routes Created

### `/api/stripe/create-payment-intent`
- **Method:** POST
- **Body:** `{ packId: string, userIdentifier: string }`
- **Returns:** `{ clientSecret: string, paymentIntentId: string }`
- **Purpose:** Creates payment intent for Kernel Pack purchase

### `/api/stripe/create-subscription`
- **Method:** POST
- **Body:** `{ userIdentifier: string, email: string }`
- **Returns:** `{ subscriptionId: string, clientSecret: string, status: string }`
- **Purpose:** Creates subscription for Season Pass

### `/api/stripe/webhook`
- **Method:** POST
- **Purpose:** Handles Stripe webhook events
- **Events:** Payment confirmations, subscription updates

---

## 🎨 Components

### `components/KernelShop.tsx`
- Full shop UI with Kernel Packs and Season Pass
- Stripe Elements integration for secure payments
- Balance display
- Purchase flow

**Usage:**
```tsx
import KernelShop from '@/components/KernelShop'

<KernelShop 
  userIdentifier="user_123" 
  onPurchaseComplete={() => console.log('Purchase complete!')}
/>
```

---

## 🧪 Testing

### Test Mode

1. Use test API keys (`pk_test_...` and `sk_test_...`)
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`
3. Use any future expiry date and any CVC

### Test Webhook Locally

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3003/api/stripe/webhook`
4. Copy webhook secret from CLI output
5. Use that secret in local `.env` file

---

## 🔒 Security Notes

- ✅ Never expose `STRIPE_SECRET_KEY` in client-side code
- ✅ Always verify webhook signatures
- ✅ Use HTTPS in production
- ✅ Validate payment amounts server-side
- ✅ Store payment metadata for audit trail

---

## 📊 Payment Flow

### Kernel Pack Purchase:
1. User selects pack → `create-payment-intent` API
2. Stripe Elements form displays
3. User enters payment details
4. Payment confirmed → Webhook fires
5. Webhook awards kernels to user
6. User balance updates

### Season Pass Subscription:
1. User clicks "Subscribe" → `create-subscription` API
2. Stripe Elements form displays
3. User enters payment details
4. Subscription created → Webhook fires
5. Webhook activates season pass
6. User gets benefits immediately

---

## 🐛 Troubleshooting

### "Stripe is not defined" Error

**Fix:** Make sure `stripe` package is installed:
```bash
npm install stripe
```

### Webhook Not Receiving Events

**Fix:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Test with Stripe CLI locally
4. Check Vercel logs for webhook errors

### Payment Intent Fails

**Fix:**
1. Check Stripe Dashboard → Payments for error details
2. Verify API keys are correct
3. Check amount is in cents (e.g., $0.99 = 99)
4. Verify currency is 'usd'

---

## ✅ Next Steps

1. ✅ Stripe integration complete
2. ⏳ Test with test cards
3. ⏳ Set up production keys
4. ⏳ Configure webhook in production
5. ⏳ Test full purchase flow
6. ⏳ Monitor Stripe Dashboard for transactions

---

**Last Updated:** After Priority 2 implementation
**Status:** Ready for testing
