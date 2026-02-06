# 🚀 Quick Deploy Instructions

## Step 1: Login to Vercel

```powershell
vercel login
```

This will open your browser to authenticate.

## Step 2: Deploy

**Option A: Use the script**
```powershell
cd C:\cevict-live\apps\monitor\scripts
.\deploy-to-addictware.ps1
```

**Option B: Manual deploy**
```powershell
cd C:\cevict-live\apps\monitor
vercel --prod
```

Follow the prompts:
- Link to existing project? **No** (first time)
- Project name: **monitor** (or **addictware-command-center**)
- Directory: **.** (current)
- Override settings? **No**

## Step 3: Add Domain in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click your project (monitor)
3. **Settings → Domains**
4. Click **"Add Domain"**
5. Enter: `addictware.com`
6. Enter: `www.addictware.com`
7. Copy the DNS records shown

## Step 4: Configure DNS

At your domain registrar (where addictware.com is registered):

**Option A: Use Vercel Nameservers (Easiest)**
- Vercel will show nameservers like: `ns1.vercel-dns.com`
- Update nameservers at your registrar

**Option B: Add DNS Records**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600
```

## Step 5: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjkwMjEsImV4cCI6MjA3OTIwNTAyMX0.uEpMrpomxCCDIEPcPd3GQyFmMKB0eNjLaAjMqaOUKcA
ANTHROPIC_API_KEY=sk-ant-... (your actual key from .env.local)
```

## Step 6: Wait for DNS Propagation

- Usually takes 5-60 minutes
- Check: `https://addictware.com/command-center`
- Vercel URL works immediately: `https://monitor-xxxxx.vercel.app/command-center`

---

## ✅ Done!

Your command center will be available at:
- **Primary:** `https://addictware.com/command-center`
- **Vercel:** `https://monitor-xxxxx.vercel.app/command-center`

**Note:** Control commands (Start/Stop/Restart) require local access. Use `http://localhost:3010/command-center` when at home for full control.


