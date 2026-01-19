# 🎣 START HERE - Complete Setup in 5 Minutes

## 📋 PRE-FLIGHT CHECKLIST

Before you begin, make sure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ A Supabase account ([Sign up](https://supabase.com))
- ✅ Your Supabase project: `rdbuwyefbgnbuhmjrizo`

---

## 🚀 QUICK START (Choose One Method)

### Method 1: Automated Setup (Recommended - 5 minutes)

```bash
# Run the automated setup script
npm run setup

# Follow the on-screen instructions
```

This script will:
1. Check your Node.js version
2. Create .env.local from template
3. Install all dependencies
4. Guide you through database setup

### Method 2: Manual Setup (10 minutes)

Follow the steps below for full control over the setup process.

---

## 📝 MANUAL SETUP STEPS

### STEP 1: Database Setup (2 minutes)

This is the MOST IMPORTANT step - it creates your entire database!

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql
   ```

2. **Click "New Query"**

3. **Open the file**: `COMPLETE_DATABASE_SETUP.sql`

4. **Copy the ENTIRE file contents**

5. **Paste into SQL Editor**

6. **Click "Run"** (or press Ctrl+Enter)

7. **Wait ~30 seconds**

8. **Verify success**: You should see "DATABASE SETUP COMPLETE!"

✅ **What this creates**:
- 21 tables (users, captains, bookings, reviews, etc.)
- All indexes for performance
- All functions (points system, ratings)
- All triggers (auto-updates)
- Security policies (RLS)
- 10 starter badges

---

### STEP 2: Environment Configuration (1 minute)

1. **Copy the template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Get your Supabase credentials**:
   - Go to: `https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/api`
   - You'll need:
     - Project URL (starts with https://...)
     - anon/public key (starts with eyJ...)
     - service_role key (starts with eyJ...)

3. **Update .env.local**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

---

### STEP 3: Install Dependencies (2 minutes)

```bash
npm install
```

This installs all required packages:
- Next.js (React framework)
- Supabase client
- TailwindCSS (styling)
- Leaflet (maps)
- And more...

---

### STEP 4: Start Development Server (30 seconds)

```bash
npm run dev
```

Open your browser to: `http://localhost:3000`

You should see your charter booking platform! 🎉

---

## 🧪 TEST YOUR SETUP

### Create a Test User

1. Click "Sign Up" in your app
2. Register with email
3. Check your profile is created

### Create a Test Captain

```sql
-- Run in Supabase SQL Editor
-- Replace 'your-user-id' with your actual user ID from the profiles table

INSERT INTO captain_profiles (
  user_id, 
  boat_name, 
  boat_type, 
  hourly_rate,
  half_day_rate,
  full_day_rate
)
VALUES (
  'your-user-id', 
  'Test Boat', 
  'Center Console', 
  100.00,
  400.00,
  800.00
);
```

### Test Points System

```sql
-- Award yourself some points
SELECT * FROM award_points(
  'your-user-id',
  25,
  'TEST',
  'Testing points system'
);

-- Check your points
SELECT * FROM user_stats WHERE user_id = 'your-user-id';
```

---

## 🚀 DEPLOYMENT

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Add environment variables** in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add all variables from `.env.local`

### Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Add environment variables** in Netlify Dashboard

---

## 📁 PROJECT FILES OVERVIEW

```
charter-booking-platform/
├── COMPLETE_DATABASE_SETUP.sql  ← Run this first!
├── .env.local.example          ← Copy to .env.local
├── package.json                ← Dependencies
├── next.config.js              ← Next.js config
├── tailwind.config.js          ← Styling config
├── README.md                   ← Full documentation
├── deploy.sh                   ← Quick deploy script
├── lib/
│   └── supabase.js            ← Database client
└── scripts/
    └── setup.js               ← Automated setup
```

---

## ⚠️ TROUBLESHOOTING

### "Database connection failed"
- ✅ Check `.env.local` has correct Supabase URL
- ✅ Check Supabase project is active
- ✅ Verify API keys are correct

### "RLS policy violation"
- ✅ Make sure you're logged in
- ✅ Check user has correct permissions
- ✅ Verify RLS policies in database

### "Points not awarding"
```sql
-- Check if function exists
SELECT * FROM award_points('test-id', 10, 'TEST', 'test');

-- Check user_stats table
SELECT * FROM user_stats LIMIT 5;
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 NEED HELP?

1. **Check README.md** - Full documentation
2. **Check troubleshooting section** - Common issues
3. **Check Supabase logs** - Database → Logs
4. **Check browser console** - F12 → Console

---

## ✅ SUCCESS CHECKLIST

After setup, you should be able to:

- [  ] Access app at http://localhost:3000
- [  ] Register a new user
- [  ] View your profile
- [  ] See leaderboard (even if empty)
- [  ] Create a fishing report
- [  ] See points awarded
- [  ] View all 21 database tables in Supabase

---

## 🎯 WHAT'S INCLUDED

Your platform has these features ready to go:

✅ **User System**
- Email authentication
- User profiles
- Password reset

✅ **Captain Marketplace**
- Captain profiles
- Search & filter
- Ratings & reviews

✅ **Booking System**
- Create bookings
- Manage bookings
- Status tracking
- Payment ready

✅ **Community**
- Fishing reports
- Photo/video uploads
- Comments
- Likes

✅ **Gamification**
- Points system
- 10 badges
- Leaderboards
- Streaks

✅ **Location**
- GPS tracking
- Pin locations
- Share with others

✅ **Notifications**
- In-app notifications
- Email ready
- Weather alerts ready

✅ **Security**
- Row Level Security
- Secure authentication
- API protection

---

## 📈 NEXT STEPS

After your platform is running:

1. **Customize branding** - Update colors, logo, name
2. **Add content** - Create test captains and boats
3. **Configure email** - Set up SendGrid for alerts
4. **Set up payments** - Add Stripe for bookings
5. **Test thoroughly** - All features
6. **Deploy to production** - Vercel/Netlify
7. **Launch!** - Start marketing

---

## 🎉 YOU'RE READY!

Your complete charter booking platform is now set up!

**Time to first launch**: ~5 minutes  
**Features**: All included  
**Database**: Production-ready  
**Security**: Enabled  

**Questions?** Check README.md for detailed docs.

**Happy fishing!** 🎣 🌊 ⚓

---

**Built with**: Next.js + Supabase + TailwindCSS  
**Database**: PostgreSQL with PostGIS  
**Deployment**: Vercel/Netlify ready  
**License**: MIT
