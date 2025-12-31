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

## 🎯 GET YOUR KALSHI REFERRAL CODE

1. Go to https://kalshi.com
2. Log in to your account
3. Navigate to **Settings** → **Referrals**
4. Copy your referral code
5. Set it in `.env.local`:
   ```bash
   NEXT_PUBLIC_KALSHI_REFERRAL_CODE=YOUR_CODE
   ```
6. Restart Next.js server:
   ```bash
   cd apps/prognostication
   npm run dev
   ```

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

## 💰 REFERRAL COMMISSION TRACKING

Kalshi typically tracks:
- **Sign-ups** via your referral link
- **First deposits** from referred users
- **Trading volume** from referred users

Check your Kalshi dashboard for commission details.

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

