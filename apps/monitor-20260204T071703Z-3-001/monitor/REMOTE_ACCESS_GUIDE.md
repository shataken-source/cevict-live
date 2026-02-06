# 🌐 Remote Access Guide for Command Center

## 🎯 Goal
Access the command center from anywhere (not just your home network) using `addictware.com`

---

## ✅ Recommended Solution: Deploy to Vercel

### Why Vercel?
- ✅ **Free tier** (perfect for monitoring)
- ✅ **Already configured** (vercel.json exists)
- ✅ **Easy custom domain** (addictware.com)
- ✅ **Fast deployment** (5 minutes)
- ✅ **Works with your existing projects** (same platform)

### What Works Remotely:
- ✅ **Status monitoring** - See if projects are running
- ✅ **Metrics dashboard** - Trades, P&L, accuracy
- ✅ **Risk factors** - Adjust trader settings (saves to Supabase)
- ✅ **AI messaging** - Send messages to inboxes
- ✅ **Live logs** - View project logs (if streaming added)

### What Doesn't Work Remotely:
- ❌ **Start/Stop/Restart** - Requires local PowerShell access
- ⚠️ **Control buttons show warning** when accessed remotely

---

## 🚀 Quick Deploy Steps

### 1. Deploy to Vercel

```powershell
cd apps/monitor
vercel login
vercel --prod
```

Or use Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import `cevict-live` repo
4. Set root directory: `apps/monitor`
5. Deploy

### 2. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Add Custom Domain (addictware.com)

In Vercel Dashboard → Settings → Domains:
- Add: `addictware.com`
- Add: `www.addictware.com`
- Follow DNS setup instructions

### 4. Configure DNS

At your domain registrar (where addictware.com is registered):
```
Type: CNAME
Name: @ (or www)
Value: cname.vercel-dns.com
TTL: 600
```

---

## 🔧 Alternative: Use Existing Site + Link

If you already have a deployed site (like petreunion.org, popthepopcorn, etc.), you can:

1. **Add a link/page** to command center
2. **Deploy monitor separately** to Vercel
3. **Link from existing site** → `https://addictware.com/command-center`

Example: Add to `petreunion.org`:
```tsx
<Link href="https://addictware.com/command-center">
  🎛️ Command Center
</Link>
```

---

## 🎛️ For Control Commands (Start/Stop/Restart)

Since control commands need local PowerShell access, you have options:

### Option A: Use ngrok Tunnel (When You Need Control)

```powershell
# Install ngrok
npm install -g ngrok

# Start monitor locally
cd apps/monitor
npm run dev

# In another terminal
ngrok http 3010
```

**Access:** `https://abc123.ngrok.io/command-center`
- ✅ Control commands work
- ⚠️ URL changes each time (unless paid plan)

### Option B: Use Local Access Only

- Deploy to Vercel for remote monitoring
- Use `http://localhost:3010/command-center` when at home for control

### Option C: VPN to Home Network

- Set up VPN (WireGuard, Tailscale, etc.)
- Access `http://[your-home-ip]:3010/command-center`
- ✅ Control commands work
- ✅ Always available

---

## 📋 Deployment Checklist

- [ ] Deploy monitor app to Vercel
- [ ] Add environment variables
- [ ] Configure addictware.com domain
- [ ] Test monitoring features remotely
- [ ] Document control command limitations
- [ ] Add link from existing site (optional)

---

## 🌐 After Deployment

**Remote Access:**
- `https://addictware.com/command-center` - Full monitoring, limited control

**Local Access (for control):**
- `http://localhost:3010/command-center` - Full features including control

**Tunnel Access (when needed):**
- `https://[ngrok-url]/command-center` - Full features including control

---

## 💡 Recommendation

**Best approach:** Deploy to Vercel with addictware.com for remote monitoring, and use local access or ngrok when you need to control projects.

This gives you:
- ✅ Always-available monitoring (Vercel)
- ✅ Professional domain (addictware.com)
- ✅ Control when needed (local/ngrok)
- ✅ Free hosting (Vercel free tier)


