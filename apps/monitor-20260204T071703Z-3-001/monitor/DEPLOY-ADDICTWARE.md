# 🚀 Deploy Command Center to addictware.com

## Quick Deploy Steps

### 1. Install Vercel CLI (if not already installed)
```powershell
npm install -g vercel
```

### 2. Login to Vercel
```powershell
vercel login
```

### 3. Deploy Monitor App
```powershell
cd apps/monitor
vercel --prod
```

**Follow prompts:**
- Link to existing project? **No** (first time)
- Project name: **monitor** (or **addictware-command-center**)
- Directory: **.** (current directory)
- Override settings? **No**

### 4. Add Environment Variables

After deployment, go to Vercel Dashboard:
- **Settings → Environment Variables**
- Add these (from `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjkwMjEsImV4cCI6MjA3OTIwNTAyMX0.uEpMrpomxCCDIEPcPd3GQyFmMKB0eNjLaAjMqaOUKcA
ANTHROPIC_API_KEY=sk-ant-... (your actual key)
```

### 5. Add Custom Domain (addictware.com)

In Vercel Dashboard:
- **Settings → Domains**
- Click **"Add Domain"**
- Enter: `addictware.com`
- Enter: `www.addictware.com`
- Copy the DNS records shown

### 6. Configure DNS

At your domain registrar (where addictware.com is registered):

**For Root Domain (addictware.com):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600
```

**For www (www.addictware.com):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600
```

**OR use Vercel's nameservers** (easier):
- Vercel will show you nameservers like: `ns1.vercel-dns.com`
- Update nameservers at your registrar to use Vercel's

### 7. Wait for DNS Propagation

- Usually takes 5-60 minutes
- Check: `https://addictware.com/command-center`
- Should show command center (even if DNS not fully propagated, Vercel URL works)

---

## ✅ After Deployment

**Access Command Center:**
- **Primary:** `https://addictware.com/command-center`
- **Vercel URL:** `https://monitor-xxxxx.vercel.app/command-center` (works immediately)

**What Works:**
- ✅ Status monitoring
- ✅ Metrics dashboard
- ✅ Risk factors management
- ✅ AI messaging
- ✅ Live logs

**What Shows Warning:**
- ⚠️ Start/Stop/Restart (requires local access)

---

## 🔧 If You Need Control Commands Remotely

Use ngrok tunnel when you need to control projects:

```powershell
# Start monitor locally
cd apps/monitor
npm run dev

# In another terminal
ngrok http 3010
```

Access via ngrok URL for full control.

---

## 📋 Domain Suggestions for Other Projects

Based on your domains, here are suggestions:

- **addictware.com** → Command Center ✅ (you're doing this)
- **prognostication.com** → Prognostication app (already deployed?)
- **petreunion.org** → PetReunion
- **popthepopcorn.com** → PopThePopcorn
- **smokersrights.com** → SmokersRights
- **gulfcoastcharters.com** → Gulf Coast Charters
- **wheretovacation.com** → WhereToVacation
- **cevict.com** → Main CEVICT platform
- **cevict.ai** → AI/ML services

---

## 🎯 Next Steps

1. Run `vercel --prod` in `apps/monitor`
2. Add environment variables in Vercel dashboard
3. Add addictware.com domain
4. Configure DNS
5. Test: `https://addictware.com/command-center`

**Estimated time:** 10-15 minutes


