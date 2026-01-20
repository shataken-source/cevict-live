# Affiliate Link Tester Guide

## Overview
The Affiliate Link Tester is an admin tool that automatically tests all affiliate links for Amazon, Walmart, Temu, and BoatUS to verify they're working correctly, check if affiliate IDs are properly appended, test redirects, and validate tracking.

## Features

### Automated Link Testing
- Tests affiliate links for all 4 retailers simultaneously
- Verifies HTTP response codes (200-399 = working)
- Measures response time for performance monitoring
- Detects redirect chains and final destinations

### Affiliate ID Verification
- Checks if affiliate IDs are present in URLs
- Validates correct parameter names for each retailer:
  - Amazon: `tag` parameter
  - Walmart: `affcamid` parameter
  - Temu: `aff_id` parameter
  - BoatUS: `affiliate` parameter
- Displays the actual affiliate ID value used

### Real-Time Dashboard
- Color-coded status indicators (green/yellow/red)
- Response time monitoring
- Error detection and reporting
- Last tested timestamp for each retailer

## How to Use

### Access the Tester
1. Log in as admin (level 1 user)
2. Navigate to Admin Panel
3. Scroll to "Affiliate Link Tester" section
4. Click "Test All Links" button

### Reading Results
Each retailer card shows:
- **Status Badge**: 
  - Green "Working" = Link works + affiliate ID present
  - Yellow "Missing ID" = Link works but no affiliate ID
  - Red "Failed" = Link doesn't work or error occurred
- **HTTP Status**: Response code (200, 301, 404, etc.)
- **Response Time**: How fast the link responds (in milliseconds)
- **Affiliate ID**: Whether ID is present and its value
- **Redirect Info**: If link redirects, shows destination URL

## Edge Function

### Endpoint
`affiliate-link-tester`

### Actions

#### Test All Links
```javascript
const { data } = await supabase.functions.invoke('affiliate-link-tester', {
  body: { action: 'test-all' }
});
```

Returns array of test results for all enabled retailers.

#### Test Single Link
```javascript
const { data } = await supabase.functions.invoke('affiliate-link-tester', {
  body: { 
    action: 'test-link',
    retailer: 'amazon',
    productUrl: 'https://www.amazon.com/dp/B08N5WRWNW'
  }
});
```

## Test Sample URLs

The function tests these sample URLs by default:
- **Amazon**: `https://www.amazon.com/dp/B08N5WRWNW`
- **Walmart**: `https://www.walmart.com/ip/12345`
- **Temu**: `https://www.temu.com/product-12345.html`
- **BoatUS**: `https://www.boatus.com/product-12345`

## Troubleshooting

### Link Shows "Failed"
- Check if the retailer's website is accessible
- Verify the affiliate credentials are configured correctly
- Ensure the test URL is valid for that retailer

### "Missing ID" Status
- Go to Affiliate Credentials Manager
- Verify the affiliate ID is entered for that retailer
- Check that the retailer is enabled
- Save changes and test again

### Slow Response Times
- Normal response times: 200-1000ms
- Slow (>2000ms) may indicate:
  - Network issues
  - Retailer website slowness
  - Geographic distance from server

### Redirect Detected
- Many affiliate links redirect to final product pages
- This is normal behavior
- The tester shows the final destination URL
- Verify the affiliate ID persists through redirects

## Best Practices

### Regular Testing
- Test links weekly to catch issues early
- Test after changing affiliate credentials
- Test before major sales/promotions

### Monitoring
- Watch for consistent failures from one retailer
- Monitor response time trends
- Check that affiliate IDs remain consistent

### Maintenance
- Update test URLs if products become unavailable
- Keep affiliate credentials up to date
- Document any recurring issues

## Technical Details

### How It Works
1. Retrieves enabled retailers from `affiliate_credentials` table
2. Builds affiliate URLs with proper parameters
3. Makes HEAD requests to test links (faster than GET)
4. Parses response headers for status and redirects
5. Validates affiliate ID presence in URL
6. Returns comprehensive test results

### Timeout
- 10-second timeout per link test
- Prevents hanging on unresponsive sites
- Returns error if timeout exceeded

### CORS Headers
- Properly configured for cross-origin requests
- Handles OPTIONS preflight requests
- Returns JSON responses

## Integration with Other Systems

### Works With
- **Affiliate Credentials Manager**: Uses stored credentials
- **Marine Gear Shop**: Tests links used in products
- **Affiliate Analytics**: Validates tracked links

### Database Tables
- Reads from: `affiliate_credentials`
- No writes (read-only testing)

## Security

### Admin Only
- Only level 1 users can access
- Protected by RLS policies
- No sensitive data exposed in frontend

### API Keys
- Never exposed in test results
- Stored securely in database
- Only used server-side

## Future Enhancements
- Scheduled automatic testing (daily/weekly)
- Email alerts for failed links
- Historical test result tracking
- Bulk product link testing
- Click-through rate validation
