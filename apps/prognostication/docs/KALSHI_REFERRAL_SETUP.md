# KALSHI REFERRAL LINK CONFIGURATION

## ✅ IMPLEMENTED FEATURES

### **1. Clickable Probability**
- Users can click on the **PROB: X%** field to go directly to Kalshi
- Opens in new tab with your referral code automatically attached
- Hover effect shows it's clickable (underline + scale animation)

### **2. "BET NOW ON KALSHI" Button**
- Prominent button on each pick card
- Shows referral code being used (transparency for users)
- Gradient green-to-cyan design with hover effects
- Opens Kalshi market page or homepage with referral

### **3. Referral Code Management**

#### **Default Referral Code**: `CEVICT2025`

#### **To Set Your Own Referral Code:**

**Option 1: Environment Variable (Recommended)**
```bash
# In your .env.local file
NEXT_PUBLIC_KALSHI_REFERRAL_CODE=YOUR_CODE_HERE
```

**Option 2: Update Default in Code**
In `apps/prognostication/app/page.tsx` line ~308:
```typescript
const kalshiReferralCode = process.env.NEXT_PUBLIC_KALSHI_REFERRAL_CODE || 'YOUR_CODE_HERE';
```

### **4. Referral Link Format**

**With Market ID (Preferred):**
```
https://kalshi.com/markets/MARKET-ID?referral=CEVICT2025
```

**Without Market ID (Fallback):**
```
https://kalshi.com?referral=CEVICT2025
```

### **5. Analytics Tracking (Optional)**

The code includes Google Analytics event tracking:
```typescript
gtag('event', 'kalshi_referral_click', {
  market_id: pick.marketId,
  pick_side: pick.pick,
  edge: pick.edge,
  referral_code: kalshiReferralCode
});
```

To enable, add your GA Measurement ID:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 📊 HOW IT WORKS

### **User Flow:**
1. User sees pick on Prognostication homepage
2. User clicks **PROB: 72%** or **🎯 BET NOW ON KALSHI** button
3. Opens Kalshi in new tab: `https://kalshi.com/markets/NFL-KC-WIN?referral=CEVICT2025`
4. User signs up or logs in (your referral code is tracked)
5. User places bet → You get referral credit!

### **Where Market IDs Come From:**
Market IDs are populated by the alpha-hunter bot when it syncs picks:

In `apps/alpha-hunter/src/intelligence/prognostication-sync.ts`:
```typescript
const picks = opportunities.map(opp => ({
  marketId: opp.marketId, // ← Kalshi ticker/ID
  market: opp.title,
  pick: opp.side,
  // ... rest
}));
```

---

## 💰 KALSHI REFERRAL PROGRAM DETAILS

### **Current Program (As of Dec 2024):**

**Standard Referral Bonus:**
- **$10 bonus** for you when referred user completes requirements
- **$10 bonus** for the referred user
- **No cap** on number of referrals

**Requirements for Referral to Count:**

1. **Your Requirements (To Get Referral Link):**
   - Make minimum deposit
   - Complete at least **$100 in trades** (cumulative)
   - Referral link appears in account settings once qualified

2. **Referred User Requirements:**
   - Sign up using your referral link/code
   - Verify identity
   - Fund account
   - Complete **$100 in trades** within **30 days**

**Where to Find Your Referral Code:**
- Kalshi App: Top-left menu → "Referrals" or "Add funds"
- Account Settings → Referrals section

### **⚠️ IMPORTANT: No Percentage-Based Commission**

Kalshi does **NOT currently offer**:
- ❌ Percentage of trading volume
- ❌ Revenue share on referred users' trades
- ❌ Ongoing passive income from referrals
- ❌ Affiliate program for content creators

**What You Get:**
- ✅ Flat $10 per qualified referral (unlimited referrals)
- ✅ One-time bonus when user completes $100 in trades

### **Alternative Revenue Models:**

**If You Want Percentage-Based Income:**
- **KalshiAI** (third-party platform) offers 30% affiliate commission on subscriptions
- Consider building a subscription service around your Kalshi picks
- Charge for premium picks/analysis (like Prognostication Premium)

**Calculation Example:**
- 100 qualified referrals = **$1,000 in bonuses**
- But each referral only pays once (not recurring)

### **Recommendation for Prognostication:**

**Current Implementation:**
- ✅ You're using the standard Kalshi referral program
- ✅ Every user who clicks through gets your referral code
- ✅ If they complete $100 in trades, you get $10

**To Maximize Revenue:**
1. **Drive Volume:** More users clicking = more potential $10 bonuses
2. **Add Premium Tier:** Charge for advanced picks (recurring revenue)
3. **Email List:** Capture emails, nurture, convert to paying subscribers
4. **Affiliate Stack:** Promote complementary tools (KalshiAI, charting tools)

