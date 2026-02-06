# Pet of the Day - Quick Start Guide

## 🚀 Quick Setup

### 1. Facebook Credentials
Get from [Facebook Developers](https://developers.facebook.com/):
- **Page Access Token** (long-lived, with `pages_manage_posts` permission)
- **Page ID** (from your Facebook Page settings)

### 2. Environment Variables
Add to `.env.local` and Vercel:
```env
FACEBOOK_PAGE_ACCESS_TOKEN=your_token_here
FACEBOOK_PAGE_ID=your_page_id_here
CRON_SECRET=random_secret_string
```

### 3. Database Setup
Run in Supabase SQL Editor:
```sql
-- See: supabase/pet-of-the-day-schema.sql
```

### 4. Test It
```powershell
# Preview (no posting)
Invoke-RestMethod -Uri 'http://localhost:3006/api/pet-of-the-day?action=preview' | ConvertTo-Json -Depth 5

# Actually post to Facebook
Invoke-RestMethod -Uri 'http://localhost:3006/api/pet-of-the-day?action=post' | ConvertTo-Json -Depth 5
```

## 📅 Automation

**Vercel Cron** (already configured):
- Runs daily at 9:00 AM UTC
- Endpoint: `/api/cron/pet-of-the-day`

**Manual Trigger**:
- GET `/api/pet-of-the-day?action=post`
- POST `/api/pet-of-the-day` (with optional `petId` in body)

## 📋 What Gets Posted

- Pet photo
- Name, breed, color, size, age, gender
- Location (city, state)
- Status (lost/found) and date
- Description
- Link to PetReunion
- Hashtags (#PetOfTheDay #PetReunion #LostPets)

## 🔒 Features

- ✅ Prevents duplicate posts (once per day)
- ✅ Avoids recently featured pets (30-day cooldown)
- ✅ Only selects pets with photos
- ✅ Tracks all posts in database
- ✅ Preview mode for testing

## 📖 Full Documentation

See `FACEBOOK_PET_OF_THE_DAY_SETUP.md` for detailed setup instructions.
