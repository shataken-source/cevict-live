# WebAuthn/FIDO2 Biometric Authentication Guide

## Overview
CharterConnect now supports WebAuthn/FIDO2 passkey authentication, allowing users to sign in using:
- **Biometric authentication**: Fingerprint, Face ID, Touch ID
- **Hardware security keys**: YubiKey, Titan Security Key, etc.
- **Platform authenticators**: Windows Hello, Android biometrics, iOS Face ID/Touch ID

## Features

### For Users
1. **Passwordless Login**: Sign in with just your fingerprint or face
2. **Multiple Devices**: Register passkeys on different devices
3. **Enhanced Security**: Phishing-resistant authentication
4. **Device Management**: View and remove registered passkeys
5. **Fallback Options**: Password and 2FA still available

### For Administrators
- Progressive enhancement (optional but recommended)
- Works alongside existing password/2FA systems
- Secure credential storage
- Device tracking and management

## User Guide

### Registering a Passkey

1. **Navigate to Profile Settings**
   - Click your profile icon
   - Select "Profile Settings"
   - Scroll to "Biometric Authentication" section

2. **Add New Passkey**
   - Click "Add Passkey" button
   - Enter a device name (e.g., "iPhone 15 Pro", "MacBook Pro")
   - Click "Register Passkey"

3. **Complete Device Verification**
   - Follow your device's prompt
   - Use fingerprint, face scan, or PIN
   - Confirm registration

4. **Success**
   - Your passkey is now registered
   - You can use it to sign in

### Signing In with Passkey

1. **On Login Page**
   - Click "Sign in with Passkey" option
   - Your device will prompt for verification
   - Use your fingerprint, face, or security key
   - Instant authentication

2. **Fallback Options**
   - Click "Use password instead" if needed
   - Password and 2FA remain available

### Managing Passkeys

**View Registered Passkeys**
- Profile Settings → Biometric Authentication
- See all registered devices
- View registration and last used dates

**Remove Passkey**
- Click trash icon next to device
- Confirm removal
- Device will need re-registration to use again

## Technical Implementation

### Components

**PasskeyRegistration.tsx**
- Handles passkey registration flow
- Creates WebAuthn credentials
- Stores device information
- Browser compatibility check

**PasskeyAuthentication.tsx**
- Manages authentication flow
- Verifies credentials
- Handles user verification
- Error handling and fallbacks

**ProfileSettings.tsx**
- Passkey management UI
- List registered authenticators
- Add/remove passkeys
- Device name editing

### Edge Function: webauthn-manager

**Actions:**
- `generate-challenge`: Create authentication challenge
- `register`: Store new passkey credential
- `authenticate`: Verify passkey assertion
- `list`: Get user's registered passkeys
- `delete`: Remove passkey
- `rename`: Update device name

### Browser Support

**Supported Browsers:**
- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 18+
- Opera 54+

**Supported Platforms:**
- Windows 10+ (Windows Hello)
- macOS 10.15+ (Touch ID, Face ID)
- iOS 14+ (Face ID, Touch ID)
- Android 9+ (Fingerprint, Face unlock)

## Security Features

1. **Phishing Resistant**
   - Credentials tied to domain
   - Cannot be used on fake sites

2. **No Shared Secrets**
   - Public key cryptography
   - Private keys never leave device

3. **Device Attestation**
   - Verify authenticator authenticity
   - Track device types

4. **User Verification**
   - Biometric or PIN required
   - Multi-factor by design

## Best Practices

### For Users
1. Register passkeys on multiple devices
2. Keep device firmware updated
3. Use strong device PINs/passwords
4. Don't share devices with passkeys

### For Administrators
1. Encourage passkey adoption
2. Keep password option available
3. Monitor passkey usage
4. Educate users on benefits

## Troubleshooting

### "Passkey not supported"
- Update your browser
- Check device compatibility
- Enable biometrics in device settings

### "Registration failed"
- Ensure biometrics are set up
- Try different device
- Check browser permissions

### "Authentication cancelled"
- User cancelled prompt
- Biometric verification failed
- Try again or use password

### "Passkey not found"
- Device not registered
- Passkey was removed
- Register new passkey

## API Reference

### Register Passkey
```javascript
const { data } = await supabase.functions.invoke('webauthn-manager', {
  body: {
    action: 'register',
    userId: 'user-id',
    deviceName: 'Device Name',
    credentialData: { /* credential info */ }
  }
});
```

### Authenticate
```javascript
const { data } = await supabase.functions.invoke('webauthn-manager', {
  body: {
    action: 'authenticate',
    credentialId: 'credential-id',
    credentialData: { /* assertion data */ }
  }
});
```

### List Passkeys
```javascript
const { data } = await supabase.functions.invoke('webauthn-manager', {
  body: {
    action: 'list',
    userId: 'user-id'
  }
});
```

## Future Enhancements

- Conditional UI (autofill)
- Cross-device authentication
- Backup authenticators
- Enterprise policies
- Advanced attestation

## Support

For issues or questions:
- Check browser console for errors
- Verify device compatibility
- Contact support with device details
- Include error messages

---

**Note**: Passkeys are the future of authentication - secure, convenient, and phishing-resistant!
