# Security Testing Guide

## Quick Start

### Run All Security Tests
```bash
npm run test:security:all
```

### Run Individual Test Suites
```bash
# Row Level Security tests
npm run test:security:rls

# Rate limiting tests
npm run test:security:rate-limit

# 2FA enforcement tests
npm run test:security:2fa

# Penetration tests
npm run test:security:pentest

# Generate full audit report
npm run test:security:audit
```

## Test Environment Setup

### Prerequisites
1. Node.js 18+ installed
2. Environment variables configured in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. Test user accounts:
   - Regular user: test@example.com
   - Admin user: admin@gulfcoastcharters.com
   - Captain user: captain@example.com

### Database Setup
Run RLS migrations first:
```bash
# Enable RLS on all tables
psql -f supabase/migrations/20240122_enable_rls.sql

# Apply RLS policies
psql -f supabase/migrations/20240122_rls_policies.sql
```

## CI/CD Integration

### GitHub Actions
Security tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Daily at 2 AM UTC (scheduled)

### Deployment Blocking
Deployments are blocked if:
- Security score < 80%
- Any critical severity issues found
- RLS policies fail
- 2FA enforcement fails

## Understanding Test Results

### Security Score
- **90-100%**: Excellent security posture
- **80-89%**: Good, minor improvements needed
- **70-79%**: Fair, address issues soon
- **Below 70%**: Poor, immediate action required

### Test Categories

#### RLS Tests (Critical)
Verifies data isolation between users. Failures indicate:
- Users can access unauthorized data
- Data leakage between accounts
- Broken authorization logic

#### Rate Limiting (High)
Protects against DDoS and brute force. Failures indicate:
- API endpoints vulnerable to abuse
- Login endpoints can be brute-forced
- No traffic throttling

#### 2FA Tests (High)
Ensures admin account security. Failures indicate:
- Admin accounts without 2FA
- 2FA bypass vulnerabilities
- Weak authentication

#### Penetration Tests (Critical)
Simulates real attacks. Failures indicate:
- SQL injection vulnerabilities
- XSS attack vectors
- CSRF weaknesses

## Troubleshooting

### Common Issues

**Tests timing out:**
- Check network connectivity
- Verify Supabase is accessible
- Increase timeout in test files

**RLS tests failing:**
- Verify migrations are applied
- Check RLS is enabled: `SELECT * FROM pg_tables WHERE rowsecurity = true`
- Review policy definitions

**Rate limit tests not blocking:**
- Configure rate limiting in Supabase dashboard
- Check edge function rate limits
- Verify IP-based throttling

**2FA tests failing:**
- Ensure admin users have 2FA enabled
- Check `two_factor_enabled` column in `user_profiles`
- Verify 2FA verification logic in edge functions

## Manual Security Audit

### Checklist
- [ ] All tables have RLS enabled
- [ ] Admin accounts have 2FA enabled
- [ ] Rate limiting configured (100 req/min)
- [ ] Environment variables in `.env` (not hardcoded)
- [ ] HTTPS enforced in production
- [ ] JWT tokens expire after 1 hour
- [ ] Password requirements enforced (8+ chars, mixed case, numbers)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (React escaping + DOMPurify)
- [ ] CSRF protection (JWT tokens)

## Security Audit Reports

Reports are generated in JSON format:
```json
{
  "timestamp": "2024-01-22T10:30:00Z",
  "overallScore": 95,
  "rlsTests": [...],
  "rateLimitTests": [...],
  "twoFactorTests": [...],
  "penetrationTests": [...],
  "recommendations": [...]
}
```

### Viewing Reports
```bash
# Generate report
npm run test:security:audit

# View latest report
cat security-audit-*.json | jq '.'
```

## Support
For security issues, contact: security@gulfcoastcharters.com
