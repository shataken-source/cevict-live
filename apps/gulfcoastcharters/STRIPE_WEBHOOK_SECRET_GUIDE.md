# How to Get Your Stripe Webhook Secret

## 🎯 Quick Answer

The webhook secret (`whsec_...`) comes from **one of two places** depending on how you're testing:

---

## Option 1: Local Testing with Stripe CLI (Recommended for Development)

### Step 1: Install Stripe CLI
Download from: https://stripe.com/docs/stripe-cli

### Step 2: Login
```bash
stripe login
```

### Step 3: Forward Webhooks to Your Local Supabase
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### Step 4: Copy the Webhook Secret
When you run `stripe listen`, it will output something like:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

**Copy that `whsec_...` value** - that's your webhook secret for local testing!

### Step 5: Add to Supabase Secrets
```bash
cd apps/gulfcoastcharters
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

---

## Option 2: Create Webhook in Stripe Dashboard (For Production/Testing)

### Step 1: Go to Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**

### Step 2: Configure Endpoint
- **Endpoint URL:** `https://[your-project].supabase.co/functions/v1/stripe-webhook`
  - Replace `[your-project]` with your actual Supabase project reference
  - Example: `https://abcdefghijklmnop.supabase.co/functions/v1/stripe-webhook`

### Step 3: Select Events
Select these events:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.refunded` (optional, for refunds)

### Step 4: Get the Signing Secret
1. After creating the endpoint, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** or **"Copy"**
4. Copy the `whsec_...` value

### Step 5: Add to Supabase Secrets
```bash
cd apps/gulfcoastcharters
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

---

## 🔑 Your Test Keys

Based on what you shared:

**Test Secret Key:**
```
sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq
```

**Test Publishable Key:**
(Get this from: https://dashboard.stripe.com/test/apikeys)
- Should start with `pk_test_...`

**Webhook Secret:**
- Get from Stripe CLI (`stripe listen`) OR
- Get from Stripe Dashboard webhook endpoint
- Will start with `whsec_...`

---

## 📝 Quick Setup Commands

Once you have all three keys:

```powershell
# Add to vault
cd c:\cevict-live\scripts\keyvault
.\set-secret.ps1 -Name "STRIPE_SECRET_KEY" -Value "sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq"
.\set-secret.ps1 -Name "STRIPE_WEBHOOK_SECRET" -Value "whsec_YOUR_WEBHOOK_SECRET_HERE"
.\set-secret.ps1 -Name "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" -Value "pk_test_YOUR_PUBLISHABLE_KEY_HERE"

# Add to Supabase Edge Functions secrets
cd c:\cevict-live\apps\gulfcoastcharters
supabase secrets set STRIPE_SECRET_KEY=sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
supabase secrets set SITE_URL=http://localhost:3000

# Add to .env.local (for Next.js API routes)
# Edit apps/gulfcoastcharters/.env.local and add:
# STRIPE_SECRET_KEY=sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq
```

---

## 🧪 Testing Workflow

### For Local Development:
1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **In another terminal, forward Stripe webhooks:**
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```
   (Copy the `whsec_...` from the output)

3. **Deploy edge functions:**
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   ```

4. **Test a payment** using test card `4242 4242 4242 4242`

### For Production Testing:
1. **Create webhook endpoint in Stripe Dashboard**
2. **Get the `whsec_...` signing secret**
3. **Add to Supabase secrets**
4. **Deploy edge functions**
5. **Test with test card**

---

## ⚠️ Important Notes

1. **Different secrets for test vs live:**
   - Test webhook secret: from test mode webhook
   - Live webhook secret: from live mode webhook
   - **Never mix them!**

2. **Webhook secret is per endpoint:**
   - Each webhook endpoint has its own unique secret
   - If you create a new endpoint, you get a new secret
   - Old secrets stop working if you delete the endpoint

3. **Local vs Production:**
   - **Local:** Use Stripe CLI secret (changes each time you run `stripe listen`)
   - **Production:** Use Dashboard secret (stays the same until you recreate endpoint)

---

## ✅ Checklist

- [ ] Stripe CLI installed (for local testing)
- [ ] Test secret key obtained: `sk_test_51...`
- [ ] Test publishable key obtained: `pk_test_51...` (from Dashboard)
- [ ] Webhook secret obtained: `whsec_...` (from CLI or Dashboard)
- [ ] All keys added to vault
- [ ] Keys added to Supabase Edge Functions secrets
- [ ] Keys added to `.env.local`
- [ ] Webhook endpoint created in Stripe Dashboard (for production)
- [ ] Edge functions deployed
- [ ] Test payment successful

---

**You're almost there! The webhook secret is the last piece.** 🎉
