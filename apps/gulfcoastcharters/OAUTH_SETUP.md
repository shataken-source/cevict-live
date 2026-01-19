# OAuth Social Login Setup Guide

This guide explains how to configure OAuth social login with Google, Facebook, and Twitter for your Charter Booking Platform.

## Features Implemented

✅ Google OAuth Login
✅ Facebook OAuth Login  
✅ Twitter OAuth Login
✅ Automatic profile picture import
✅ Auto-fill user data from social profiles
✅ Profile data synchronization
✅ Seamless authentication flow

## Prerequisites

You need to create OAuth applications for each provider and configure them in Supabase.

## 1. Google OAuth Setup

### Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure consent screen if prompted
6. Application type: "Web application"
7. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
8. Copy Client ID and Client Secret

### Configure in Supabase
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Paste Client ID and Client Secret
4. Save configuration

## 2. Facebook OAuth Setup

### Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Copy App ID and App Secret

### Configure in Supabase
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Facebook provider
3. Paste App ID as Client ID
4. Paste App Secret as Client Secret
5. Save configuration

## 3. Twitter OAuth Setup

### Create Twitter App
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Add callback URL:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret

### Configure in Supabase
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Twitter provider
3. Paste Client ID and Client Secret
4. Save configuration

## How It Works

### Authentication Flow
1. User clicks social login button (Google/Facebook/Twitter)
2. Redirected to provider's OAuth consent screen
3. User authorizes the application
4. Provider redirects back with authentication token
5. Supabase validates token and creates session
6. Profile data automatically extracted and saved

### Profile Data Extraction
The system automatically extracts:
- **Full Name**: From social profile
- **Email**: From social account
- **Profile Picture**: High-quality avatar from provider
- **Provider Info**: Which service was used to login

### Data Stored
```typescript
{
  id: string;              // Unique user ID
  email: string;           // Email from social account
  name: string;            // Full name from profile
  profilePicture: string;  // Avatar URL from provider
  provider: string;        // 'google' | 'facebook' | 'twitter'
}
```

## Testing OAuth Login

### Test Google Login
1. Click "Continue with Google" button
2. Select Google account
3. Authorize permissions
4. Redirected back with profile data populated

### Test Facebook Login
1. Click "Continue with Facebook" button
2. Login to Facebook if needed
3. Authorize app permissions
4. Profile picture and name auto-filled

### Test Twitter Login
1. Click "Continue with Twitter" button
2. Authorize the application
3. Profile data imported automatically

## Profile Picture Display

Profile pictures are displayed in:
- User profile modal (80x80 rounded)
- Navigation bar user menu
- Booking history
- Review submissions

## Security Features

✅ Secure OAuth 2.0 flow
✅ Token validation by Supabase
✅ HTTPS required for callbacks
✅ CORS headers configured
✅ Session management
✅ Automatic token refresh

## Troubleshooting

### Google Login Not Working
**Common Issues:**
1. **OAuth Provider Not Enabled in Supabase**
   - Go to Supabase Dashboard > Authentication > Providers
   - Ensure Google is enabled and configured with valid credentials
   
2. **Redirect URL Not Whitelisted**
   - In Supabase Dashboard > Authentication > URL Configuration
   - Add your site URL to "Site URL" field
   - Add your site URL to "Redirect URLs" list
   - Format: `https://yourdomain.com` or `http://localhost:5173` for local
   
3. **Google OAuth Credentials Invalid**
   - Verify Client ID and Secret are correct in Supabase
   - Check that redirect URI in Google Console matches: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Ensure OAuth consent screen is published (not in testing mode for production)

4. **Browser Blocking Popups**
   - OAuth opens in same window, not popup
   - Check browser console for CORS errors
   - Clear browser cache and cookies

5. **Session Not Persisting**
   - Check that auth state change listener is working
   - Verify oauth-profile-sync function is deployed
   - Check browser console for function invocation errors

### OAuth Redirect Not Working
- Verify callback URL matches exactly in provider settings
- Check Supabase project URL is correct
- Ensure HTTPS is used (required for OAuth in production)
- For local development, use `http://localhost:5173` (HTTP is allowed)

### Profile Picture Not Loading
- Check CORS settings on image URLs
- Verify provider returns avatar_url in metadata
- Check browser console for errors

### Email Not Auto-Filled
- Ensure email scope is requested in OAuth
- Check provider permissions include email access
- Verify email is verified on provider account

### Testing Locally
For local development (localhost):
1. Add `http://localhost:5173` to Supabase Redirect URLs
2. Set Site URL to `http://localhost:5173`
3. Google OAuth will work on localhost without HTTPS

## API Reference

### OAuth Profile Sync Function
```typescript
await supabase.functions.invoke('oauth-profile-sync', {
  body: {
    userId: 'user-id',
    provider: 'google',
    metadata: {
      avatar_url: 'https://...',
      full_name: 'John Doe',
      email: 'john@example.com'
    }
  }
});
```

## Support

For issues or questions:
1. Check Supabase Auth logs
2. Verify OAuth app configurations
3. Test with different accounts
4. Check browser console for errors

## Next Steps

- Configure additional OAuth providers (GitHub, LinkedIn)
- Add profile picture upload for email users
- Implement account linking (merge OAuth with email accounts)
- Add two-factor authentication
