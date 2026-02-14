import { NextRequest, NextResponse } from 'next/server';

// Playwright for browser-based scraping
let playwright: any = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[DEBUG] Playwright not available');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url || 'https://www.petfinder.com/search/dogs-for-adoption/us/ny/new-york/';
    
    if (!playwright) {
      return NextResponse.json({
        error: 'Playwright not available',
        message: 'Please install Playwright: npx playwright install chromium'
      }, { status: 500 });
    }

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Get page info
    const pageTitle = await page.title();
    const pageUrl = page.url();
    const pageText = await page.textContent('body') || '';
    
    // Try to find any elements that might be pets
    const allSelectors = [
      '[class*="pet"]',
      '[class*="Pet"]',
      '[class*="animal"]',
      '[class*="Animal"]',
      'article',
      '[data-testid]',
      'a[href*="/pet/"]',
      '[class*="card"]',
      '[class*="Card"]'
    ];

    const selectorResults: Record<string, number> = {};
    for (const selector of allSelectors) {
      try {
        const count = await page.$$(selector).then(els => els.length);
        selectorResults[selector] = count;
      } catch (e) {
        selectorResults[selector] = 0;
      }
    }

    // Get sample HTML
    const sampleHTML = await page.content();
    const htmlSnippet = sampleHTML.substring(0, 5000);

    // Try to find JSON data
    const jsonScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts
        .map(s => s.textContent || '')
        .filter(text => text.includes('pet') || text.includes('animal') || text.includes('adopt'))
        .slice(0, 3)
        .map(text => text.substring(0, 500));
    });

    await page.close();
    await browser.close();

    return NextResponse.json({
      success: true,
      url: pageUrl,
      title: pageTitle,
      textLength: pageText.length,
      textSnippet: pageText.substring(0, 1000),
      selectorCounts: selectorResults,
      htmlSnippet,
      jsonScripts,
      message: 'Debug info collected'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}


