# Monetization Strategy - The Kernel v1.0

## Overview
2026 Hybrid Monetization Model: Gamified micro-transactions + high-intent native partnerships

---

## 1. Gamified Micro-Transactions ("The Popcorn Economy")

### Virtual Currency: "Kernels"
- **Kernel Packs** (`lib/monetization.ts`)
  - Snack Pack: 10 Kernels for $0.99
  - Movie Night: 25 Kernels + 5 bonus for $1.99
  - Binge Bundle: 50 Kernels + 15 bonus for $3.99 (Most Popular)
  - Theater Box: 100 Kernels + 40 bonus for $6.99
  - Festival Pass: 250 Kernels + 125 bonus for $14.99

### Boost the Meter ("Salt the Story")
- Users spend Kernels to boost headline visibility
- 1 Kernel = 10% boost (1.1x multiplier)
- 5 Kernels = 50% boost (1.5x multiplier)
- 10 Kernels = 100% boost (2.0x multiplier)
- Maximum combined boost: 3.0x
- Boosts last 24 hours

### Mystery Flavors
- Micro-payments ($0.25) for exclusive content
- Types: leaked screenshots, off-the-record details, exclusive quotes
- Unlocks content not in main feed

### Battle Pass: Drama Season Pass
- **Price**: $2.99/month
- **Benefits**:
  - Exclusive badges and UI skins
  - Early access to Probability Reports
  - Daily check-in rewards (bonus Kernels)
  - Ad-free experience
  - Priority support
  - Custom "Squishy" button themes

---

## 2. High-Intent Native Partnerships

### Sponsored Probability Reports
- Brands sponsor high-traffic "Drama Meter" reports
- Native placement in probability calculator
- CPM-based pricing (cost per mille impressions)
- Tracks impressions and clicks for billing

### "Shop the Spill" Feature
- AI-extracted products from headlines
- Affiliate commerce integration
- Commission tracking (5-10% typical)
- Gen Z-friendly social commerce

---

## 3. Rewarded Content

### Watch-to-Unlock
- 15-second rewarded video ads
- Rewards:
  - 5 Kernels
  - Deep Dive content unlock
  - Mystery Flavor unlock
- Highest acceptance rate among non-paying users

---

## 4. Ethical Data & Insights (Future - B2B)

### Sentiment Dashboards
- Anonymized, aggregated "vibe data"
- Sold to brands/PR firms
- Example: "68% of Gen Z thinks this brand's apology is a 10 on the Drama Meter"

### Predictive Reports (B2B Pro Tier)
- Access to predictive AI
- Shows which stories likely to go viral
- Based on early user "Kernel" activity
- For journalists and marketers

---

## 5. Implementation Files

### Core Monetization
- `lib/monetization.ts` - Kernel packs, boosts, season pass
- `lib/rewarded-video.ts` - Watch-to-unlock system
- `lib/affiliate-commerce.ts` - "Shop the Spill" integration
- `lib/sponsored-content.ts` - Sponsored reports system

### UI Components
- `components/KernelShop.tsx` - Kernel pack purchase UI
- `components/BoostButton.tsx` - "Salt the Story" button
- `components/ShopTheSpill.tsx` - Affiliate product display
- `components/RewardedVideoButton.tsx` - Watch ad button

### Database Schema
- `story_boosts` table - Tracks headline boosts
- `sponsored_reports` table - Sponsored content
- `sponsored_impressions` table - Impression tracking
- `sponsored_clicks` table - Click tracking

---

## 6. Payment Integration (TODO)

### Required Integrations
- [ ] Stripe for Kernel pack purchases
- [ ] Stripe Subscriptions for Season Pass
- [ ] Ad network SDK for rewarded videos (Google Ads, Unity Ads, AppLovin)
- [ ] Affiliate network API (Amazon Associates, ShareASale, etc.)

### Environment Variables Needed
```
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_ADS_APP_ID=...
UNITY_ADS_GAME_ID=...
AFFILIATE_API_KEY=...
```

---

## 7. 2026 KPIs

### Conversion Velocity
- Track time from first visit to first Kernel purchase
- Target: < 24 hours for 5% of users

### Revenue Diversification Ratio
- Ensure no single source > 40% of revenue
- Target mix:
  - Kernel packs: 30-35%
  - Season Pass: 25-30%
  - Sponsored content: 20-25%
  - Affiliate commerce: 10-15%
  - Rewarded videos: 5-10%

### User Lifetime Value (LTV)
- Track average revenue per user (ARPU)
- Track repeat purchase rate
- Target: $5-10 LTV in first 90 days

---

## 8. Legal Compliance

### Already Implemented
- ✅ Virtual currency transaction tracking (IRS Form 1099-DA)
- ✅ Age-gating for purchases (minors require parental consent)
- ✅ Privacy settings for minors

### Additional Requirements
- [ ] Terms of Service for in-app purchases
- [ ] Refund policy for Season Pass
- [ ] Affiliate disclosure on "Shop the Spill"
- [ ] Sponsored content labeling (FTC compliance)

---

## 9. Next Steps

1. **Payment Integration**: Integrate Stripe for purchases
2. **Ad Network**: Integrate rewarded video SDK
3. **Affiliate Network**: Connect to affiliate APIs
4. **Analytics**: Set up revenue tracking dashboard
5. **A/B Testing**: Test pricing and pack configurations
6. **B2B Features**: Build sentiment dashboard and predictive reports

---

**Last Updated**: January 2026
**Version**: 1.0.0
