# Production Deployment Guide
## Gulf Coast Charters Platform - Launch Checklist

---

## 📋 Pre-Deployment Checklist

### 1. Code & Assets ✅

- [ ] All code reviewed and merged to `main` branch
- [ ] No TODO or FIXME comments in production code
- [ ] All console.log statements removed or disabled
- [ ] Environment variables documented
- [ ] Dependencies updated and locked (package-lock.json)
- [ ] Build passes without warnings
- [ ] TypeScript compilation successful (if applicable)
- [ ] ESLint/Prettier formatting applied

### 2. Database ✅

- [ ] **RLS policies deployed** (database-permissions.sql)
- [ ] All migrations applied
- [ ] Indexes created for performance
- [ ] Backup strategy configured
- [ ] Connection pooling configured (PgBouncer)
- [ ] Read replicas set up (if needed)
- [ ] Database credentials rotated
- [ ] Test data removed from production

### 3. Authentication & Security ✅

- [ ] Supabase Auth configured
- [ ] Email confirmation enabled
- [ ] Password requirements enforced
- [ ] JWT secret keys rotated
- [ ] Service role key secured (server-only)
- [ ] API rate limiting configured
- [ ] CORS settings configured
- [ ] CSP headers configured
- [ ] HTTPS enforced (redirect HTTP)
- [ ] Security headers added

### 4. External Services ✅

- [ ] **SendGrid** account created and verified
  - [ ] Sender domain authenticated
  - [ ] Email templates uploaded
  - [ ] API key configured
  - [ ] Daily sending limits set
  
- [ ] **Stripe** account in production mode
  - [ ] Live API keys configured
  - [ ] Webhook endpoints registered
  - [ ] Product/price IDs updated
  - [ ] Tax configuration verified
  
- [ ] **NOAA API** access verified
  - [ ] Buoy IDs mapped correctly
  - [ ] API endpoints tested
  - [ ] Caching configured
  
- [ ] **Vercel** deployment configured
  - [ ] Environment variables set
  - [ ] Build settings optimized
  - [ ] Edge functions deployed

### 5. Monitoring & Logging ✅

- [ ] Error tracking configured (Sentry/Rollbar)
- [ ] Application monitoring set up
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert webhooks configured (Slack/Discord)
- [ ] Log retention policy set
- [ ] Performance monitoring enabled

### 6. Performance Optimization ✅

- [ ] **PgBouncer** deployed for connection pooling
- [ ] **Email queue** implemented (BullMQ + Redis)
- [ ] NOAA data caching enabled (15 min TTL)
- [ ] Image optimization configured
- [ ] CDN configured for assets
- [ ] Gzip/Brotli compression enabled
- [ ] Database query optimization verified
- [ ] Lighthouse scores > 90

### 7. Testing ✅

- [ ] **Stress tests passed** (see STRESS_TEST_RESULTS.md)
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing completed
- [ ] Cross-browser testing done
- [ ] Mobile responsiveness verified
- [ ] Payment flow tested end-to-end
- [ ] Email delivery tested
- [ ] Weather alerts tested

### 8. Documentation ✅

- [ ] README.md updated
- [ ] API documentation complete
- [ ] User guide written
- [ ] Captain onboarding guide created
- [ ] Admin documentation complete
- [ ] Deployment runbook created
- [ ] Incident response plan documented

### 9. Legal & Compliance ✅

- [ ] Terms of Service finalized
- [ ] Privacy Policy published
- [ ] Cookie consent implemented
- [ ] GDPR compliance verified
- [ ] Data retention policy documented
- [ ] Right to deletion implemented
- [ ] Business license verified
- [ ] Insurance coverage confirmed

### 10. Business Operations ✅

- [ ] Customer support email configured
- [ ] Support ticket system set up
- [ ] Knowledge base created
- [ ] Social media accounts created
- [ ] Google Analytics configured
- [ ] Email marketing configured
- [ ] Pricing finalized
- [ ] Launch communications prepared

---

## 🚀 Deployment Steps

### Phase 1: Infrastructure Setup

#### 1.1 Supabase Project

```bash
# Create production project
supabase projects create gulf-coast-charters-prod --org-id your-org-id

# Link local project
supabase link --project-ref your-prod-ref

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy weather-alerts
```

#### 1.2 Environment Variables

**Supabase Dashboard → Settings → Edge Functions → Secrets**

```bash
# Required Environment Variables
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...

STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

REDIS_URL=redis://default:xxxxx@redis.upstash.io:6379
```

#### 1.3 Database Setup

