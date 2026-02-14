const { chromium } = require('playwright');
const fs = require('fs');

async function debugScrape() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const url = 'https://ghhs.org/adopt-animals/dog/';
    console.log(`Navigating to: ${url}`);
    
    // Set a larger viewport
    await page.setViewportSize({ width: 1200, height: 2000 });
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    console.log('Page loaded, waiting for content...');
    await page.waitForTimeout(5000); // Wait 5 seconds

    // Take a full page screenshot
    await page.screenshot({ path: 'debug-fullpage.png', fullPage: true });
    console.log('Saved full page screenshot as debug-fullpage.png');

    // Get all elements and their details
    const elements = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      return allElements.map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id,
          classes: Array.from(el.classList),
          text: el.textContent?.trim().substring(0, 100),
          isVisible: rect.width > 0 && rect.height > 0,
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        };
      }).filter(el => 
        el.isVisible && 
        el.text && 
        el.text.length > 0
      );
    });

    console.log('\nVisible elements on page:');
    console.log('------------------------');
    elements.forEach((el, i) => {
      console.log(`[${i}] ${el.tag}${el.id ? '#' + el.id : ''}${el.classes.length ? '.' + el.classes.join('.') : ''}`);
      console.log(`   Text: "${el.text}"`);
      console.log(`   Position: x:${el.position.x}, y:${el.position.y}, size: ${el.position.width}x${el.position.height}`);
      console.log('   ---');
    });

    // Save elements to file
    fs.writeFileSync('page-elements.json', JSON.stringify(elements, null, 2));
    console.log('\nSaved all visible elements to page-elements.json');

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    console.log('Debugging complete. Press Ctrl+C to exit.');
    // Keep browser open for inspection
    // await browser.close();
  }
}

debugScrape().catch(console.error);