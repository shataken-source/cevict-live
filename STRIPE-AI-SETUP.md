# 🚀 SMOKERSRIGHTS SETUP

## 1. STRIPE INTEGRATION

### Get API Keys:
1. Go to: https://dashboard.stripe.com/register
2. Sign up / Sign in
3. Go to: Developers → API Keys
4. Copy:
   - **Secret key** (sk_test_...)
   - **Publishable key** (pk_test_...)

### Add to Vercel:
```bash
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Products to Sell:
- Premium Membership: $9.99/month
- Legal Consultation: $49.99
- Advocacy Donation: $25

### Stripe Dashboard:
- View payments: https://dashboard.stripe.com/payments
- Manage customers: https://dashboard.stripe.com/customers
- Set up webhooks: https://dashboard.stripe.com/webhooks

## 2. AI ASSISTANT

### Get Anthropic API Key:
1. Go to: https://console.anthropic.com
2. Sign up (free tier available)
3. Go to: API Keys
4. Create new key
5. Copy key (sk-ant-...)

### Add to Vercel:
```bash
vercel env add ANTHROPIC_API_KEY
```

### AI Features:
- State law lookup
- Product recommendations
- Legal resource help
- Fighting smoking bans
- 24/7 automated support

## 3. REVENUE STREAMS

### Affiliate Commissions:
- CBD products: 15-30%
- Vaping: 20-25%
- Accessories: 15-20%
- **Estimate:** $1K-$10K/month

### Stripe Products:
- Memberships: $9.99/month x 500 = $5K/month
- Consultations: $49.99 x 100 = $5K/month
- **Estimate:** $5K-$15K/month

### Total Potential:
**$6K-$25K/month**

## 4. LEGAL COMPLIANCE

✅ Age verification (21+)
✅ FTC affiliate disclosure
✅ State law warnings
✅ No medical claims
✅ Stripe Terms of Service compliant
✅ AI disclaimer (not legal advice)

## 5. INSTALL & DEPLOY
```bash
cd apps/smokersrights
pnpm install
pnpm build
vercel --prod
```

Then add env vars in Vercel dashboard.
