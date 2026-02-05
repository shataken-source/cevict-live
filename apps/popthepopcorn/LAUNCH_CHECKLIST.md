# 🚀 PopThePopcorn v1.0 Launch Checklist

## Pre-Launch Setup

### 1. Database Setup
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor
- [ ] Run `supabase/rls-policies.sql` for Row Level Security
- [ ] Run `supabase/story-arcs-schema.sql` for Story Arcs
- [ ] Run `supabase/default-settings.sql` for default settings
- [ ] **CRITICAL**: Refresh Supabase schema cache (Settings > API > Reload schema cache)

### 2. Environment Variables (Vercel)
Required:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ADMIN_PASSWORD`

Optional but Recommended:
- [ ] `PERPLEXITY_API_KEY` (for verification agent)
- [ ] `TWITTER_BEARER_TOKEN` (for trending topics)
- [ ] `DISCORD_WEBHOOK_URL` (for breaking news)
- [ ] `SINCH_SERVICE_PLAN_ID` (for SMS alerts)
- [ ] `SINCH_API_TOKEN`
- [ ] `SINCH_FROM_NUMBER`
- [ ] `SINCH_REGION`

### 3. Legal & Safety
- [ ] Age verification gate is active
- [ ] AI transparency labels are showing on summaries
- [ ] Privacy policy page (recommended)
- [ ] Terms of service (recommended)
- [ ] Age Signal API integration (optional, for stricter verification)

### 4. Testing
- [ ] Test age gate (should block until verified)
- [ ] Test squishy buttons (should deform on press)
- [ ] Test haptic feedback (on mobile devices)
- [ ] Test drama vote slider (1-10 buttons)
- [ ] Test probability calculator
- [ ] Test streak mechanics (daily check-in)
- [ ] Test virtual currency (Salt earning)
- [ ] Test Binge Mode (full-screen feed)
- [ ] Test Story Arcs (Netflix-style seasons)
- [ ] Test reactions (emoji buttons)
- [ ] Test SMS alerts (if Sinch configured)
- [ ] Test Discord webhooks (if configured)

### 5. Content
- [ ] Run scraper to populate initial headlines
- [ ] Verify headlines are showing with all features
- [ ] Check verification agent is working
- [ ] Check sentiment analysis is working
- [ ] Check source trace is displaying

### 6. UI/UX Polish
- [ ] Dark mode is default (cyber gradient)
- [ ] Squishy buttons are working
- [ ] Bento Grid cards are styled correctly
- [ ] Virtual currency display in header
- [ ] Streak badges showing
- [ ] All animations are smooth
- [ ] Mobile responsive

## Launch Strategy: "The Drop"

### Phase 1: Waitlist (Pre-Launch)
- [ ] Create waitlist landing page
- [ ] Generate 100 invite codes
- [ ] Give first 100 users 3 invite codes each
- [ ] Build anticipation on TikTok/Instagram

### Phase 2: TikTok "Build in Public"
- [ ] Post video showing squishy drama meter
- [ ] Ask: "Is this satisfaction level 10?"
- [ ] Show Binge Mode in action
- [ ] Tease Story Arcs feature
- [ ] Use hashtags: #GenZ #News #TechTok #BuildInPublic

### Phase 3: Soft Launch
- [ ] Invite waitlist users
- [ ] Monitor for bugs
- [ ] Collect feedback
- [ ] Iterate quickly

### Phase 4: Public Launch
- [ ] Announce on all social platforms
- [ ] Press release (optional)
- [ ] Product Hunt launch (optional)
- [ ] Reddit posts in relevant communities

## Post-Launch Monitoring

### Metrics to Track
- [ ] Daily active users
- [ ] Drama vote engagement
- [ ] Streak retention
- [ ] Binge Mode usage
- [ ] Story Arc subscriptions
- [ ] SMS alert signups
- [ ] Virtual currency (Salt) earned/spent

### Community Building
- [ ] Set up Discord server (recommended)
- [ ] Create #breaking-news channel
- [ ] Create #drama-meter-9+ channel
- [ ] Create #the-kernel-chat channel
- [ ] Set up Discord bot for auto-posting
- [ ] Create Reddit community (r/popthepopcorn)
- [ ] Set up Twitter/X account (@PopThePopcorn)

## Monetization (Future)
- [ ] Implement "Boost Story" feature (spend Salt)
- [ ] Create "Deep Dive" premium content
- [ ] Historical drama data (Pro feature)
- [ ] Ad-free experience (premium)
- [ ] Early access to features (premium)

## Known Limitations (v1.0)
- User identification is IP-based (upgrade to auth later)
- Virtual currency stored in localStorage (upgrade to database)
- Age verification is session-based (upgrade to persistent)
- No user accounts yet (add in v1.1)

## Success Criteria
- [ ] 100+ daily active users in first week
- [ ] 50+ drama votes per day
- [ ] 10+ Story Arc subscriptions
- [ ] 5+ day average streak
- [ ] Zero critical bugs
- [ ] Positive Gen Z feedback

---

**Ready to launch?** 🚀

Run the scraper, test everything, and let The Kernel loose on the world!
