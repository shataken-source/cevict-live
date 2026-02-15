import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const NCSL_URL = 'https://www.ncsl.org/health/state-cannabis-legislation-database';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let browser = null;

  try {
    console.log('Starting NCSL Playwright scrape...');

    // Dynamic import Playwright to avoid build issues
    const { chromium } = await import('playwright');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(NCSL_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Extract legislation data
    const laws = await page.evaluate(() => {
      const results: any[] = [];

      // Look for state sections and legislation entries
      const sections = document.querySelectorAll('h2, h3, .state-section');
      let currentState = '';

      sections.forEach(section => {
        const text = section.textContent || '';
        const stateMatch = text.match(/^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)/);

        if (stateMatch) {
          currentState = stateMatch[1];
        }

        // Look for bill patterns
        const billMatch = text.match(/(SB|HB|AB|LB|HF)\s*(\d+).*?(medical|adult use|recreational|hemp|CBD|cannabis)/i);
        if (billMatch && currentState) {
          results.push({
            state: currentState,
            billNumber: `${billMatch[1]} ${billMatch[2]}`,
            title: text.substring(0, 150),
            category: billMatch[3].toLowerCase(),
            summary: text
          });
        }
      });

      return results;
    });

    console.log(`Extracted ${laws.length} laws from NCSL`);

    // Store in database
    let stored = 0;
    for (const law of laws) {
      const { error } = await supabase.from('sr_law_cards').upsert({
        id: crypto.randomUUID(),
        state: law.state,
        title: law.title || `${law.billNumber} - Cannabis Legislation`,
        summary: law.summary?.substring(0, 300) || '',
        category: law.category?.includes('medical') ? 'indoor' :
          law.category?.includes('adult') || law.category?.includes('recreational') ? 'indoor' :
            law.category?.includes('hemp') || law.category?.includes('cbd') ? 'vaping' : 'indoor',
        icon: law.category?.includes('medical') ? '⚕️' :
          law.category?.includes('adult') || law.category?.includes('recreational') ? '🍃' : '🌿',
        severity: 'green',
        details: law.summary || '',
        source_url: NCSL_URL,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (!error) stored++;
    }

    if (browser) await browser.close();

    return NextResponse.json({
      success: true,
      message: `NCSL scrape complete. Extracted ${laws.length} laws, stored ${stored}.`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    if (browser) await browser.close();
    console.error('NCSL scrape error:', err);

    return NextResponse.json({
      error: 'Scrape failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
