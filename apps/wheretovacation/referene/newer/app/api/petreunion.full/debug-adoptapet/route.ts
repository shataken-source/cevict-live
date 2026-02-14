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
    const url = body.url || 'https://www.adoptapet.com/shelter/101983-2nd-chance-shelter-boaz-alabama#available-pets';
    
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
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`[DEBUG] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000); // Wait longer for content to load

    // Scroll to load content (AdoptAPet might lazy load)
    console.log(`[DEBUG] Scrolling page...`);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000);
    
    // Check if page loaded and get page info
    const pageTitle = await page.title();
    const pageUrl = page.url();
    const pageText = await page.textContent('body') || '';
    console.log(`[DEBUG] Page loaded - Title: ${pageTitle}, URL: ${pageUrl}`);
    
    // Try ALL possible selectors
    const allSelectors = [
      'a[href*="/pet/"]',
      '[class*="pet"]',
      '[class*="Pet"]',
      '[class*="animal"]',
      '[class*="Animal"]',
      'article',
      '[data-pet-id]',
      '[class*="card"]',
      '[class*="Card"]',
      '[class*="listing"]',
      '[class*="Listing"]',
      '[class*="result"]',
      '[class*="Result"]',
      'img[alt*="pet"]',
      'img[alt*="dog"]',
      'img[alt*="cat"]',
      'h2',
      'h3',
      'h4'
    ];

    const selectorResults: Record<string, { count: number; sampleText: string[] }> = {};
    for (const selector of allSelectors) {
      try {
        const elements = await page.$$(selector);
        const count = elements.length;
        
        // Get sample text from first few elements
        const sampleText: string[] = [];
        if (count > 0) {
          for (let i = 0; i < Math.min(3, count); i++) {
            try {
              const text = await elements[i].textContent();
              if (text) sampleText.push(text.substring(0, 200));
            } catch (e) {
              // Ignore
            }
          }
        }
        
        selectorResults[selector] = { count, sampleText };
      } catch (e) {
        selectorResults[selector] = { count: 0, sampleText: [] };
      }
    }

    // Get all links
    const allLinks = await page.$$eval('a[href]', (links: any[]) => {
      return links
        .map((link: any) => link.href)
        .filter((href: string) => href.includes('/pet/') || href.includes('/animal/') || href.includes('/dog/') || href.includes('/cat/'))
        .slice(0, 20);
    });

    // Get sample HTML structure
    const sampleHTML = await page.evaluate(() => {
      // Find any element that might contain pet info
      const petContainers = Array.from(document.querySelectorAll('div, article, section')).filter((el: any) => {
        const text = el.innerText || '';
        return text.includes('Male') || text.includes('Female') || text.includes('Yr') || text.includes('Mos') || text.match(/^\s*[A-Z][a-z]+/);
      });
      
      return petContainers.slice(0, 5).map((el: any) => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        text: (el.innerText || '').substring(0, 300),
        html: el.outerHTML.substring(0, 500)
      }));
    });

    // Get all images
    const images = await page.$$eval('img', (imgs: any[]) => {
      return imgs
        .filter((img: any) => img.src && !img.src.includes('logo') && !img.src.includes('icon'))
        .slice(0, 10)
        .map((img: any) => ({
          src: img.src,
          alt: img.alt,
          className: img.className
        }));
    });

    await page.close();
    await browser.close();

    return NextResponse.json({
      success: true,
      url: pageUrl,
      title: pageTitle,
      textLength: pageText.length,
      textSnippet: pageText.substring(0, 2000),
      selectorResults,
      petLinks: allLinks,
      sampleContainers: sampleHTML,
      images: images.slice(0, 5),
      message: 'Debug info collected'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

