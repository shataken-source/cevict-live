# Pet of the Day - Facebook Posting Setup

## Overview

This feature automatically posts a random pet from the PetReunion database to Facebook each day as "Pet of the Day". It includes:
- Pet photo
- All pet information (name, breed, color, size, age, location, etc.)
- Status (lost/found)
- Link back to PetReunion

## Setup Instructions

### 1. Create Facebook Page Access Token

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add "Facebook Login" product
4. Go to **Tools** → **Graph API Explorer**
5. Select your Page (not your personal profile)
6. Generate a **Page Access Token** with these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
7. Make the token **permanent** (not temporary):
   - Go to **Settings** → **Basic**
   - Copy **App ID** and **App Secret**
   - Use [Access Token Tool](https://developers.facebook.com/tools/accesstoken/) to exchange for long-lived token
   - Or use Graph API: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}`

### 2. Get Your Facebook Page ID

1. Go to your Facebook Page
2. Click **About** → **Page Info**
3. Find **Page ID** (or use [this tool](https://www.facebook.com/help/1503421039731588))
4. Or use Graph API: `GET /me/accounts` (returns pages you manage with IDs)

### 3. Set Environment Variables

Add to your `.env.local` (for development) and Vercel (for production):

```env
# Facebook Configuration
FACEBOOK_PAGE_ACCESS_TOKEN=your_long_lived_page_access_token
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_API_VERSION=v18.0

# Optional: Cron Secret (for securing cron endpoint)
CRON_SECRET=your_random_secret_string
```

### 4. Create Database Table

Run the SQL script in Supabase:

```sql
-- Run apps/petreunion/supabase/pet-of-the-day-schema.sql
```

Or execute:
```bash
# In Supabase Dashboard → SQL Editor
# Copy and paste the contents of supabase/pet-of-the-day-schema.sql
```

### 5. Test the Feature

#### Preview Mode (No Posting)
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3006/api/pet-of-the-day?action=preview' | ConvertTo-Json -Depth 5
```

#### Manual Post
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3006/api/pet-of-the-day?action=post' | ConvertTo-Json -Depth 5
```

#### Force Post (Even if Already Posted Today)
```powershell
Invoke-RestMethod -Uri 'http://localhost:3006/api/pet-of-the-day?action=post&force=true' | ConvertTo-Json -Depth 5
```

## API Endpoints

### 1. Manual Post/Preview
```
GET /api/pet-of-the-day?action=post|preview&force=true
POST /api/pet-of-the-day
```

**Query Parameters:**
- `action` - `post` (default) or `preview`
- `force` - `true` to post even if already posted today

**POST Body (optional):**
```json
{
  "petId": "optional-specific-pet-id",
  "preview": true
}
```

### 2. Cron Job Endpoint
```
GET /api/cron/pet-of-the-day?secret=YOUR_CRON_SECRET
```

This endpoint is automatically called daily via Vercel Cron (configured in `vercel.json`).

## How It Works

1. **Selection**: Randomly selects a pet from the database that:
   - Has a photo
   - Hasn't been featured in the last 30 days

2. **Formatting**: Creates a formatted Facebook post with:
   - Pet emoji (🐕 for dogs, 🐱 for cats)
   - All pet information
   - Location
   - Status (lost/found)
   - Hashtags for discoverability

3. **Posting**: Posts to Facebook Page with:
   - Formatted message
   - Pet photo (as link preview or uploaded)

4. **Tracking**: Records in `pet_of_the_day` table:
   - Pet ID
   - Post timestamp
   - Facebook post ID
   - Status

## Post Format Example

```
🐕 PET OF THE DAY 🔍

Name: Max
Type: Dog
Breed: Golden Retriever
Color: Golden
Size: Large
Age: 5 years
Gender: Male
Location: Columbus, IN
Lost: 1/15/2026

Description: Friendly golden retriever, loves treats...

Help reunite this pet with their family! 🐾

Visit PetReunion.org to search for matches or report a pet.
#PetOfTheDay #PetReunion #LostPets #FoundPets #Columbus #IN
```

## Automation

### Vercel Cron (Recommended)

Already configured in `vercel.json`:
- Runs daily at 9:00 AM UTC
- Calls `/api/cron/pet-of-the-day`

### External Cron (Alternative)

Use a service like:
- [cron-job.org](https://cron-job.org/)
- [EasyCron](https://www.easycron.com/)
- [Zapier](https://zapier.com/)

Schedule: `0 9 * * *` (9 AM UTC daily)

URL: `https://your-app.vercel.app/api/cron/pet-of-the-day?secret=YOUR_CRON_SECRET`

## Troubleshooting

### "Facebook not configured"
- Check `FACEBOOK_PAGE_ACCESS_TOKEN` is set
- Check `FACEBOOK_PAGE_ID` is set
- Verify token has correct permissions

### "No pets with photos found"
- Ensure pets in database have `photo_url` set
- Check that `photo_url` is not null or empty

### "Pet of the Day already posted today"
- This prevents duplicate posts
- Use `?force=true` to override
- Or wait until next day

### Photo Not Showing
- Facebook may need time to process photo URLs
- Ensure photo URLs are publicly accessible
- Check photo URL format (should be https://)

### Token Expired
- Page Access Tokens can expire
- Generate a new long-lived token (60 days)
- Or use App Access Token for permanent solution

## Security Notes

1. **Cron Secret**: Always set `CRON_SECRET` in production
2. **Token Security**: Never commit Facebook tokens to git
3. **RLS Policies**: Database table has proper RLS policies
4. **Rate Limits**: Facebook has rate limits (typically 600 requests/hour per page)

## Monitoring

Check recent posts:
```sql
SELECT 
  potd.*,
  lp.pet_name,
  lp.pet_type,
  lp.location_city,
  lp.location_state
FROM pet_of_the_day potd
JOIN lost_pets lp ON lp.id = potd.pet_id
ORDER BY potd.posted_at DESC
LIMIT 10;
```

## Future Enhancements

- [ ] Schedule specific pets
- [ ] Multiple posts per day
- [ ] Instagram integration
- [ ] Twitter/X integration
- [ ] Analytics tracking
- [ ] A/B testing post formats
