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

### Required Edge Function

Create `supabase/functions/biometric-manager/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { action, userId, deviceId } = await req.json();

    switch (action) {
      case 'list-devices': {
        const { data: devices, error } = await supabase
          .from('webauthn_credentials')
          .select('*')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false });

        if (error) throw error;

        const userAgent = req.headers.get('user-agent') || '';
        const enrichedDevices = devices.map((device: any) => ({
          id: device.credential_id,
          device_name: device.device_name || 'Unknown Device',
          device_type: detectDeviceType(device.user_agent || ''),
          last_used: device.last_used_at || device.created_at,
          created_at: device.created_at,
          is_current: device.user_agent === userAgent
        }));

        return new Response(
          JSON.stringify({ success: true, devices: enrichedDevices }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-device': {
        const { error } = await supabase
          .from('webauthn_credentials')
          .delete()
          .eq('credential_id', deviceId)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-last-used': {
        const { error } = await supabase
          .from('webauthn_credentials')
          .update({ 
            last_used_at: new Date().toISOString(),
            user_agent: req.headers.get('user-agent')
          })
          .eq('credential_id', deviceId)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}
```

## Database Schema

Ensure `webauthn_credentials` table exists:

```sql
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  user_agent TEXT,
  counter BIGINT DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);
```

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

- [ ] Deploy `biometric-manager` edge function
- [ ] Verify `webauthn_credentials` table exists
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

## Future Enhancements

1. **Conditional UI**: Show biometric button only if credentials exist
2. **Auto-fill**: Browser autofill integration
3. **Cross-device**: Sync credentials across devices (requires platform support)
4. **Backup codes**: Generate backup codes for device loss
5. **Admin controls**: Enterprise policy management
