# Pet Scraper Test - 5 Dogs from 5 Different Areas

## Test Setup

The test script `test-pet-scraper.ps1` is ready to run. It will fetch 1 dog from each of 5 different geographic areas:

1. **East Coast**: New York, NY
2. **West Coast**: Los Angeles, CA  
3. **Mexico Border**: San Diego, CA
4. **Canada Border**: Seattle, WA
5. **Central US**: Dallas, TX

---

## How to Run

### Step 1: Start the Dev Server

```powershell
cd cevict-monorepo/apps/wheretovacation
pnpm dev
```

The server should start on port 3002 (or check the console output for the actual port).

### Step 2: Run the Test Script

In a **new terminal window**:

```powershell
cd cevict-monorepo/apps/wheretovacation
powershell -ExecutionPolicy Bypass -File .\test-pet-scraper.ps1
```

---

## What the Test Does

1. **Loops through 5 areas** (East Coast, West Coast, Mexico Border, Canada Border, Central US)
2. **Calls the AdoptAPet scraper** for each area
3. **Fetches 1 dog** from the first page of results
4. **Displays results** with dog name, breed, age, gender
5. **Shows summary** of all dogs found

---

## Expected Output

```
=== PET SCRAPER TEST ===
Fetching 5 dogs from 5 different areas...

--- Scraping East Coast (New York, NY) ---
  Found: Buddy - Golden Retriever
    Type: dog, Age: 2 years, Gender: Male
    Location: East Coast

--- Scraping West Coast (Los Angeles, CA) ---
  Found: Luna - German Shepherd
    Type: dog, Age: 1 year, Gender: Female
    Location: West Coast

... (and so on for all 5 areas)

=== RESULTS SUMMARY ===
Total Dogs Found: 5

East Coast: Buddy - Golden Retriever
West Coast: Luna - German Shepherd
Mexico Border: Max - Chihuahua
Canada Border: Bella - Husky
Central US: Charlie - Labrador

=== DETAILED RESULTS ===
[Full JSON output with all pet details]
```

---

## Troubleshooting

### "The operation has timed out"
- **Solution**: Make sure the dev server is running on port 3002
- Check: `http://localhost:3002` in your browser
- If using a different port, update `$baseUrl` in the script

### "No pets found for this area"
- **Possible causes**:
  - AdoptAPet website structure changed
  - No dogs available in that area
  - Scraper needs adjustment for that location

### "Error: Database not configured"
- **Solution**: Make sure Supabase environment variables are set
- Check `.env.local` file has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## What This Tests

✅ **ScrapingBee Improvements**:
- User-Agent rotation (different per request)
- Retry logic (handles failures)
- Request delays (2 seconds between areas)
- Realistic headers (mimics browsers)
- Error handling (catches and reports errors)

✅ **Geographic Diversity**:
- Tests scraper across different regions
- Validates location-based scraping
- Tests URL parameter handling

✅ **Scraper Reliability**:
- Tests if scraper works consistently
- Validates error handling
- Checks data extraction accuracy

---

## Next Steps After Test

1. **Review Results**: Check if all 5 dogs were found
2. **Verify Data Quality**: Ensure names, breeds, ages are correct
3. **Check Database**: Verify pets were saved to `lost_pets` table
4. **Review Logs**: Check console for any errors or warnings

---

*Test Script Created: December 2024*
*Ready to run when dev server is started*


