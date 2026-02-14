const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function scrapeAndSavePets() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const url = 'https://ghhs.org/adopt-animals/dog/';
    console.log(`Scraping: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Extract pet data (simplified for example)
    const pets = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.pet, .animal')).map(pet => {
        const name = pet.querySelector('h3, h4')?.textContent?.trim() || 'Unknown';
        const image = pet.querySelector('img')?.src || null;
        const link = pet.closest('a')?.href || window.location.href;
        
        return {
          name,
          image_url: image,
          profile_url: link,
          source: window.location.hostname,
          scraped_at: new Date().toISOString()
        };
      });
    });

    console.log(`Found ${pets.length} pets to save`);

    // Save to Supabase
    const { data, error } = await supabase
      .from('pets')
      .upsert(pets, { onConflict: 'profile_url' }); // Prevents duplicates

    if (error) {
      console.error('Error saving to Supabase:', error);
    } else {
      console.log(`Successfully saved ${data?.length || 0} pets to Supabase`);
    }

    return data;
  } catch (error) {
    console.error('Error during scraping:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeAndSavePets().catch(console.error);