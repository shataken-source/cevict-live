const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const GHHS_DOGS_URL = 'https://ghhs.org/adopt-animals/dog/';

async function scrapeGHHS() {
  try {
    console.log('Fetching Greenhill Humane Society dogs...');
    const { data } = await axios.get(GHHS_DOGS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const dogs = [];

    // Find all dog entries on the page
    $('.pet-item').each((i, element) => {
      const $el = $(element);
      
      const name = $el.find('.pet-name').text().trim();
      const imageUrl = $el.find('img').attr('src');
      const profileUrl = $el.find('a').attr('href');
      const description = $el.find('.pet-description').text().trim();
      
      // Extract additional details if available
      const details = {};
      $el.find('.pet-details li').each((i, li) => {
        const text = $(li).text().trim();
        const [key, ...valueParts] = text.split(':');
        if (key && valueParts.length) {
          details[key.trim().toLowerCase()] = valueParts.join(':').trim();
        }
      });

      if (name) {
        dogs.push({
          name,
          imageUrl: imageUrl ? new URL(imageUrl, GHHS_DOGS_URL).href : null,
          profileUrl: profileUrl ? new URL(profileUrl, GHHS_DOGS_URL).href : null,
          description,
          ...details,
          source: 'Greenhill Humane Society',
          sourceUrl: GHHS_DOGS_URL,
          scrapedAt: new Date().toISOString()
        });
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

// Run the scraper
scrapeGHHS()
  .then(() => console.log('Scraping completed!'))
  .catch(error => console.error('Scraping failed:', error));
