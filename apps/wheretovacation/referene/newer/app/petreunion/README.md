# 🐕 PetReunion - Lost Pet Recovery System

**Status: ✅ READY FOR USE**

PetReunion is a FREE public service to help reunite lost pets with their families.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Database Table

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql
2. Open the file: `supabase/migrations/create_lost_pets_table.sql`
3. Copy the entire SQL and paste into SQL Editor
4. Click "Run" (or Ctrl+Enter)
5. You should see: "Success. No rows returned"

### Step 2: Verify Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Test It!

1. Start the dev server: `pnpm dev`
2. Go to: http://localhost:3000/petreunion/report
3. Fill out the form and submit
4. You should see the success page!

## 📍 URLs

- **Report Lost Pet:** `/petreunion/report`
- **View Pet Report:** `/petreunion/lost/[id]`
- **Success Page:** `/petreunion/success?id=[id]`

## ✅ What's Working

- ✅ Complete 4-step form (Basic Info → When/Where → Details → Contact)
- ✅ Auto-save to localStorage (draft recovery)
- ✅ Photo upload (base64)
- ✅ Form validation
- ✅ API route for submissions
- ✅ Database storage (Supabase)
- ✅ Success page with sharing
- ✅ Lost pet viewing page
- ✅ Breed/color auto-correction

## 🎯 Features

- **FREE for everyone** - No registration required
- **Photo uploads** - Help people identify the pet
- **Location-based** - Search by city/state
- **Reward system** - Optional reward amount
- **Share functionality** - Spread the word
- **Mobile-friendly** - Works on all devices

## 📝 Notes

- The app works even if the database table doesn't exist yet (returns mock data)
- Once you run the migration, all reports will be saved to Supabase
- Reports are public (anyone can view) - this is intentional for a public service

## 🆘 Troubleshooting

**"Database not configured" error:**
- Check your `.env.local` file has Supabase credentials

**"Table does not exist" error:**
- Run the SQL migration in Supabase SQL Editor

**Form not submitting:**
- Check browser console for errors
- Verify API route is accessible at `/api/petreunion/report-lost`

---

**Ready to help reunite pets! 🐾**

