const { chromium } = require('playwright');
const fs = require('fs');

async function scrapePets() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const url = 'https://ghhs.org/adopt-animals/dog/';
    console.log(`Scraping: ${url}`);
    
    // Set viewport to ensure all content is visible
    await page.setViewportSize({ width: 1280, height: 2000 });
    
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for dynamic content to load
    await page.waitForTimeout(5000);
    
    // Scroll to trigger lazy loading (if any)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Save a screenshot for debugging
    await page.screenshot({ path: 'debug-page.png' });
    console.log('Saved debug-page.png');
    
    // Extract pet data using more specific selectors
    const pets = await page.evaluate(() => {
      // Look for pet containers - these might be the individual pet cards
      const petElements = Array.from(document.querySelectorAll('.animal, .pet, .pet-card, .animal-card, .grid-item, .col, article, section'));
      
      return petElements.map(pet => {
        try {
          // Get name from various possible elements
          const nameElement = pet.querySelector('h3, h4, .name, .pet-name, .animal-name, [itemprop="name"]');
          const name = nameElement?.textContent?.trim();
          if (!name) return null;

          // Get image - check for both img tags and background images
          let image = pet.querySelector('img')?.src;
          if (!image) {
            const bgImage = window.getComputedStyle(pet).backgroundImage;
            if (bgImage && bgImage !== 'none') {
              image = bgImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
            }
          }

          // Get link to pet's page
          const linkElement = pet.closest('a') || pet.querySelector('a');
          const link = linkElement?.href || window.location.href;

          // Get additional details
          const details = {};
          const detailElements = pet.querySelectorAll('p, li, .detail, .info, [class*="detail"], [class*="info"]');
          detailElements.forEach(el => {
            const text = el.textContent.trim();
            if (text.includes(':')) {
              const [key, ...valueParts] = text.split(':');
              const value = valueParts.join(':').trim();
              if (key && value) {
                const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                details[cleanKey] = value;
              }
            }
          });

          return {
            name,
            imageUrl: image || null,
            profileUrl: link,
            source: window.location.hostname,
            scrapedAt: new Date().toISOString(),
            ...details
          };
        } catch (error) {
          console.error('Error processing pet element:', error);
          return null;
        }
      }).filter(Boolean);
    });

    console.log(`Found ${pets.length} pets`);
    return pets;
  } catch (error) {
    console.error('Error during scraping:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Create a debug directory if it doesn't exist
if (!fs.existsSync('debug')) {
  fs.mkdirSync('debug');
}

// Run the scraper
scrapePets()
  .then(pets => {
    const output = JSON.stringify(pets, null, 2);
    console.log(`\nFound ${pets.length} pets in total`);
    
    // Save to file
    fs.writeFileSync('pets.json', output);
    console.log('Results saved to pets.json');
  })
  .catch(console.error);