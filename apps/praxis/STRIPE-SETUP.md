# Stripe setup for Praxis

You have keys; you still need **prices**, **webhook**, and optionally a **coupon**. Put every value below into `.env.local` (and in Netlify → Environment variables).

**If checkout fails or wrong amount:** Check Stripe Dashboard → **Product catalog** → your products → **Prices**. Ensure the Price IDs in `.env.local` (`STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`) match the ones in Stripe (Test vs Live mode).

---

## 1. Env vars (checklist)

| Variable | Where it comes from | Required for |
|----------|---------------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (Secret key) | Checkout + webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same page (Publishable key) | Checkout button / client |
| `STRIPE_WEBHOOK_SECRET` | After creating webhook (step 3 below) | Webhook verification |
| `STRIPE_PRICE_ID_STARTER` | After creating Starter price (step 2) | Starter checkout ($9/mo) |
| `STRIPE_PRICE_ID_PRO` | After creating Pro price (step 2) | Pro checkout ($29/mo) |
| `STRIPE_PRICE_ID_ENTERPRISE` | After creating Enterprise price (step 2) | Enterprise checkout ($99/mo) |
| `STRIPE_COUPON_ID_POST_TRIAL` | After creating coupon (step 4) | 15% off when user upgrades after free trial |
| `NEXT_PUBLIC_APP_URL` | KeyVault: set **`NEXT_PUBLIC_APP_URL_PRAXIS`** in store (e.g. `http://localhost:3002`); manifest maps it to this var | OAuth redirects, webhooks |

**KeyVault (port 3002):** From `scripts\keyvault` run:  
`.\set-secret.ps1 -Name NEXT_PUBLIC_APP_URL_PRAXIS -Value "http://localhost:3002"`  
Then sync: `.\sync-env.ps1 -AppPath "C:\cevict-live\apps\praxis"`.

---

## 2. Create products and recurring prices (pricing)

1. Stripe Dashboard → **Product catalog** → **Add product** (create one product per tier).
2. **Starter** — $9/mo, 2 users
   - Name: `Praxis Starter`. Recurring, Monthly, **$9**. Copy Price ID → `STRIPE_PRICE_ID_STARTER`.
3. **Pro** — $29/mo, 5 users
   - Name: `Praxis Pro`. Recurring, Monthly, **$29**. Copy Price ID → `STRIPE_PRICE_ID_PRO`.
4. **Enterprise** — $99/mo, 10+ users
   - Name: `Praxis Enterprise`. Recurring, Monthly, **$99**. Copy Price ID → `STRIPE_PRICE_ID_ENTERPRISE`.

The app uses these three price IDs when the user clicks **Subscribe** on the pricing page for Starter, Pro, or Enterprise.

---

## 3. Webhook (so subscriptions are saved)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**
   - Local: use Stripe CLI (e.g. `stripe listen --forward-to localhost:3002/api/stripe/webhook`) and put the CLI’s signing secret in `STRIPE_WEBHOOK_SECRET`.
   - Production: `https://<your-praxis-domain>/api/stripe/webhook` (e.g. your Netlify URL).
3. **Events to send**: at least:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed` (optional, for logging)
4. After creating the endpoint, open it → **Reveal** signing secret → copy into `STRIPE_WEBHOOK_SECRET`.

Use one endpoint (and one secret) per environment (e.g. one for local with Stripe CLI, one for production).

---

## 4. (Optional) 15% off for post–trial upgrade

1. Stripe Dashboard → **Product catalog** → **Coupons** → **Create coupon**.
2. Type: **Percentage**, **15%** off; no expiry or limit if you want it reusable.
3. Copy the **Coupon ID** (e.g. `ABC123`) → `STRIPE_COUPON_ID_POST_TRIAL`.

The app applies this when the user has finished their free trial and clicks upgrade (post-trial discount).

---

## 5. Quick reference: what breaks if something is missing

- No `STRIPE_PRICE_ID_STARTER` / `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_ENTERPRISE`: “Plan or priceId required” when clicking a paid tier; checkout never starts.
- No `STRIPE_WEBHOOK_SECRET` or wrong URL: webhook returns 400; subscriptions won’t be stored, so users stay “free” after paying.
- No `STRIPE_COUPON_ID_POST_TRIAL`: checkout still works; post-trial users just don’t get the 15% off.

---

## 6. Test mode vs live

Use **Test mode** (toggle in Stripe Dashboard) while developing. Test keys start with `sk_test_` / `pk_test_`. When you go live, create **Products/Prices/Coupon/Webhook** again in **Live mode** and switch env vars to live keys and live price/coupon/webhook IDs.

---

## 7. Quick verify (local)

1. **Sync env** (if using KeyVault):  
   `cd C:\cevict-live\scripts\keyvault` then  
   `.\sync-env.ps1 -AppPath "C:\cevict-live\apps\praxis"`

2. **Required in `.env.local`** (min to open checkout):  
   `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`.  
   Optional: `STRIPE_WEBHOOK_SECRET` (for saving subscriptions after payment), `STRIPE_COUPON_ID_POST_TRIAL`, Supabase vars for persistence.

3. **Run app**: `cd apps\praxis` → `pnpm dev` (port 3002).

4. **Test**: Open `/pricing`, sign in (Clerk), click **Get started** on Pro or Enterprise. You should be redirected to Stripe Checkout.  
   - If you see "Plan or priceId required" → set `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_ENTERPRISE` in `.env.local` and restart.  
   - For webhook (subscription saved): use Stripe CLI `stripe listen --forward-to localhost:3002/api/stripe/webhook` and put the CLI secret in `STRIPE_WEBHOOK_SECRET`.
