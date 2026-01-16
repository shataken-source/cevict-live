# OAuth Setup Guide for PetReunion

## Overview

PetReunion now supports OAuth login with Google, Apple, and GitHub. This guide will help you configure these providers.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **OAuth Provider Accounts**: You need developer accounts with:
   - Google Cloud Console (for Google OAuth)
   - Apple Developer Account (for Apple Sign In)
   - GitHub (for GitHub OAuth)

## Step 1: Configure OAuth in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Enable the providers you want to use (Google, Apple, GitHub)

### Google OAuth Setup

1. In Supabase, click **Google** provider
2. Enable it
3. You'll need to create OAuth credentials in Google Cloud Console:
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add your Supabase redirect URL:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**
4. Paste them into Supabase Google provider settings
5. Save

### Apple OAuth Setup

1. In Supabase, click **Apple** provider
2. Enable it
3. You'll need:
   - **Services ID** from Apple Developer Portal
   - **Team ID** from Apple Developer Portal
   - **Key ID** and **Private Key** from Apple Developer Portal
4. Follow Supabase's Apple setup guide for detailed instructions
5. Save

### GitHub OAuth Setup

1. In Supabase, click **GitHub** provider
2. Enable it
3. Create a GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click **New OAuth App**
   - Application name: Your app name
   - Homepage URL: Your app URL
   - Authorization callback URL:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and generate a **Client Secret**
4. Paste them into Supabase GitHub provider settings
5. Save

## Step 2: Configure Redirect URLs

In your Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add your site URLs to **Redirect URLs**:
   ```
   https://petreunion.org/auth/callback
   https://petreunion.vercel.app/auth/callback
   http://localhost:3007/auth/callback (for local development)
   ```

## Step 3: Verify Environment Variables

Make sure these are set in your Vercel project (or `.env.local` for local dev):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Test OAuth Login

1. Go to `/auth/login` or `/auth/signup`
2. Click on one of the OAuth buttons (Google, Apple, GitHub)
3. You should be redirected to the provider's login page
4. After authorizing, you'll be redirected back to your app

## Troubleshooting

### "OAuth is not configured" Error

This means the provider isn't enabled in Supabase:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable the provider you want to use
3. Make sure Client ID and Client Secret are set correctly

### "Supabase is not configured" Error

This means environment variables are missing:
1. Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. In Vercel: Go to Project Settings → Environment Variables
3. Make sure they're set for the correct environment (Production, Preview, Development)
4. Redeploy after adding variables

### Redirect URI Mismatch

If you see a redirect URI error:
1. Check that your redirect URLs match exactly in:
   - Google Cloud Console (Authorized redirect URIs)
   - GitHub OAuth App (Authorization callback URL)
   - Supabase (URL Configuration → Redirect URLs)

### OAuth Button Not Working

1. Check browser console for errors
2. Verify Supabase client is initialized (check network tab)
3. Make sure the provider is enabled in Supabase dashboard

## Security Notes

- Never commit OAuth secrets to git
- Use environment variables for all sensitive data
- Regularly rotate OAuth credentials
- Use HTTPS in production (required for OAuth)

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github)

