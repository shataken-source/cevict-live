# Two-Factor Authentication (2FA) Setup Guide

## Overview
The CharterConnect platform now includes TOTP-based two-factor authentication for enhanced account security.

## Database Setup

### Required Tables
Due to database constraints, you may need to create these tables manually through the Supabase dashboard:

```sql
-- Create table for storing 2FA secrets
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for backup codes
CREATE TABLE IF NOT EXISTS user_2fa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_backup_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_2fa
CREATE POLICY "Users can manage their own 2FA"
  ON user_2fa FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for backup codes
CREATE POLICY "Users can manage their own backup codes"
  ON user_2fa_backup_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_2fa_user_id ON user_2fa(user_id);
CREATE INDEX idx_backup_codes_user_id ON user_2fa_backup_codes(user_id);
CREATE INDEX idx_backup_codes_unused ON user_2fa_backup_codes(user_id, used) WHERE used = false;
```

## Features

### For Users
1. **Enable 2FA**: Navigate to Profile Settings and click "Enable" in the Two-Factor Authentication section
2. **QR Code Setup**: Scan the QR code with any authenticator app (Google Authenticator, Authy, 1Password, etc.)
3. **Backup Codes**: Save the 10 backup codes in a secure location - they can be used if you lose access to your authenticator
4. **Verification**: Enter the 6-digit code from your authenticator app to verify setup
5. **Disable 2FA**: Can be disabled anytime from Profile Settings (requires confirmation)

### For Administrators
- 2FA status is automatically checked during login
- Users with 2FA enabled must provide a valid code after entering their password
- Backup codes are single-use and marked as used when redeemed
- All 2FA operations are logged and secured with RLS policies

## Security Features

1. **TOTP Algorithm**: Uses Time-based One-Time Password (RFC 6238)
2. **Encrypted Storage**: Secrets are stored securely in the database
3. **Backup Codes**: 10 single-use backup codes for account recovery
4. **Row Level Security**: Users can only access their own 2FA data
5. **QR Code Generation**: Automatic QR code creation for easy setup

## Supported Authenticator Apps

- Google Authenticator (iOS/Android)
- Microsoft Authenticator (iOS/Android)
- Authy (iOS/Android/Desktop)
- 1Password (iOS/Android/Desktop)
- LastPass Authenticator
- Any TOTP-compatible app

## API Endpoints

The `two-factor-auth` edge function handles:
- `setup`: Generate new secret and backup codes
- `enable`: Verify code and activate 2FA
- `verify`: Validate TOTP code or backup code
- `disable`: Remove 2FA from account
- `status`: Check if 2FA is enabled

## Testing

1. Enable 2FA in Profile Settings
2. Scan QR code with authenticator app
3. Enter the 6-digit code to verify
4. Save backup codes
5. Log out and log back in
6. Enter 2FA code when prompted
7. Test backup code by using one instead of the authenticator code

## Troubleshooting

**QR Code not scanning?**
- Manually enter the secret key shown below the QR code

**Code not working?**
- Ensure device time is synchronized
- Try the next code (codes refresh every 30 seconds)

**Lost authenticator device?**
- Use one of your backup codes
- Contact support if backup codes are also lost

**Want to disable 2FA?**
- Go to Profile Settings
- Click "Disable" in the 2FA section
- Confirm the action
