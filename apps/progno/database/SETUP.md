# PROGNO Database Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `progno-predictions` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)

## Step 2: Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** (under "Project API keys" - the `service_role` one, NOT the `anon` key)

## Step 3: Run the Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `apps/progno/database/schema.sql` from this repo
4. Copy ALL the SQL code
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

## Step 4: Verify Tables Created

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - `progno_predictions`
   - `progno_outcomes`
   - `progno_accuracy_metrics`
3. Click on `progno_predictions` to see its structure

## Step 5: Set Environment Variables

### For Local Development

Create/update `apps/progno/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### For Vercel Deployment

1. Go to Vercel Dashboard → Your PROGNO project
2. Go to **Settings** → **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
4. Redeploy the project

## Step 6: Install Dependencies

```bash
cd apps/progno
npm install
```

## Step 7: Test the Connection

The API endpoints will automatically work once environment variables are set. Test by:

1. Starting the dev server: `npm run dev`
2. Creating a test prediction via the API
3. Checking Supabase Table Editor to see if it appears

## Troubleshooting

### "Database not configured" error
- Check that environment variables are set correctly
- Make sure you're using the `service_role` key, not `anon` key
- Restart your dev server after adding env vars

### Tables don't exist
- Make sure you ran the entire `schema.sql` file
- Check for any SQL errors in Supabase SQL Editor
- Verify you're in the correct project

### Can't connect to Supabase
- Check your internet connection
- Verify the Supabase URL is correct
- Make sure your Supabase project is active (not paused)

## Next Steps

After setup:
1. Update prediction code to use `savePrediction()` from `lib/progno-db.ts`
2. Set up automated outcome tracking
3. Create dashboard to view win percentages
4. Set up scheduled jobs to calculate metrics

## Security Note

⚠️ **Never commit your service role key to git!**
- The `service_role` key has full database access
- Only use it in server-side code (API routes)
- Keep it in environment variables only

