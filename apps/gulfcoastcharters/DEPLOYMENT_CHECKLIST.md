# DEPLOYMENT CHECKLIST

## PRE-DEPLOYMENT (Complete Before Going Live)

### 1. Environment Configuration
- [ ] Create `.env` file with all required variables
- [ ] Set `VITE_SUPABASE_URL` to production URL
- [ ] Set `VITE_SUPABASE_ANON_KEY` (never service role key!)
- [ ] Configure OAuth redirect URLs for production domain
- [ ] Test all environment variables load correctly

### 2. Database Security
- [ ] Enable RLS on ALL tables (see SECURITY_AUDIT.md)
- [ ] Test RLS policies with different user roles
- [ ] Remove test data from production database
- [ ] Set up automated database backups
- [ ] Configure database connection pooling

### 3. Authentication & Authorization
- [ ] Test login/signup flows
- [ ] Verify email confirmation works
- [ ] Test password reset functionality
- [ ] Confirm 2FA setup for admin accounts
- [ ] Test OAuth providers (Google, etc.)
- [ ] Verify session timeout (30 min default)

### 4. Code Quality
- [ ] Run `npm run type-check` - no errors
- [ ] Run `npm run lint` - no warnings
- [ ] Run `npm audit` - fix critical vulnerabilities
- [ ] Remove all console.log statements
- [ ] Remove unused dependencies
- [ ] Optimize bundle size

### 5. Testing
- [ ] Run admin test script: `npm run test:admin`
- [ ] Run captain test script: `npm run test:captain`
- [ ] Test all user flows manually
- [ ] Test on mobile devices
- [ ] Test in different browsers (Chrome, Firefox, Safari)
- [ ] Test with slow network connection

### 6. Performance
- [ ] Enable code splitting
- [ ] Optimize images (compress, lazy load)
- [ ] Minimize CSS/JS bundles
- [ ] Test Lighthouse score (aim for 90+)
- [ ] Enable caching headers
- [ ] Set up CDN for static assets

### 7. SEO & Analytics
- [ ] Update sitemap.xml with production URLs
- [ ] Configure robots.txt
- [ ] Add Google Analytics tracking
- [ ] Set up error tracking (Sentry)
- [ ] Add meta tags for social sharing
- [ ] Test Open Graph previews

## DEPLOYMENT STEPS

### Option A: Vercel Deployment
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Add environment variables in Vercel Dashboard
# Settings → Environment Variables
```

### Option B: Netlify Deployment
```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Initialize
netlify init

# 4. Deploy
netlify deploy --prod

# 5. Add environment variables in Netlify Dashboard
# Site settings → Environment variables
```

### Option C: GitHub Pages (Static Only)
```bash
# 1. Build production bundle
npm run build

# 2. Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

## POST-DEPLOYMENT

### 1. Verification
- [ ] Visit production URL - site loads correctly
- [ ] Test user registration
- [ ] Test user login
- [ ] Test captain dashboard
- [ ] Test admin panel
- [ ] Verify email notifications work
- [ ] Check analytics tracking

### 2. Monitoring Setup
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up error alerts (Sentry, LogRocket)
- [ ] Enable performance monitoring
- [ ] Set up database query monitoring
- [ ] Configure backup alerts

### 3. Security Hardening
- [ ] Enable HTTPS (should be automatic)
- [ ] Add security headers (CSP, HSTS)
- [ ] Configure rate limiting
- [ ] Enable DDoS protection (Cloudflare)
- [ ] Set up Web Application Firewall (WAF)

### 4. Documentation
- [ ] Update README with production URL
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document rollback procedure
- [ ] Create incident response plan

## ONGOING MAINTENANCE

### Daily
- [ ] Check error logs
- [ ] Monitor uptime status
- [ ] Review user feedback

### Weekly
- [ ] Review analytics data
- [ ] Check for dependency updates
- [ ] Review security alerts
- [ ] Backup verification

### Monthly
- [ ] Run security audit
- [ ] Performance optimization review
- [ ] Update dependencies
- [ ] Review and optimize database queries
- [ ] Cost analysis and optimization

## ROLLBACK PROCEDURE

If something goes wrong:

1. **Immediate**: Revert to previous deployment
   ```bash
   vercel rollback  # or
   netlify rollback
   ```

2. **Database**: Restore from backup if needed
   ```sql
   -- In Supabase Dashboard
   -- Project Settings → Database → Backups → Restore
   ```

3. **Notify**: Inform users of any issues
4. **Investigate**: Review logs to identify issue
5. **Fix**: Deploy corrected version
6. **Document**: Record incident and resolution

## SUPPORT CONTACTS

- **Hosting**: support@vercel.com or support@netlify.com
- **Database**: support@supabase.com
- **Emergency**: [Your on-call number]
- **Team Lead**: [Lead developer contact]
