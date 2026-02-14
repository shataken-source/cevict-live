# 🌐 How to Share PetReunion with Your Shelter Worker

## 🚀 Option 1: Quick Remote Access (5 minutes) - RECOMMENDED

### Use ngrok (Free Tunnel Service)

1. **Install ngrok:**
   ```bash
   # Download from: https://ngrok.com/download
   # Or install via npm:
   npm install -g ngrok
   ```

2. **Start your app:**
   ```bash
   cd apps/wheretovacation
   pnpm dev
   # App runs on http://localhost:3000
   ```

3. **Create tunnel:**
   ```bash
   # In a new terminal:
   ngrok http 3000
   ```

4. **Share the URL:**
   - ngrok will give you a URL like: `https://abc123.ngrok.io`
   - **Send this URL to your shelter worker!**
   - She can access: `https://abc123.ngrok.io/petreunion/report`

**✅ Pros:** Instant, free, no deployment needed  
**⚠️ Cons:** URL changes each time (unless you pay for static URL)

---

## 🚀 Option 2: Deploy to Vercel (Permanent URL) - BEST FOR LONG TERM

### Deploy in 3 Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd apps/wheretovacation
   vercel
   # Follow prompts, say "yes" to everything
   ```

3. **Add Environment Variables:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
     ```
   - Redeploy: `vercel --prod`

4. **Get Your URL:**
   - Vercel gives you: `https://your-project.vercel.app`
   - **Share:** `https://your-project.vercel.app/petreunion/report`

**✅ Pros:** Permanent URL, professional, always online  
**⚠️ Cons:** Takes 10 minutes to set up

---

## 📱 What Your Shelter Worker Needs to Do:

1. **Open the URL you send her** (ngrok or Vercel)
2. **Click:** "Report a Lost Pet" or go to `/petreunion/report`
3. **Fill out the form:**
   - Step 1: Pet info (name, type, breed, color)
   - Step 2: When/where lost
   - Step 3: Details (markings, description)
   - Step 4: Contact info & reward
4. **Upload photo** (optional but helpful)
5. **Submit** - Done! ✅

**That's it!** She can use it from anywhere, on any device (phone, tablet, computer).

---

## 🎯 Quick Start (Right Now):

**Fastest way to share TODAY:**

```bash
# Terminal 1: Start app
cd apps/wheretovacation
pnpm dev

# Terminal 2: Create tunnel
ngrok http 3000

# Copy the https:// URL and send it to her!
```

**She can use it immediately!** 🎉

---

## 💡 Pro Tips:

- **ngrok free tier:** URL changes each restart (fine for testing)
- **ngrok paid:** Get permanent URL like `petreunion.ngrok.io`
- **Vercel:** Best for permanent deployment (free tier available)
- **Database:** Make sure you ran the SQL migration first!

---

**Need help?** The app works even without database (shows mock data), but run the migration for real storage.

