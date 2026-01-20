# Google Login Not Working - Quick Fix Guide

## Immediate Checks

### 1. Check Browser Console
Open browser developer tools (F12) and check for errors when clicking "Continue with Google"

### 2. Verify Supabase Configuration

**Step 1: Enable Google Provider**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it **ON** (enabled)

**Step 2: Add Google Credentials**
1. In the Google provider settings, you need:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
2. If you don't have these, follow "Create Google OAuth App" below

**Step 3: Configure Redirect URLs**
1. Go to: **Authentication** → **URL Configuration**
2. Set **Site URL** to your domain:
   - Production: `https://yourdomain.com`
   - Local: `http://localhost:5173`
3. Add to **Redirect URLs** list:
   - Production: `https://yourdomain.com`
   - Local: `http://localhost:5173`

### 3. Create Google OAuth App (If Not Done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Navigate to: **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (if prompted)
6. Set Application type: **Web application**
7. Add **Authorized redirect URIs**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
8. Copy the **Client ID** and **Client Secret**
9. Paste them into Supabase Google provider settings

### 4. Common Error Messages

**"OAuth provider not configured"**
- Google provider not enabled in Supabase
- Missing Client ID/Secret

**"Redirect URL mismatch"**
- Redirect URL not whitelisted in Supabase
- Redirect URI not added in Google Console

**"Access blocked"**
- OAuth consent screen not configured
- App in testing mode (publish it for production)

## Testing the Fix

1. Clear browser cache and cookies
2. Click "Continue with Google"
3. Check browser console for logs:
   - "Initiating google OAuth login..."
   - "OAuth redirect initiated successfully"
4. You should be redirected to Google login
5. After authorization, redirected back to your app
6. User should be logged in with profile picture

## Still Not Working?

Check the browser console for specific error messages and refer to OAUTH_SETUP.md for detailed troubleshooting.