**Realistic Expectations:**
- 1,000 visitors/month
- 5% click-through to Kalshi (50 people)
- 10% complete $100 in trades (5 people)
- **= $50/month in referral bonuses**

**Better Model:**
- Same 1,000 visitors
- 2% convert to $20/month premium subscription (20 people)
- **= $400/month recurring revenue** 💰

---

## 🎯 NEXT STEPS TO QUALIFY FOR KALSHI REFERRALS

### **Step 1: Complete Your Own Requirements**
```bash
1. Sign up at https://kalshi.com
2. Verify your identity (KYC)
3. Make a deposit (minimum required)
4. Complete $100 in trades (cumulative):
   - Can be one $100 trade
   - Or multiple smaller trades that add up to $100+
```

### **Step 2: Get Your Referral Code**
```bash
1. Open Kalshi app
2. Click top-left menu (≡)
3. Go to "Referrals" or "Add funds"
4. Copy your unique referral code
```

### **Step 3: Configure Prognostication**
```bash
# In your .env.local file
NEXT_PUBLIC_KALSHI_REFERRAL_CODE=YOUR_ACTUAL_CODE

# Then restart:
cd apps/prognostication
npm run dev
```

### **Step 4: Track Your Referrals**
```bash
# Check Kalshi dashboard:
- Number of referrals
- Pending bonuses (users still completing $100)
- Earned bonuses (users completed requirements)
```

---

## 💡 ALTERNATIVE MONETIZATION STRATEGIES

Since Kalshi only offers flat $10 bonuses (not percentage-based), consider these strategies for **sustainable revenue**:

### **1. Premium Subscription Model** (Recommended)
- Free tier: Basic picks (what's shown now)
- Premium tier: $20-50/month
  - More frequent picks
  - Higher confidence threshold
  - SMS alerts
  - Discord community
  - Live pick notifications

**Revenue:** $400-1,000/month with 20-50 subscribers

### **2. Parlay Builder Tool**
- Charge $10-20/month for access to parlay builder
- Shows optimal bet combinations
- Risk/reward calculator
- Includes Kalshi referral links

### **3. Educational Content**
- Sell a course: "Kalshi Trading 101" ($99)
- PDF guide: "Prediction Market Strategies" ($29)
- Include your referral link in materials

### **4. Affiliate Stack**
- KalshiAI: 30% of subscription revenue (12 months)
- Trading tools: TradingView, etc.
- Analytics platforms: Google Analytics Pro, etc.

### **5. Email List Monetization**
- Build email list with free picks
- Nurture with education
- Upsell to premium tier
- Promote affiliate products

**Example Combined Revenue:**
- Kalshi referrals: $50/month
- Premium subscriptions (30 users × $30): $900/month
- KalshiAI affiliates (10 users × $20 × 30%): $60/month
- **Total: ~$1,000/month**

---

## 📊 TRACKING & OPTIMIZATION

### **Metrics to Track:**
```typescript
// Add to your analytics
- Referral link clicks
- Click-through rate (CTR)
- Conversion to Kalshi sign-ups
- Qualified referrals (completed $100)
- Revenue per visitor
- Premium conversion rate
```

### **A/B Testing Ideas:**
- Button text: "BET NOW" vs "PLACE BET" vs "TRADE NOW"
- Button color: Green vs Cyan vs Purple
- Referral code display: Show vs Hide
- Placement: Top vs Bottom of card
- Call-to-action: Urgency vs Educational

---

## 🔍 VERIFICATION

### **Check Referral Links Are Working:**
1. Run Prognostication: `cd apps/prognostication && npm run dev`
2. Open http://localhost:3002
3. Inspect any pick card
4. Hover over **PROB: X%** → Should see underline and cursor pointer
5. Click **BET NOW** button → Should open Kalshi with `?referral=YOUR_CODE`

### **Check Referral Code Display:**
Look for: "Using referral code: CEVICT2025" below the BET NOW button

---

## 🚀 DEPLOYED!

All changes committed to:
- `apps/prognostication/app/page.tsx`

**Changes Made:**
1. ✅ Referral code configurable via `NEXT_PUBLIC_KALSHI_REFERRAL_CODE`
2. ✅ Probability field clickable (takes user to Kalshi)
3. ✅ BET NOW button shows referral code
4. ✅ Analytics tracking for referral clicks
5. ✅ Hover effects and visual feedback
6. ✅ Opens in new tab (preserves Prognostication session)

**Status:** Ready for deployment! 🎯

---

## 📝 IMPORTANT DISCLAIMERS

1. **Complete $100 in trades yourself** before your referral link activates
2. **Flat $10 bonus only** - not percentage of trading volume
3. **One-time payout** per qualified referral (not recurring)
4. **30-day window** for referred users to complete requirements
5. **Consider premium subscription** for recurring revenue model

**Bottom Line:** Kalshi referrals are great for getting started, but **premium subscriptions** will be your main revenue driver long-term.
