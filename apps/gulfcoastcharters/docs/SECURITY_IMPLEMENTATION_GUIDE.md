# 🔒 Security Implementation Guide

## Overview
This guide covers implementing critical security features for Gulf Coast Charters:
1. Environment Variables Configuration
2. Row Level Security (RLS) Policies
3. Rate Limiting Setup
4. Two-Factor Authentication for Admins

---

## 1. Environment Variables Setup

### Step 1: Create Local .env File
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### Step 2: Required Environment Variables

```env
# SUPABASE (Required)
VITE_SUPABASE_URL=https://your-project.databasepad.com
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# GOOGLE OAUTH (Required for Google Login)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

# SECURITY
VITE_SESSION_TIMEOUT=30
VITE_REQUIRE_2FA_ADMIN=true
```

### Step 3: Add to Deployment Platforms

**Vercel:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_GOOGLE_CLIENT_ID
```

**Netlify:**
Go to Site Settings > Environment Variables and add each variable.

---

## 2. Row Level Security (RLS)

See `supabase/migrations/20240122_enable_rls.sql` and `20240122_rls_policies.sql`

For detailed instructions, see: **RLS_SETUP_GUIDE.md**

---

## 3. Rate Limiting Configuration

### Supabase Dashboard Method
1. Go to **Settings** > **API** > **Rate Limiting**
2. Set limits:
   - Anonymous: 100 req/min
   - Authenticated: 200 req/min
3. Enable IP-based limiting

For detailed instructions, see: **RATE_LIMITING_SETUP.md**

---

## 4. Two-Factor Authentication for Admins

### Enable 2FA Requirement
Add to `.env`:
```env
VITE_REQUIRE_2FA_ADMIN=true
```

### Existing Components
- `TwoFactorSetup.tsx` - Setup flow with QR code
- `TwoFactorVerification.tsx` - Login verification
- `two-factor-auth` edge function - Backend logic

For detailed instructions, see: **ADMIN_2FA_SETUP.md**

---

## Quick Security Checklist

### Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all Supabase credentials
- [ ] Add Google OAuth credentials
- [ ] Set session timeout (30 min)
- [ ] Enable 2FA requirement for admins
- [ ] Add to deployment platform

### Row Level Security
- [ ] Run `20240122_enable_rls.sql`
- [ ] Run `20240122_rls_policies.sql`
- [ ] Test with different user roles
- [ ] Verify admins have full access

### Rate Limiting
- [ ] Configure in Supabase dashboard
- [ ] Set anonymous limit (100/min)
- [ ] Set authenticated limit (200/min)
- [ ] Enable IP-based limiting

### Two-Factor Authentication
- [ ] Enable 2FA requirement in .env
- [ ] Test 2FA setup flow
- [ ] Verify backup codes work
- [ ] Send notification to all admins

---

## Additional Resources

- **RLS_SETUP_GUIDE.md** - Detailed RLS configuration
- **RATE_LIMITING_SETUP.md** - Rate limiting strategies
- **ADMIN_2FA_SETUP.md** - 2FA enforcement guide
- **2FA_SETUP_GUIDE.md** - User 2FA setup
- **ENTERPRISE_SECURITY_GUIDE.md** - Advanced security
