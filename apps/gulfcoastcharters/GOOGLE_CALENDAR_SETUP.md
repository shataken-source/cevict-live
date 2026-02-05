# Google Calendar Integration Setup Guide

## Step 1: Choose Your Client ID

You have two OAuth 2.0 Client IDs:
- ✅ **"Web client 2"** - Use this one (user-created, can be modified)
- ❌ **"New Actions on Google App"** - Don't use (auto-generated, can't be modified)

## Step 2: Get Your Client ID and Secret

1. Click on **"Web client 2"** in the Google Cloud Console
2. You'll see:
   - **Client ID**: Copy this (starts with `136898642164-...`)
   - **Client secret**: Click "Show" or "Reset" to see it

## Step 3: Configure Authorized Redirect URIs

In the "Web client 2" settings, find **"Authorized redirect URIs"** and add:

### For Local Development:
```
http://localhost:3000/api/auth/google/callback
```

### For Production (when you deploy):
```
https://yourdomain.com/api/auth/google/callback
```

**Important:** The redirect URI must match exactly, including:
- Protocol (`http://` or `https://`)
- Domain
- Port (if using localhost)
- Path (`/api/auth/google/callback`)

## Step 4: Add to Environment Variables

Add these to your `apps/gulfcoastcharters/.env.local` file:

```env
# Google Calendar Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=136898642164-3ugj...your-full-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Important:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - This is public and safe to expose in frontend code
- `GOOGLE_CLIENT_SECRET` - This is private and should NEVER be exposed in frontend code (only used server-side)

## Step 5: Restart Your Dev Server

After adding the environment variables:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

## Step 6: Test the Integration

1. Go to your Captain Dashboard
2. Click **Operations** tab
3. Click **Sync** tab
4. Click **"Connect Google Calendar"**
5. You should be redirected to Google to authorize
6. After authorization, you'll be redirected back and see "Connected to Google Calendar"

## Troubleshooting

### Error: "invalid_client"
- ✅ Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
- ✅ Make sure the redirect URI in Google Console matches exactly
- ✅ Restart your dev server after adding env variables

### Error: "redirect_uri_mismatch"
- ✅ The redirect URI in Google Console must match exactly: `http://localhost:3000/api/auth/google/callback`
- ✅ Check for typos, extra spaces, or missing slashes

### Still seeing "not configured" message
- ✅ Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is in `.env.local` (not just `.env`)
- ✅ Make sure it's not set to `'YOUR_GOOGLE_CLIENT_ID'` (the placeholder)
- ✅ Restart your dev server

## Security Notes

- The Client ID is public and safe to expose in frontend code
- The Client Secret must remain private and is only used server-side
- Never commit `.env.local` to git (it should be in `.gitignore`)
- For production, set these in your hosting platform's environment variables (Vercel, etc.)