```sql
-- Run in Supabase SQL Editor

-- 1. Apply all migrations
\i migrations/001_initial_schema.sql
\i migrations/002_add_rls.sql
\i migrations/003_add_indexes.sql

-- 2. Deploy RLS policies
\i database-permissions.sql

-- 3. Set up cron jobs
SELECT cron.schedule(
  'weather-alerts-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/weather-alerts',
    headers:='{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'cleanup-locations-hourly',
  '0 * * * *',
  'SELECT cleanup_expired_locations();'
);

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

#### 1.4 Connection Pooling (PgBouncer)

**Option A: Supabase Built-in (Recommended)**
- Go to: Project Settings → Database → Connection Pooling
- Enable: Transaction mode
- Port: 6543
- Max client connections: 1000

**Option B: Self-hosted**
```bash
# Install PgBouncer
sudo apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
gulf_coast_charters = host=db.xxx.supabase.co port=5432 dbname=postgres

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6543
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Start PgBouncer
sudo systemctl start pgbouncer
```

#### 1.5 Email Queue Setup

```bash
# Install Redis (Upstash or self-hosted)
# For Upstash: Create database at console.upstash.com

# Deploy email queue worker
cd workers/email-queue
npm install
npm run build
npm run deploy

# Configure BullMQ
const emailQueue = new Queue('emails', {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379,
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});
```

---

### Phase 2: Frontend Deployment

#### 2.1 Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Verify deployment
curl https://gulfcoastcharters.com
```

#### 2.2 Domain Configuration

**Vercel Dashboard → Settings → Domains**

1. Add custom domain: `gulfcoastcharters.com`
2. Add www redirect: `www.gulfcoastcharters.com`
3. Verify DNS records:
```
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```
4. Enable SSL (automatic)

#### 2.3 CDN Configuration

**Cloudflare (Optional for images/assets)**

1. Create Cloudflare account
2. Add site: gulfcoastcharters.com
3. Update nameservers
4. Configure caching rules:
```javascript
// Cache images for 1 week
Cache-Control: public, max-age=604800, immutable

// Cache API responses for 5 minutes
Cache-Control: public, max-age=300
```

---

### Phase 3: Third-Party Services

#### 3.1 SendGrid Setup

**Production Configuration:**

1. **Verify domain:**
   ```
   Domain: gulfcoastcharters.com
   DKIM: Enabled
   SPF: v=spf1 include:sendgrid.net ~all
   DMARC: v=DMARC1; p=quarantine
   ```

2. **Create API key:**
   - Name: Production Email Sender
   - Permissions: Full Access (Mail Send only)
   - Store in environment: `SENDGRID_API_KEY`

3. **Upload email templates:**
   - Weather Alert (ID: d-xxx)
   - Booking Confirmation (ID: d-xxx)
   - Points Notification (ID: d-xxx)

4. **Configure webhook:**
   ```
   Endpoint: https://gulfcoastcharters.com/api/webhooks/sendgrid
   Events: Delivered, Bounced, Spam Reports
   ```

#### 3.2 Stripe Setup

**Production Configuration:**

1. **Activate account:**
   - Complete business verification
   - Add bank account
   - Set up payouts

2. **Create products:**
```bash
# Pro Plan
stripe products create \
  --name "Pro Plan" \
  --description "Full access to all features"

stripe prices create \
  --product prod_xxx \
  --unit-amount 999 \
  --currency usd \
  --recurring interval=month

# Captain Plan  
stripe products create \
  --name "Captain Plan" \
  --description "Business tools for charter captains"

stripe prices create \
  --product prod_xxx \
  --unit-amount 2999 \
  --currency usd \
  --recurring interval=month
```

3. **Configure webhooks:**
```
Endpoint: https://gulfcoastcharters.com/api/webhooks/stripe
Events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

4. **Enable payment methods:**
   - ✅ Credit/Debit cards
   - ✅ Apple Pay
   - ✅ Google Pay

---

### Phase 4: Monitoring & Alerts

#### 4.1 Error Tracking (Sentry)

```bash
npm install @sentry/nextjs

# Configure sentry.client.config.js
Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

#### 4.2 Uptime Monitoring

**UptimeRobot Configuration:**
```
Monitors:
- https://gulfcoastcharters.com (HTTP, 5 min interval)
- https://gulfcoastcharters.com/api/health (HTTP, 5 min interval)
- Database connection (Port, 5 min interval)

Alert Contacts:
- Email: ops@gulfcoastcharters.com
- Slack: #alerts channel
```

#### 4.3 Performance Monitoring

**Vercel Analytics:**
- Go to: Project → Analytics
- Enable: Web Vitals monitoring
- Set alerts for:
  - LCP > 2.5s
  - FID > 100ms
  - CLS > 0.1

