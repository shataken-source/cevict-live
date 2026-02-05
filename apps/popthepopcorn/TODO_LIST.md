# 📋 Todo List - PopThePopcorn & SmokersRights

## 🔥 Priority 1: Immediate Fixes (Do First)

### PopThePopcorn
- [ ] **Trigger scraper to populate headlines**
  - Visit `/admin` or wait 5 min for cron
  - Verify headlines appear on homepage
  
- [ ] **Verify environment variables in Vercel**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PERPLEXITY_API_KEY` (optional)
  - `SINCH_API_KEY` (optional)
  - `CRON_SECRET` (optional)

- [ ] **Review and fix build errors**
  - Check Vercel build logs
  - Fix 3 errors and 18 warnings
  - Most are likely TypeScript warnings (non-blocking)

- [ ] **Verify RLS policies in Supabase**
  - Run `supabase/rls-policies.sql` if not already done
  - Test public read access: `SELECT * FROM headlines LIMIT 1;`

- [ ] **Test all new features**
  - Age gate (2026 compliance)
  - AI transparency labels
  - Reactions (🔥, 😂, 😱, etc.)
  - Keyboard shortcuts (press 'B' for Binge Mode)
  - Source trace (Receipts)
  - Monetization features

---

## 🚀 Priority 2: Core Features (This Week)

### PopThePopcorn
- [ ] **Integrate Stripe for monetization**
  - Kernel pack purchases
  - Season Pass subscriptions
  - Payment processing

- [ ] **Move virtual currency to database**
  - Replace localStorage with Supabase
  - Store user balances, transactions
  - Sync across devices

- [ ] **Make age verification persistent**
  - Store in database, not just sessionStorage
  - Link to user account (if auth added)

### SmokersRights
- [ ] **Build out 50 state guides**
  - Comprehensive legal info for each state
  - State-specific laws and regulations
  - City-level guides for top 20 cities

- [ ] **Create travel guide content**
  - Domestic travel policies
  - International travel restrictions
  - Hotel and rental car policies

- [ ] **Add workplace rights breakdown**
  - State-by-state employee rights
  - Tenant rights by state
  - Legal resources and contacts

---

## 💰 Priority 3: Monetization (Next 2 Weeks)

### SmokersRights
- [ ] **Set up Stripe for premium subscription**
  - $9.99/month subscription
  - Payment processing
  - Subscription management

- [ ] **Integrate email service**
  - SendGrid or Resend
  - PDF delivery for free guide
  - Weekly update emails

- [ ] **Generate PDF guide programmatically**
  - 50-state legal guide
  - Auto-update when laws change
  - Downloadable format

### PopThePopcorn
- [ ] **Integrate ad network SDKs**
  - Rewarded video ads
  - Banner ads (optional)
  - Ad revenue tracking

- [ ] **Connect to affiliate network APIs**
  - "Shop the Spill" feature
  - Product extraction from headlines
  - Affiliate link tracking

---

## 🎨 Priority 4: Advanced Features (Next Month)

### PopThePopcorn
- [ ] **Implement "POV" News**
  - Multi-perspective AI avatars
  - Different viewpoints on same story
  - Interactive perspective switching

- [ ] **Implement "Rabbit Hole" Button**
  - AI-driven discovery feature
  - Related stories and deep dives
  - Story arc connections

- [ ] **Implement "Proof of Human"**
  - Verified human eyewitnesses
  - Worldcoin/Privy integration
  - Human verification badges

- [ ] **Build B2B dashboards**
  - Sentiment analysis dashboards
  - Predictive reports
  - API access for enterprise

### SmokersRights
- [ ] **Enhance automated law update bot**
  - Content generation
  - Automatic updates when laws change
  - Notification system

- [ ] **Improve SEO structure**
  - "[state] smoking laws" keywords
  - Internal linking structure
  - Meta tags optimization

---

## 📊 Priority 5: Analytics & Optimization (Ongoing)

### Both Apps
- [ ] **Set up analytics tracking**
  - Google Analytics
  - Vercel Analytics
  - Custom event tracking

- [ ] **Submit sitemaps to Google Search Console**
  - PopThePopcorn sitemap
  - SmokersRights sitemap
  - Monitor indexing status

- [ ] **Monitor Vercel logs**
  - Watch for errors in first 24-48 hours
  - Set up error alerts
  - Performance monitoring

---

## ✅ Quick Reference

**PopThePopcorn Status:**
- ✅ Deployed: `www.popthepopcorn.com`
- ✅ Commit: `25244aa`
- ⏳ Headlines: Waiting for scraper

**SmokersRights Status:**
- ✅ Deployed: `www.smokersrights.com`
- ✅ Content: Legal Navigator live
- ✅ All pages working

---

**Last Updated:** After successful deployment
**Next Review:** After scraper runs and headlines populate
