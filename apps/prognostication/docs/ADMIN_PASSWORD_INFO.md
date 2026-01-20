# 🔐 Admin Password Information

## Admin Page Access

**URL**: `http://localhost:3005/admin` (local) or `https://prognostication.com/admin` (production)

## Default Admin Password

**Password**: `Prognostication2026!`

This password has been set in `.env.local` for local development.

## Environment Variable

The admin password is stored in:
- **Variable Name**: `ADMIN_PASSWORD`
- **Location**: `.env.local` (local) or Vercel Environment Variables (production)

## How It Works

1. User visits `/admin`
2. `AdminAuth` component shows password prompt
3. Password is sent to `/api/admin/auth` (POST)
4. Server compares with `process.env.ADMIN_PASSWORD`
5. If match, session is stored in `sessionStorage` as `admin_auth=authenticated`

## Security Notes

⚠️ **IMPORTANT**: 
- Change this password in production!
- Never commit `.env.local` to git (it's in `.gitignore`)
- Use a strong password in Vercel environment variables
- The password is stored in plain text in environment variables (server-side only)

## Changing the Password

### Local Development:
Edit `apps/prognostication/.env.local`:
```bash
ADMIN_PASSWORD=your_new_password_here
```

### Production (Vercel):
1. Go to Vercel Dashboard → Prognostication Project
2. Settings → Environment Variables
3. Add/Update `ADMIN_PASSWORD`
4. Select environments: Production, Preview, Development
5. Redeploy

## Alternative Variable Name

The system also checks `PROGNOSTICATION_ADMIN_PASSWORD` as a fallback:
```bash
PROGNOSTICATION_ADMIN_PASSWORD=your_password_here
```

## Current Status

✅ Password set in `.env.local`  
⚠️ Check Vercel for production password

