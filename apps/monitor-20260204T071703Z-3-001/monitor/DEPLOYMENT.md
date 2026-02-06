# 🚀 Monitor App Deployment Guide

## Deploy to Vercel with addictware.com

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard:**
   https://vercel.com/dashboard

2. **Import Project:**
   - Click **"Add New Project"**
   - Select **"Import Git Repository"**
   - Choose your `cevict-live` repository
   - **Root Directory:** `apps/monitor`
   - **Framework Preset:** Next.js (auto-detected)
   - Click **"Deploy"**

3. **Add Environment Variables:**
   - Go to: **Settings → Environment Variables**
   - Add all variables from `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ANTHROPIC_API_KEY=sk-ant-...
     ```

4. **Add Custom Domain (addictware.com):**
   - Go to: **Settings → Domains**
   - Add domain: `addictware.com`
   - Add domain: `www.addictware.com`
   - Follow DNS instructions

5. **Configure DNS:**
   - Add CNAME record:
     ```
     Type: CNAME
     Name: @ (or www)
     Value: cname.vercel-dns.com
     TTL: 600
     ```

### Option 2: Deploy via Vercel CLI

```powershell
cd apps/monitor
vercel login
vercel --prod
```

Then add domain in Vercel dashboard.

---

## ⚠️ Important: Remote Control Limitations

**The command center's Start/Stop/Restart buttons will NOT work when deployed to Vercel** because:
- Vercel is serverless (no access to your local machine)
- PowerShell commands need to run on your Windows machine
- The control endpoint executes local commands

### What WILL Work Remotely:
- ✅ Status monitoring (health checks)
- ✅ Metrics display (trades, P&L, accuracy)
- ✅ Risk factors management (saves to Supabase)
- ✅ AI messaging (sends to inboxes)
- ✅ Live logs viewer (if you add log streaming)
- ✅ All read-only features

### What WON'T Work Remotely:
- ❌ Start/Stop/Restart commands (requires local PowerShell)
- ❌ Real-time log streaming (would need WebSocket/SSH tunnel)

---

## 🔧 Solution: Hybrid Approach

### Option A: Deploy to Vercel + Use Tunnel for Control

1. Deploy monitor app to Vercel → `https://addictware.com`
2. Use ngrok/Cloudflare Tunnel for command center:
   ```powershell
   # Install ngrok
   npm install -g ngrok
   
   # Start monitor locally
   cd apps/monitor
   npm run dev
   
   # In another terminal, create tunnel
   ngrok http 3010
   ```
3. Access command center via tunnel URL when you need control

### Option B: Deploy to Railway (Can Execute Commands)

Railway allows SSH access and can execute commands, but requires:
- Setting up SSH keys
- More complex deployment
- Higher cost than Vercel free tier

---

## 📋 Quick Deploy Checklist

- [ ] Deploy to Vercel
- [ ] Add environment variables
- [ ] Configure addictware.com domain
- [ ] Test monitoring features
- [ ] Document that control commands are local-only
- [ ] Add note in UI about remote limitations

---

## 🌐 After Deployment

Your command center will be available at:
- **Primary:** `https://addictware.com/command-center`
- **Vercel URL:** `https://monitor-xxxxx.vercel.app/command-center`

**Note:** Control commands (Start/Stop/Restart) will show a message that they're local-only when accessed remotely.


