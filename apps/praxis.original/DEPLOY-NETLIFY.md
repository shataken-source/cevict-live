# Deploy Praxis to Netlify

## 1. Push code

Ensure `apps/praxis.original` (and `netlify.toml` inside it) is in your repo and pushed.

## 2. Create site on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
2. Connect your Git provider (GitHub/GitLab/Bitbucket) and choose the **cevict-live** repo.
3. **Build settings:**
   - **Base directory:** `apps/praxis.original`
   - **Build command:** `npm run build` (or leave default; Netlify will use the plugin.)
   - **Publish directory:** leave empty (Next.js plugin sets it).

4. Click **Deploy site**. First deploy may fail until env vars are set.

## 3. Environment variables

In Netlify: **Site configuration** → **Environment variables** → **Add variable** / **Import from .env**.

Add the same vars you use locally (from `.env.local`), at least:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
- `ANTHROPIC_API_KEY` (if you use AI Insights)
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, etc. (if you use Pricing)
- `NEXT_PUBLIC_APP_URL` = `https://<your-netlify-site-name>.netlify.app` (or your custom domain)

Then **Trigger deploy** → **Clear cache and deploy site**.

## 4. Clerk and Stripe (production URLs)

- **Clerk:** In Clerk Dashboard, add your Netlify URL (and custom domain if you add one) to allowed origins/redirect URLs.
- **Stripe:** In Stripe Dashboard → Webhooks, add endpoint `https://<your-netlify-site>.netlify.app/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET` in Netlify to the new signing secret.

## 5. Custom domain (optional)

In Netlify: **Domain management** → **Add custom domain** (e.g. `praxis.cevict.ai`). Point DNS as Netlify instructs.

---

When Vercel is fixed, you can deploy the same repo to Vercel; the app already has `vercel.json`. Use Netlify for now.
