const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

const GHHS_DOGS_URL = 'https://ghhs.org/adopt-animals/dog/';

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeGHHS() {
  try {
    console.log('Fetching Greenhill Humane Society dogs...');
    const html = await fetchPage(GHHS_DOGS_URL);
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const dogs = [];
    
    // Find all dog entries - adjust selector based on actual page structure
    const dogElements = document.querySelectorAll('.pet-item, .animal-card, .pet-card');
    
    dogElements.forEach((element) => {
      try {
        const name = element.querySelector('h3, .pet-name, .animal-name')?.textContent?.trim();
        const imageElement = element.querySelector('img');
        const imageUrl = imageElement ? new URL(imageElement.src, GHHS_DOGS_URL).href : null;
        
        const linkElement = element.querySelector('a');
        const profileUrl = linkElement ? new URL(linkElement.href, GHHS_DOGS_URL).href : null;
        
        if (name) {
          dogs.push({
            name,
            imageUrl,
            profileUrl,
            source: 'Greenhill Humane Society',
            sourceUrl: GHHS_DOGS_URL,
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error processing dog element:', error);
      }
    });
    
    console.log(`Found ${dogs.length} dogs available for adoption`);
    
    // Save results to a JSON file
    const outputPath = path.join(__dirname, '../../data/ghhs-dogs.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(dogs, null, 2));
    
    console.log(`Results saved to: ${outputPath}`);
    return dogs;
  } catch (error) {
    console.error('Error scraping Greenhill Humane Society:', error.message);
    throw error;
  }
}

// Install required package if not already installed
async function ensureDependencies() {
  try {
    await require.resolve('jsdom');
  } catch (e) {
    console.log('Installing required dependencies...');
    const { execSync } = require('child_process');
    execSync('pnpm add jsdom', { stdio: 'inherit' });
  }
}

// Run the scraper
async function main() {
  try {
    await ensureDependencies();
    await scrapeGHHS();
    console.log('Scraping completed successfully!');
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

main();
