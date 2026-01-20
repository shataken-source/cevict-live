# Post-Deployment Checklist

## ✅ COMPLETED (Automated)
- [x] Created netlify.toml with build settings and security headers
- [x] Removed all console.log statements from production code
- [x] Updated sitemap.xml (needs domain replacement)
- [x] Added comprehensive CSP and security headers

## 🔧 REQUIRED MANUAL STEPS

### 1. Environment Variables in Netlify
Add these in Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Row Level Security (RLS)
Run these SQL queries in Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE charters ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Booking policies
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Review policies
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);

-- Charter policies
CREATE POLICY "charters_select" ON charters FOR SELECT USING (true);
```

### 3. Update Sitemap Domain
Replace `YOUR_DOMAIN` in `public/sitemap.xml` with your actual domain

### 4. OAuth Configuration
Update redirect URLs in Supabase Dashboard → Authentication → URL Configuration:
- Add your production domain to "Site URL"
- Add redirect URLs: `https://yourdomain.com/`, `https://yourdomain.com/auth/callback`

### 5. Custom Domain Setup
1. Add custom domain in Netlify
2. Configure DNS records
3. Wait for SSL certificate provisioning

### 6. Performance & Monitoring
- [ ] Set up Sentry (optional) - add DSN to src/lib/sentry.ts
- [ ] Configure Google Analytics
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Run Lighthouse audit after deployment

### 7. Email Service Verification
Test these edge functions work correctly:
- booking-notifications
- mailjet-email-service
- password-reset
- email-campaign-manager

### 8. Payment Testing
- [ ] Test Stripe checkout in production mode
- [ ] Verify webhook endpoint in Stripe Dashboard
- [ ] Test refund functionality

### 9. Security Audit
- [ ] Review all edge function CORS settings
- [ ] Verify API keys are not exposed in frontend
- [ ] Test rate limiting on sensitive endpoints
- [ ] Enable 2FA for admin accounts

### 10. Content Updates
- [ ] Replace placeholder images if any
- [ ] Update contact information
- [ ] Review and update Terms of Service
- [ ] Review and update Privacy Policy

## 📊 POST-LAUNCH MONITORING

### Week 1
- Monitor error rates in Netlify logs
- Check Supabase database performance
- Review user signup/login success rates
- Test booking flow end-to-end

### Week 2
- Analyze Google Analytics data
- Review customer feedback
- Check email delivery rates
- Monitor payment success rates

### Ongoing
- Weekly database backups verification
- Monthly security updates
- Quarterly performance audits
- Regular dependency updates

## 🚨 CRITICAL REMINDERS
1. Never commit API keys to git
2. Always test in staging before production
3. Keep Supabase and Netlify secrets in sync
4. Monitor edge function usage and costs
5. Set up alerts for critical errors
