# Affiliate Credentials Management System

## Overview
The Affiliate Credentials Manager allows admins to securely configure affiliate IDs and API keys for Amazon, Walmart, Temu, and BoatUS directly through the admin panel.

## Features
- **Secure Storage**: All affiliate credentials stored in database with RLS policies
- **Show/Hide Sensitive Data**: Toggle visibility of affiliate IDs and API keys
- **Commission Tracking**: Set commission rates for each retailer
- **Enable/Disable Retailers**: Turn retailers on/off without deleting credentials
- **Direct Links**: Quick access to each retailer's affiliate program signup

## Database Structure

### Table: `affiliate_credentials`
```sql
- id (UUID): Primary key
- retailer (TEXT): 'amazon', 'walmart', 'temu', or 'boatus'
- affiliate_id (TEXT): Your affiliate tag/ID
- api_key (TEXT): Optional API key for advanced features
- secret_key (TEXT): Optional secret key
- commission_rate (DECIMAL): Expected commission percentage
- is_active (BOOLEAN): Enable/disable retailer
- created_at (TIMESTAMPTZ): Creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp
```

## How to Configure

### 1. Access Admin Panel
- Navigate to `/admin` (requires level 1 admin access)
- Scroll to "Affiliate Credentials Manager" section

### 2. Configure Each Retailer

#### Amazon Associates
1. Sign up at: https://affiliate-program.amazon.com/
2. Get your Associate Tag (e.g., `yoursite-20`)
3. Enter in "Affiliate ID / Tag" field
4. Set commission rate (typically 4-8% depending on category)
5. Toggle "Active" switch to enable

#### Walmart Affiliates
1. Sign up at: https://affiliates.walmart.com/
2. Get your Publisher ID
3. Optionally get API Key for advanced features
4. Enter both in respective fields
5. Set commission rate (typically 3-4%)

#### Temu Affiliate
1. Sign up at: https://seller.temu.com/
2. Get your Affiliate ID
3. Optionally get API Key
4. Enter credentials
5. Set commission rate (typically 5-10%)

#### BoatUS Affiliate
1. Contact BoatUS for affiliate program
2. Get your Affiliate ID
3. Enter in field
4. Set commission rate (typically 5-6%)

## Security Features

### Row Level Security (RLS)
- Only level 1 admins can view/edit credentials
- Credentials never exposed to frontend users
- Secure password-style input fields

### Show/Hide Toggle
- Click eye icon to reveal/hide sensitive data
- Credentials remain masked by default
- Separate toggle for each retailer

## Using Credentials in Products

### Automatic Integration
When you add or edit marine products, the system automatically:
1. Fetches active affiliate credentials from database
2. Appends affiliate IDs to product URLs
3. Tracks clicks and conversions
4. Calculates estimated commissions

### Product URL Format

**Amazon:**
```
https://amazon.com/dp/PRODUCTID?tag=YOUR-AFFILIATE-TAG
```

**Walmart:**
```
https://walmart.com/ip/PRODUCTID?affiliateId=YOUR-PUBLISHER-ID
```

**Temu:**
```
https://temu.com/product?goods_id=PRODUCTID&aff_id=YOUR-AFFILIATE-ID
```

**BoatUS:**
```
https://boatus.com/product?id=PRODUCTID&affiliate=YOUR-AFFILIATE-ID
```

## Commission Tracking

### Expected Commission Rates
- **Amazon**: 1-10% (varies by category)
- **Walmart**: 1-4% (varies by category)
- **Temu**: 5-15% (varies by promotion)
- **BoatUS**: 5-8% (varies by product)

### Analytics
View performance in "Affiliate Analytics Dashboard":
- Total clicks per retailer
- Conversion rates
- Estimated earnings
- Top-performing products
- Revenue trends

## Best Practices

### 1. Keep Credentials Updated
- Check affiliate dashboards monthly
- Update if IDs change
- Monitor commission rates

### 2. Test Links
- Click product links to verify affiliate tags
- Check that you're credited in affiliate dashboard
- Test across different products

### 3. Optimize Commission Rates
- Update rates based on actual earnings
- Higher rates = better revenue projections
- Review quarterly

### 4. Enable Only Active Programs
- Disable retailers you're not enrolled with
- Prevents broken affiliate links
- Keeps analytics accurate

## Troubleshooting

### Credentials Not Saving
- Check admin level (must be level 1)
- Verify database connection
- Check browser console for errors

### Links Not Working
- Verify affiliate ID format
- Check retailer's affiliate program status
- Test with different products

### Commission Tracking Off
- Update commission rates in admin panel
- Verify affiliate dashboard shows clicks
- Check URL format includes affiliate tag

## Migration from Hardcoded IDs

If you previously had hardcoded affiliate IDs:
1. Access admin panel
2. Enter all affiliate IDs in Credentials Manager
3. Save each retailer
4. System will automatically use database values
5. Old hardcoded IDs are ignored

## API Integration (Future)

### Walmart API
With API key, you can:
- Auto-sync product inventory
- Get real-time pricing
- Track conversions automatically

### Amazon Product Advertising API
With API credentials, you can:
- Import product data
- Get current prices
- Track earnings programmatically

## Support

For issues with:
- **Database**: Check Supabase logs
- **Admin Access**: Verify user level
- **Affiliate Programs**: Contact retailer support
- **Technical**: Check browser console

## Security Notes

⚠️ **Never expose affiliate credentials in:**
- Frontend code
- Client-side JavaScript
- Public repositories
- Browser localStorage

✅ **Always:**
- Store in database with RLS
- Use server-side functions
- Mask in admin UI
- Rotate if compromised
