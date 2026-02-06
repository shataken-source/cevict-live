# Quick Start Guide

Follow these steps to get the SmokersRights platform fully operational.

## Prerequisites

1. **Install dependencies:**
   ```bash
   cd apps/smokersrights
   npm install
   ```

2. **Set environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for updates)
   - `ADMIN_PASSWORD` (optional) - For admin endpoints

## Step 1: Populate Marketplace Products

Run the product population script:

```bash
npm run populate-products
```

Or with overwrite (if products already exist):
```bash
npm run populate-products -- --overwrite
```

**Expected output:**
```
🛒 Starting product population...
📅 Date: 1/18/2026, 10:00:00 AM
📦 Inserting 15 products...
✅ Products populated successfully!
📊 Products added: 15
📂 Categories: CBD, Vapes, Papers, Nicotine, Accessories
```

**Verify:**
- Visit `http://localhost:3010/shop` (or your deployed URL)
- You should see products organized by category
- Sponsor products should be highlighted

## Step 2: Test Daily Law Updates

Run the law update script:

```bash
npm run update-laws
```

**Expected output:**
```
🔄 Starting daily law update...
📅 Date: 1/18/2026, 10:00:00 AM
✅ Successfully updated 400 laws
📊 Total checked: 400
⏰ Completed at: 1/18/2026, 10:00:01 AM
```

**Verify:**
- Visit any law page: `http://localhost:3010/legal/al/indoor-smoking`
- Check "Last updated" date - should show today's date
- All laws should show today's date

## Step 3: Set Up Automated Daily Updates

### Option A: Vercel (Recommended)

If deployed on Vercel, the cron job is already configured in `vercel.json`:

1. Deploy to Vercel
2. Set `BOT_SECRET_TOKEN` environment variable in Vercel dashboard
3. Cron job will run automatically at 2 AM UTC daily

### Option B: External Service

Use a service like [cron-job.org](https://cron-job.org):

1. Create account
2. Add new cron job:
   - URL: `https://your-domain.com/api/bot/run`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_BOT_SECRET_TOKEN`
   - Schedule: Daily at 2 AM

### Option C: Local Server

On a server with cron:

```bash
crontab -e
```

Add:
```
0 2 * * * cd /path/to/apps/smokersrights && npm run update-laws >> /var/log/smokersrights-updates.log 2>&1
```

## Step 4: Replace Sample Affiliate Links

The sample products use placeholder links. Replace them with real affiliate programs:

1. Open `lib/marketplace/affiliateProducts.ts`
2. Replace `link` values with your affiliate links
3. Update prices if needed
4. Re-run: `npm run populate-products -- --overwrite`

**Example:**
```typescript
{
  name: 'Premium CBD Oil',
  link: 'https://affiliate-site.com/product?ref=YOUR_REF_ID', // Replace this
  // ...
}
```

## Step 5: Add Product Images (Optional)

Add product images to improve the marketplace:

1. Upload images to Supabase Storage or CDN
2. Update products in database:
   ```sql
   UPDATE products 
   SET image_url = 'https://your-cdn.com/product-image.jpg' 
   WHERE name = 'Product Name';
   ```

Or add to `affiliateProducts.ts`:
```typescript
{
  name: 'Product Name',
  image_url: 'https://your-cdn.com/product-image.jpg',
  // ...
}
```

## Troubleshooting

### Products not showing
- Check database: `SELECT * FROM products WHERE active = true;`
- Verify API: `curl http://localhost:3010/api/products`
- Check browser console for errors

### Law updates failing
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase permissions (service role needs UPDATE on `laws` table)
- Review error logs

### Scripts not running
- Ensure `tsx` is installed: `npm install`
- Check Node.js version: `node --version` (should be >= 20)
- Verify environment variables are set

## Next Steps

1. ✅ Populate products - DONE
2. ✅ Test law updates - DONE
3. ✅ Set up cron job - DONE
4. 🔄 Replace affiliate links - IN PROGRESS
5. 🔄 Add product images - TODO
6. 🔄 Monitor performance - TODO

## Support

- See `AUDIT_SUMMARY.md` for complete audit details
- See `DAILY_UPDATES_SETUP.md` for law update details
- See `MARKETPLACE_SETUP.md` for marketplace details
