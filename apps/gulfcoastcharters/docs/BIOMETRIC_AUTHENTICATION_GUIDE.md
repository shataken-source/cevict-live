# Biometric Authentication System Guide

## Overview
Comprehensive biometric authentication system using WebAuthn API for fingerprint, Face ID, Windows Hello, and hardware security keys.

## Components Created

### Frontend Components
1. **BiometricDeviceManager** (`src/components/BiometricDeviceManager.tsx`)
   - View all registered biometric devices
   - Add new devices with custom names
   - Delete devices with confirmation
   - Shows device type icons (mobile, tablet, desktop, security key)
   - Displays last used date and current device indicator

2. **PasskeyAuthentication** (Already exists)
   - Handles biometric login flow
   - WebAuthn credential verification
   - Error handling for cancelled/failed authentication

3. **PasskeyRegistration** (Already exists)
   - Register new biometric credentials
   - Device name customization
   - WebAuthn credential creation

4. **ProfileSettings** (Enhanced)
   - Integrated biometric management
   - List registered passkeys
   - Add/remove passkeys inline

### Edge Function

**`supabase/functions/biometric-manager/index.ts`** (implemented):

- **list-devices** – List credentials for `userId`, enriched with device type and `is_current` (by user-agent).
- **delete-device** – Delete credential by `credential_id` and `userId`.
- **update-last-used** – Update `last_used_at` and `user_agent` for a credential.

Request body: `{ action, userId, deviceId? }`. Uses service role; client must send the authenticated user’s `userId`.

## Database Schema

Table `webauthn_credentials` is created in **`supabase/migrations/20240119_biometric_auth.sql`**:

```sql
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  user_agent TEXT,
  counter BIGINT DEFAULT 0,
  transports TEXT[],
  authenticator_attachment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ...
);

CREATE INDEX idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_last_used ON webauthn_credentials(last_used_at DESC);
```

RLS is enabled; see `20240122_enable_rls.sql` and `20240122_rls_policies.sql`.

## Features

### 1. Multi-Device Support
- Register multiple biometric devices per user
- Each device has a custom name (e.g., "iPhone 15 Pro", "MacBook Air")
- Track device type (mobile, tablet, desktop, security key)
- Display device-specific icons

### 2. Device Management
- View all registered devices in ProfileSettings
- See last used date for each device
- Current device indicator
- One-click device removal with confirmation

### 3. Biometric Login
- One-tap login with fingerprint/Face ID
- Fallback to password authentication
- Support for hardware security keys (YubiKey, etc.)
- Works with Touch ID, Face ID, Windows Hello

### 4. Security Features
- WebAuthn standard compliance
- Public key cryptography
- No passwords stored on device
- Phishing-resistant authentication
- Device-bound credentials

## User Flow

### Registration Flow
1. User logs in with password
2. Goes to Profile Settings
3. Clicks "Add Passkey" in Biometric Authentication section
4. Enters device name
5. System prompts for biometric verification
6. Device registered and appears in list

### Login Flow
1. User clicks "Sign in with Biometrics" on login page
2. System prompts for fingerprint/Face ID
3. User authenticates with biometric
4. Instant login without password

### Device Management
1. User views all devices in Profile Settings
2. Can see which device is currently in use
3. Can remove old/unused devices
4. Can add new devices at any time

## Browser Support

### Fully Supported
- Chrome 67+ (desktop and mobile)
- Safari 14+ (iOS and macOS with Touch ID/Face ID)
- Edge 18+
- Firefox 60+

### Platform-Specific Features
- **iOS/macOS**: Touch ID, Face ID
- **Windows**: Windows Hello (fingerprint, face, PIN)
- **Android**: Fingerprint, face unlock
- **All Platforms**: Hardware security keys (FIDO2)

## Testing

1. **Desktop Testing**
   - Use Chrome DevTools > Settings > Devices
   - Add virtual authenticator
   - Test registration and authentication

2. **Mobile Testing**
   - Use actual device with biometric capability
   - Test Touch ID/Face ID on iOS
   - Test fingerprint on Android

3. **Security Key Testing**
   - Use YubiKey or similar FIDO2 device
   - Test USB and NFC connections

## Deployment Checklist

- [x] Deploy `biometric-manager` edge function (implemented in repo)
- [x] Verify `webauthn_credentials` table exists (migration `20240119_biometric_auth.sql`)
- [ ] Test on multiple devices
- [ ] Test biometric registration
- [ ] Test biometric login
- [ ] Test device deletion
- [ ] Configure CORS for production domain
- [ ] Test with actual biometric hardware
- [ ] Verify error handling
- [ ] Test fallback to password

## Security Considerations

1. **Credential Storage**: Public keys stored server-side, private keys never leave device
2. **User Verification**: Requires biometric or PIN verification
3. **Attestation**: Optional attestation for enterprise use cases
4. **Transport Security**: HTTPS required for WebAuthn
5. **Domain Binding**: Credentials bound to specific domain

## Troubleshooting

### "Biometric authentication not supported"
- Ensure HTTPS connection
- Check browser compatibility
- Verify device has biometric hardware

### "Failed to create credential"
- User cancelled the prompt
- Biometric hardware not available
- Browser doesn't support WebAuthn

### "Authentication failed"
- Credential may have been deleted
- Biometric verification failed
- User cancelled the prompt

## Implementation Status (No-BS)

| Item | Status |
|------|--------|
| BiometricDeviceManager | `src/components/BiometricDeviceManager.tsx` – calls `biometric-manager` |
| PasskeyAuthentication | `src/components/PasskeyAuthentication.tsx` |
| PasskeyRegistration | `src/components/PasskeyRegistration.tsx` |
| ProfileSettings / BiometricSettings | `src/components/ProfileSettings.tsx`, `BiometricSettings.tsx` |
| biometric-manager edge function | `supabase/functions/biometric-manager/index.ts` (list-devices, delete-device, update-last-used) |
| webauthn_credentials table | `supabase/migrations/20240119_biometric_auth.sql` + RLS in 20240122_* |

## Future Enhancements

1. **Conditional UI**: Show biometric button only if credentials exist
2. **Auto-fill**: Browser autofill integration
3. **Cross-device**: Sync credentials across devices (requires platform support)
4. **Backup codes**: Generate backup codes for device loss
5. **Admin controls**: Enterprise policy management
