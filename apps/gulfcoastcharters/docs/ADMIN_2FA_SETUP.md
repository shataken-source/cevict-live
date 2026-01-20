# 🔐 Admin 2FA Enforcement Guide

## Overview
Require all admin accounts to enable Two-Factor Authentication for enhanced security.

---

## Step 1: Enable 2FA Requirement

Update your `.env` file:
```env
VITE_REQUIRE_2FA_ADMIN=true
```

---

## Step 2: Create Admin 2FA Enforcement Function

This edge function checks if admins have 2FA enabled:

```typescript
// Already exists: two-factor-auth edge function
// Checks user_2fa table for enabled status
```

---

## Step 3: Update Admin Login Flow

Add 2FA check to admin routes in `src/components/Navigation.tsx`:

```typescript
// Check if admin has 2FA enabled
const checkAdmin2FA = async () => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role === 'admin') {
    const { data: twofa } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', user.id)
      .single();
      
    if (!twofa?.enabled) {
      // Redirect to 2FA setup
      navigate('/setup-2fa');
      toast({
        title: '2FA Required',
        description: 'Admins must enable 2FA to continue'
      });
    }
  }
};
```

---

## Step 4: Force 2FA Setup for Existing Admins

Run this SQL to identify admins without 2FA:

```sql
SELECT 
  p.id,
  p.email,
  p.role,
  CASE WHEN u2fa.enabled THEN 'Yes' ELSE 'No' END as has_2fa
FROM profiles p
LEFT JOIN user_2fa u2fa ON u2fa.user_id = p.id
WHERE p.role = 'admin';
```

---

## Step 5: Send 2FA Setup Emails

Use the email notification system to notify admins:

```typescript
// In admin-user-management edge function
const notifyAdminsAbout2FA = async () => {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'admin');
    
  for (const admin of admins) {
    const { data: has2fa } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', admin.id)
      .single();
      
    if (!has2fa?.enabled) {
      await supabase.functions.invoke('mailjet-email-service', {
        body: {
          to: admin.email,
          subject: 'Action Required: Enable 2FA',
          html: `
            <h2>Two-Factor Authentication Required</h2>
            <p>As an admin, you must enable 2FA within 7 days.</p>
            <a href="${siteUrl}/setup-2fa">Enable 2FA Now</a>
          `
        }
      });
    }
  }
};
```

---

## Step 6: Create 2FA Setup Page

Users can set up 2FA at `/setup-2fa` using the `TwoFactorSetup` component:

```typescript
// Component already exists: src/components/TwoFactorSetup.tsx
// Shows QR code and backup codes
```

---

## Step 7: Test Admin 2FA Flow

1. Create test admin account
2. Login as admin
3. Should be redirected to 2FA setup
4. Scan QR code with authenticator app
5. Enter 6-digit code
6. Save backup codes
7. Login again - should prompt for 2FA code

---

## Monitoring & Compliance

### Check 2FA Compliance
```sql
SELECT 
  COUNT(*) FILTER (WHERE u2fa.enabled) as admins_with_2fa,
  COUNT(*) as total_admins,
  ROUND(100.0 * COUNT(*) FILTER (WHERE u2fa.enabled) / COUNT(*), 2) as compliance_percentage
FROM profiles p
LEFT JOIN user_2fa u2fa ON u2fa.user_id = p.id
WHERE p.role = 'admin';
```

### Audit 2FA Usage
```sql
SELECT 
  p.email,
  p.role,
  u2fa.enabled,
  u2fa.created_at as enabled_date
FROM profiles p
LEFT JOIN user_2fa u2fa ON u2fa.user_id = p.id
WHERE p.role IN ('admin', 'captain')
ORDER BY u2fa.enabled DESC, p.email;
```

---

## Backup Code Management

Admins get 10 backup codes when enabling 2FA:
- Each code can be used once
- Stored hashed in `user_2fa_backup_codes` table
- Regenerate if all codes are used

---

## Troubleshooting

### Issue: Admin locked out (lost phone)
**Solution**: Use backup codes or admin can reset via email

### Issue: QR code not scanning
**Solution**: Provide manual entry key

### Issue: Time-based codes not working
**Solution**: Check server time is synchronized (NTP)

---

## Best Practices

1. ✅ Require 2FA for all admin accounts
2. ✅ Require 2FA for captain accounts (optional)
3. ✅ Provide backup codes (10 per user)
4. ✅ Allow SMS backup (optional)
5. ✅ Log all 2FA events
6. ✅ Send email on 2FA disable
7. ❌ Never store 2FA secrets in plain text
8. ❌ Don't allow 2FA disable without verification

---

## Next Steps

1. Enable 2FA requirement in .env
2. Notify all admins via email
3. Monitor compliance dashboard
4. Enforce 2FA after 7-day grace period
5. Document 2FA process for new admins