**Supabase Monitoring:**
- Dashboard → Observability
- Set alerts for:
  - Database CPU > 80%
  - Connection pool > 90%
  - Storage > 80%

---

### Phase 5: Launch

#### 5.1 Final Pre-Launch Checks

```bash
# Run final tests
npm run test:e2e
npm run test:integration
npm run lighthouse

# Verify environment
node scripts/verify-env.js

# Check external services
node scripts/health-check.js

# Verify SSL certificate
curl -I https://gulfcoastcharters.com

# Test critical paths
npm run test:smoke
```

#### 5.2 Soft Launch (Beta Users)

**Day 1-7: Limited Release**
- Invite 100 beta users
- Monitor error rates closely
- Daily standups for issues
- Fix critical bugs immediately

**Metrics to Watch:**
```
Critical:
- Error rate < 1%
- API response time p95 < 300ms
- Database CPU < 60%
- Email delivery > 99%

Business:
- User signups
- First booking completion rate
- Pro subscription conversion
- Support tickets
```

#### 5.3 Full Launch

**Pre-Launch Communication:**
```
T-7 days: Social media announcement
T-3 days: Email to waitlist
T-1 day: Press release
T-0: LAUNCH!
```

**Launch Day Checklist:**
- [ ] All systems green
- [ ] Support team ready
- [ ] Monitoring dashboards open
- [ ] Incident response plan ready
- [ ] Social media scheduled
- [ ] Analytics tracking verified

---

## 🔥 Incident Response Plan

### Severity Levels

**Critical (P0):**
- Complete site outage
- Payment processing down
- Data breach
- **Response time:** Immediate
- **Communication:** Hourly updates

**High (P1):**
- Major feature broken
- Performance degradation (> 3s response)
- Database errors affecting > 10% users
- **Response time:** < 1 hour
- **Communication:** Every 4 hours

**Medium (P2):**
- Minor feature issues
- Slow performance (1-3s)
- Single user complaints
- **Response time:** < 4 hours
- **Communication:** Daily

### Incident Response Steps

1. **Detect:**
   - Automated alerts (Sentry, Uptime Robot)
   - User reports
   - Monitoring dashboards

2. **Assess:**
   - Determine severity
   - Identify affected systems
   - Estimate impact

3. **Respond:**
   ```
   P0: All hands on deck
   P1: On-call engineer + backup
   P2: Next available engineer
   ```

4. **Communicate:**
   - Update status page
   - Notify affected users
   - Internal team updates

5. **Resolve:**
   - Apply fix
   - Test thoroughly
   - Monitor for recurrence

6. **Post-Mortem:**
   - Document timeline
   - Identify root cause
   - Create prevention plan

### Emergency Contacts

```
On-Call Engineer: +1-555-0100
Database Admin: +1-555-0101
DevOps Lead: +1-555-0102
CTO: +1-555-0103

Escalation Path:
1. On-Call Engineer
2. Lead Engineer
3. CTO
4. CEO
```

---

## 🔄 Rollback Procedures

### Application Rollback (Vercel)

```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-id]

# Verify rollback
curl https://gulfcoastcharters.com
```

### Database Rollback

```bash
# Restore from backup
supabase db restore your-backup-id

# Or manual restore
psql $DATABASE_URL < backup_YYYYMMDD.sql

# Verify data integrity
npm run verify-database
```

### Edge Function Rollback

```bash
# Redeploy previous version
git checkout previous-tag
supabase functions deploy weather-alerts
```

---

## 📊 Post-Launch Monitoring

### Daily Metrics

**Business:**
- New user signups
- Pro conversions
- Booking revenue
- Support tickets

**Technical:**
- Error rate
- Response time (p50, p95, p99)
- Database performance
- Email delivery rate

**User Experience:**
- Session duration
- Bounce rate
- Feature adoption
- Mobile vs desktop

### Weekly Review

- Review error logs
- Analyze user feedback
- Check performance trends
- Update roadmap
- Team retrospective

---

## ✅ Launch Complete!

After successful deployment:

1. **Celebrate!** 🎉
2. Monitor closely for 48 hours
3. Gather user feedback
4. Plan first update sprint
5. Document lessons learned

**Your platform is LIVE! 🚀**

---

## 📞 Support

**Production Issues:**
- Slack: #production-alerts
- Email: ops@gulfcoastcharters.com
- Phone: +1-555-LAUNCH

**Documentation:**
- Runbooks: /docs/runbooks/
- API Docs: /docs/API_REFERENCE.md
- Architecture: /docs/architecture.md

---

**Deployment Prepared By:** DevOps Team  
**Last Updated:** November 22, 2024  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production
