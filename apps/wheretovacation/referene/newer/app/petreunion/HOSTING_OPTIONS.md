# 🌐 PetReunion Hosting Options

## ✅ You DON'T Need Porkbun (Unless You Want a Custom Domain)

---

## 🚀 Option 1: ngrok (Instant - Use Today!)

**Best for:** Testing right now, sharing with shelter worker immediately

### Setup (2 minutes):
```bash
# 1. Install ngrok
npm install -g ngrok
# OR download from: https://ngrok.com/download

# 2. Start your app
cd apps/wheretovacation
pnpm dev
# App runs on http://localhost:3000

# 3. In new terminal, create tunnel
ngrok http 3000
```

**You get:** `https://abc123.ngrok.io` (free, changes each restart)

**Send to shelter worker:** `https://abc123.ngrok.io/petreunion/shelter/login`

✅ **Pros:** Instant, free, no setup  
⚠️ **Cons:** URL changes each time (unless you pay for static URL)

---

## 🚀 Option 2: Vercel (Permanent Free URL - RECOMMENDED)

**Best for:** Permanent solution, always online, professional

### Setup (10 minutes):

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd apps/wheretovacation
   vercel
   # Follow prompts:
   # - Link to existing project? No
   # - Project name: petreunion (or whatever)
   # - Directory: ./
   # - Override settings? No
   ```

4. **Add Environment Variables:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
     ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

**You get:** `https://petreunion.vercel.app` (or similar - permanent!)

**Send to shelter worker:** `https://petreunion.vercel.app/petreunion/shelter/login`

✅ **Pros:** Permanent URL, always online, free, professional  
⚠️ **Cons:** Takes 10 minutes to set up

---

## 🌐 Option 3: Custom Domain (Porkbun + Vercel)

**Best for:** Want `petreunion.org` or custom domain

### Setup:

1. **Buy domain from Porkbun:**
   - Go to: https://porkbun.com
   - Search for domain (e.g., `petreunion.org`)
   - Purchase

2. **Deploy to Vercel** (see Option 2 above)

3. **Connect domain in Vercel:**
   - Vercel Dashboard → Your Project → Settings → Domains
   - Add domain: `petreunion.org`
   - Vercel gives you DNS records

4. **Update DNS in Porkbun:**
   - Go to Porkbun DNS settings
   - Add the DNS records Vercel provided
   - Wait 24-48 hours for propagation

**You get:** `https://petreunion.org` (custom domain!)

✅ **Pros:** Professional custom domain  
⚠️ **Cons:** Costs money (~$10/year for domain), takes time

---

## 💡 My Recommendation

**For RIGHT NOW:**
- Use **ngrok** (Option 1) - Get it working in 2 minutes
- Share URL with shelter worker immediately

**For LONG TERM:**
- Deploy to **Vercel** (Option 2) - Free, permanent, professional
- Takes 10 minutes, worth it!

**For CUSTOM DOMAIN (Optional):**
- Only if you want `petreunion.org` or similar
- Not required - Vercel free URL works perfectly!

---

## 🎯 Quick Decision Guide

**Need it working TODAY?**
→ Use ngrok (Option 1)

**Want permanent solution?**
→ Use Vercel (Option 2)

**Want custom domain?**
→ Use Porkbun + Vercel (Option 3)

---

## 📝 Important Notes

- **No hosting account needed** - Vercel/ngrok handle it
- **Porkbun is just for domains** - Not required unless you want custom domain
- **Free options available** - ngrok and Vercel both have free tiers
- **Database is separate** - Supabase handles database (already set up)

---

## ✅ What You Actually Need

1. ✅ **Code** - Already done!
2. ✅ **Database** - Supabase (already set up)
3. ⚠️ **Hosting** - Choose one:
   - ngrok (instant)
   - Vercel (permanent, recommended)
   - Custom domain (optional)

**That's it!** No Porkbun hosting account needed unless you want a custom domain.

