import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NCSL_URL = 'https://www.ncsl.org/health/state-cannabis-legislation-database';

interface NCSLLaw {
  id: string;
  state: string;
  category: string;
  title: string;
  summary: string;
  status: string;
  details: string;
  url?: string;
}

async function scrapeNCSLWithPlaywright() {
  console.log('Starting Playwright NCSL scraper...');
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let browser = null;

  try {
    console.log('Launching Chromium...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(NCSL_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log('Extracting data...');
    const laws = await page.evaluate(() => {
      const results: any[] = [];
      const rows = document.querySelectorAll('table tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          results.push({
            state: cells[0]?.textContent?.trim().substring(0, 2) || 'XX',
            title: cells[1]?.textContent?.trim() || 'Unknown',
            summary: cells[2]?.textContent?.trim() || ''
          });
        }
      });
      return results;
    });

    console.log(`Found ${laws.length} entries`);

    if (laws.length === 0) {
      console.log('No live data found, using fallback...');
      await storeFallbackLaws(supabase);
    } else {
      await storeLaws(supabase, laws);
    }

  } catch (err) {
    console.error('Scraper error:', err);
    await storeFallbackLaws(supabase);
  } finally {
    if (browser) await browser.close();
  }
}

async function storeLaws(supabase: any, laws: any[]) {
  let stored = 0;
  for (const law of laws) {
    try {
      const { error } = await supabase.from('sr_law_cards').upsert({
        id: crypto.randomUUID(),
        state: law.state || 'XX',
        title: law.title || 'Cannabis Legislation',
        summary: law.summary || '',
        category: 'indoor',
        icon: '🌿',
        severity: 'yellow',
        details: law.summary || '',
        source_url: NCSL_URL,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (!error) stored++;
    } catch (e) {}
  }
  console.log(`Stored ${stored}/${laws.length} laws`);
}

async function storeFallbackLaws(supabase: any) {
  // Use the comprehensive state data we already compiled
  const { getKnownCannabisLaws } = await import('./scrape-ncsl-cannabis');
  const laws = getKnownCannabisLaws();
  
  let stored = 0;
  for (const law of laws) {
    try {
      const { error } = await supabase.from('sr_law_cards').upsert({
        id: law.id,
        state: law.state,
        title: law.title,
        summary: law.summary,
        category: law.category === 'medical' ? 'indoor' : 
                 law.category === 'adult_use' ? 'indoor' : 
                 law.category === 'hemp_cbd' ? 'vaping' : 'indoor',
        icon: law.category === 'medical' ? '⚕️' : 
              law.category === 'adult_use' ? '🍃' : '🌿',
        severity: law.status === 'enacted' ? 'green' : 'yellow',
        details: law.details,
        source_url: law.url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (!error) stored++;
    } catch (e) {}
  }
  console.log(`Stored ${stored}/${laws.length} fallback laws`);
}

scrapeNCSLWithPlaywright().catch(console.error);
