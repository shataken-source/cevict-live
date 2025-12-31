# Prognostication Environment Variables - Complete List with Values

## 📍 File Locations

**Main documentation files:**
- `ENV_VARS_CHECKLIST.md` (root) - Has values and which app
- `VERCEL_ENV_VARS_COPY.md` (root) - Has values ready to copy
- `DISTRIBUTE_KEYS.ps1` (root) - Has all master keys
- `apps/prognostication/ENV_VARS_REQUIRED.md` - This file (descriptions only)

---

## ✅ PROGNOSTICATION Environment Variables

### Stripe Payment Processing

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq` | **Prognostication** | ✅ Found in `DISTRIBUTE_KEYS.ps1` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_51STl4a18sNHY3ux6bXxWbRti6senllwMD7cotvuw1jYSdq7R8SUf4TstSWnlUIc5hMkGTkCFGQ1EpiPDEL2A51Wb007ve9cFL2` | **Prognostication** | ✅ Found in `DISTRIBUTE_KEYS.ps1` |
| `NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID` | `price_1ShEH018sNHY3ux6QlOjdb8z` | **Prognostication** | ✅ Created (from `ENV_VARS_CHECKLIST.md`) |
| `NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID` | `price_1ShEIC18sNHY3ux6Wf9FUX0W` | **Prognostication** | ✅ Created (from `ENV_VARS_CHECKLIST.md`) |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` | `price_1ShDtF18sNHY3ux6uxm5aUxx` | **Prognostication** | ✅ Created (from `ENV_VARS_CHECKLIST.md`) |
| `NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID` | `price_1ShDvB18sNHY3ux6qYcWxcsU` | **Prognostication** | ✅ Created (from `ENV_VARS_CHECKLIST.md`) |

**Source:** `DISTRIBUTE_KEYS.ps1` (lines 11-12) and `ENV_VARS_CHECKLIST.md` (lines 56-59)

---

### PROGNO Integration

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `PROGNO_BASE_URL` | `https://progno.vercel.app` (or your PROGNO deployment URL) | **Prognostication** | ⚠️ Set your actual PROGNO URL |
| `NEXT_PUBLIC_PROGNO_BASE_URL` | `https://progno.vercel.app` (optional, for client-side) | **Prognostication** | ⚠️ Set your actual PROGNO URL |

**Note:** If not set, picks page will show empty picks instead of live picks from PROGNO.

---

### SMS Alerts (Sinch)

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `SINCH_SERVICE_PLAN_ID` | `5ead1f97ab94481c80d3a52e13de95bb` | **Prognostication** | ✅ Found in `ENV_VARS_CHECKLIST.md` |
| `SINCH_API_TOKEN` | `78f84e980220406892c2cfccf515e755` | **Prognostication** | ✅ Found in `ENV_VARS_CHECKLIST.md` |
| `SINCH_FROM_NUMBER` | `+12085812971` | **Prognostication** | ✅ Found in `ENV_VARS_CHECKLIST.md` |
| `SINCH_FROM` | `+12085812971` (alternative name) | **Prognostication** | ✅ Found in `ENV_VARS_CHECKLIST.md` |

**Source:** `ENV_VARS_CHECKLIST.md` (lines 10-15)

---

### Application URLs

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `NEXT_PUBLIC_BASE_URL` | `https://prognostication.com` | **Prognostication** | ⚠️ Set your production URL |
| `NEXT_PUBLIC_APP_URL` | `https://prognostication.com` (optional) | **Prognostication** | ⚠️ Set your production URL |

---

### Supabase (Optional - if using database features)

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rdbuwyefbgnbuhmjrizo.supabase.co` | **Prognostication** | ✅ Found in `DISTRIBUTE_KEYS.ps1` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (truncated) | **Prognostication** | ⚠️ Get from Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (truncated) | **Prognostication** | ⚠️ Get from Supabase Dashboard |

**Source:** `DISTRIBUTE_KEYS.ps1` (line 41)

---

### Google AdSense (Optional)

| Variable Name | Value | App | Status |
|--------------|-------|-----|--------|
| `NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID` | `ca-pub-0940073536675562` | **Prognostication** | ✅ Already in code |

---

## 📋 Quick Copy for Vercel

### Critical (Required for Payments)
```
STRIPE_SECRET_KEY=sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51STl4a18sNHY3ux6bXxWbRti6senllwMD7cotvuw1jYSdq7R8SUf4TstSWnlUIc5hMkGTkCFGQ1EpiPDEL2A51Wb007ve9cFL2
NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID=price_1ShEH018sNHY3ux6QlOjdb8z
NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID=price_1ShEIC18sNHY3ux6Wf9FUX0W
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_1ShDtF18sNHY3ux6uxm5aUxx
NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID=price_1ShDvB18sNHY3ux6qYcWxcsU
NEXT_PUBLIC_BASE_URL=https://prognostication.com
PROGNO_BASE_URL=https://progno.vercel.app
```

### SMS Alerts (Optional but Recommended)
```
SINCH_SERVICE_PLAN_ID=5ead1f97ab94481c80d3a52e13de95bb
SINCH_API_TOKEN=78f84e980220406892c2cfccf515e755
SINCH_FROM_NUMBER=+12085812971
```

---

## 📁 Source Files

1. **`ENV_VARS_CHECKLIST.md`** (root directory)
   - Path: `C:\gcc\cevict-app\cevict-monorepo\ENV_VARS_CHECKLIST.md`
   - Contains: All env vars with values, organized by app

2. **`VERCEL_ENV_VARS_COPY.md`** (root directory)
   - Path: `C:\gcc\cevict-app\cevict-monorepo\VERCEL_ENV_VARS_COPY.md`
   - Contains: Ready-to-copy values for Vercel

3. **`DISTRIBUTE_KEYS.ps1`** (root directory)
   - Path: `C:\gcc\cevict-app\cevict-monorepo\DISTRIBUTE_KEYS.ps1`
   - Contains: Master list of all API keys

4. **`apps/prognostication/ENV_VARS_REQUIRED.md`**
   - Path: `C:\gcc\cevict-app\cevict-monorepo\apps\prognostication\ENV_VARS_REQUIRED.md`
   - Contains: Descriptions and setup instructions (no values)

---

## 🎯 Where to Add in Vercel

1. Go to: **Vercel Dashboard** → **Prognostication Project** → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Paste each variable name and value from above
4. Select: **Production, Preview, Development** (all three)
5. Click **"Save"**
6. **Redeploy** after adding variables

---

## ✅ Verification

After adding variables, verify they're loaded:
```bash
# Visit in browser:
https://prognostication.com/api/checkout/validate
```

This endpoint shows which variables are configured and which are missing.

