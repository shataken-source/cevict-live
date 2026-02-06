# Populate Laws Table

## Current Status

✅ **Schema cache issue fixed** - The `laws` table is now visible to PostgREST  
⚠️ **Table is empty** - You need to populate it with law data

## How to Populate Laws

### Option 1: Import via Supabase Dashboard (Recommended)

1. **Prepare your law data** in CSV format with these columns:
   - `state_code` (e.g., "AL", "CA", "NY")
   - `state_name` (e.g., "Alabama", "California", "New York")
   - `category` (e.g., "indoor-smoking", "outdoor-smoking", "vaping", "cannabis")
   - `summary` (brief description)
   - `full_text` (full law text, optional)
   - `effective_date` (YYYY-MM-DD format, optional)
   - `source_url` (link to source, optional)

2. **Import in Supabase:**
   - Go to **Table Editor** → `laws` table
   - Click **Insert** → **Import data from CSV**
   - Upload your CSV file
   - Map columns if needed
   - Click **Import**

### Option 2: Insert Sample Laws via SQL

Run this SQL in Supabase SQL Editor to add sample laws:

```sql
-- Sample laws for testing
INSERT INTO public.laws (state_code, state_name, category, summary, full_text, effective_date, source_url)
VALUES
  ('AL', 'Alabama', 'indoor-smoking', 'Smoking is prohibited in all enclosed public places and workplaces.', 'Full text of Alabama indoor smoking law...', '2003-01-01', 'https://example.com/al-law'),
  ('CA', 'California', 'indoor-smoking', 'Comprehensive smoking ban in all enclosed workplaces and public places.', 'Full text of California indoor smoking law...', '1995-01-01', 'https://example.com/ca-law'),
  ('NY', 'New York', 'indoor-smoking', 'Smoking is banned in all bars, restaurants, and workplaces.', 'Full text of New York indoor smoking law...', '2003-07-24', 'https://example.com/ny-law'),
  ('TX', 'Texas', 'outdoor-smoking', 'Smoking restrictions in outdoor dining areas and near building entrances.', 'Full text of Texas outdoor smoking law...', '2007-09-01', 'https://example.com/tx-law'),
  ('FL', 'Florida', 'vaping', 'E-cigarettes are prohibited in the same places as traditional cigarettes.', 'Full text of Florida vaping law...', '2019-07-01', 'https://example.com/fl-law');
```

### Option 3: Bulk Import from External Source

If you have law data from an external source (API, scraper, etc.):

1. **Create an import script** (similar to `populate-products.ts`)
2. **Use the Supabase client** to insert laws in batches
3. **Run the script** to populate the database

Example structure:
```typescript
// scripts/import-laws.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importLaws() {
  const laws = [
    // Your law data here
  ];

  const { data, error } = await supabase
    .from('laws')
    .insert(laws);

  if (error) {
    console.error('Error importing laws:', error);
  } else {
    console.log(`✅ Imported ${laws.length} laws`);
  }
}

importLaws();
```

## Law Categories

Supported categories (based on the app structure):
- `indoor-smoking` - Indoor smoking restrictions
- `outdoor-smoking` - Outdoor smoking restrictions
- `vaping` - E-cigarette/vaping laws
- `cannabis` - Cannabis/marijuana laws
- `tobacco-tax` - Tobacco tax laws
- `age-restrictions` - Age restriction laws

## Verification

After populating laws:

1. **Check count:**
   ```sql
   SELECT COUNT(*) FROM laws;
   ```

2. **Test the update script:**
   ```bash
   npm run update-laws
   ```
   Should now show: `✅ Successfully updated X laws`

3. **Check the website:**
   - Visit `/legal/[state]/[category]` pages
   - Laws should display with "Last updated" dates

## Next Steps

Once laws are populated:
- ✅ Daily update script will work (`npm run update-laws`)
- ✅ Law pages will display content
- ✅ Search functionality will work
- ✅ Map view will show laws by state

## Data Sources

Potential sources for law data:
- State government websites
- Legal databases (LexisNexis, Westlaw)
- Public health organizations
- Law tracking services
- Manual research and entry
