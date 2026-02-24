const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.log('\nPlease create a .env file with these variables or set them in your environment.');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Configuration
const CONFIG = {
  baseUrl: 'https://ghhs.org/adopt-animals/dog/',
  maxPages: 5,
  requestDelay: 2000,
  timeout: 30000,
  headless: true,
  viewport: { width: 1200, height: 2000 }
};

// Utility functions
const utils = {
  log: (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
  },
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  async saveToSupabase(pets) {
    if (!pets || pets.length === 0) {
      this.log('No pets to save to Supabase', 'warning');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('pets')
        .upsert(pets, { onConflict: 'profile_url' });

      if (error) throw error;
      
      this.log(`Successfully saved ${data?.length || 0} pets to Supabase`, 'success');
      return data || [];
    } catch (error) {
      this.log(`Error saving to Supabase: ${error.message}`, 'error');
      throw error;
    }
  }
};

class PetScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.stats = {
      totalPets: 0,
      newPets: 0,
      errors: 0,
      pagesScraped: 0,
      startTime: null,
      endTime: null
    };
  }

  async init() {
    try {
      this.stats.startTime = new Date();
      this.browser = await chromium.launch({ headless: CONFIG.headless });
      this.page = await this.browser.newPage();
      await this.page.setViewportSize(CONFIG.viewport);
      utils.log('Scraper initialized successfully');
      return true;
    } catch (error) {
      utils.log(`Initialization failed: ${error.message}`, 'error');
      await this.cleanup();
      throw error;
    }
  }

  async scrapeAllPages() {
    const allPets = [];
    let currentPage = 1;
    let hasMorePages = true;

    try {
      while (hasMorePages && currentPage <= CONFIG.maxPages) {
        utils.log(`Processing page ${currentPage}...`);
        
        const { pets: pagePets, hasNextPage } = await this.scrapePage(currentPage);
        allPets.push(...pagePets);
        
        utils.log(`Page ${currentPage}: Found ${pagePets.length} pets`);
        
        // Save to Supabase after each page
        try {
          await utils.saveToSupabase(pagePets);
          this.stats.newPets += pagePets.length;
        } catch (error) {
          this.stats.errors++;
          utils.log(`Error saving page ${currentPage} to Supabase: ${error.message}`, 'error');
        }

        hasMorePages = hasNextPage;
        currentPage++;
        this.stats.pagesScraped++;

        if (hasMorePages && currentPage <= CONFIG.maxPages) {
          await utils.delay(CONFIG.requestDelay);
        }
      }

      this.stats.totalPets = allPets.length;
      this.printStats();
      return allPets;

    } catch (error) {
      utils.log(`Error during scraping: ${error.message}`, 'error');
      this.stats.errors++;
      throw error;
    }
  }

  async scrapePage(pageNumber) {
    const url = pageNumber === 1 
      ? CONFIG.baseUrl 
      : `${CONFIG.baseUrl}page/${pageNumber}/`;

    try {
      utils.log(`Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout 
      });

      // Wait for content to load
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      // Extract pet data
      const pagePets = await this.extractPets();
      
      // Check for next page
      const hasNextPage = await this.page.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('a.page-numbers, .page-numbers a, [rel="next"]'))
          .find(el => 
            (el.textContent || '').toLowerCase().includes('next') || 
            el.textContent.includes('>')
          );
        return nextButton && !nextButton.classList.contains('current');
      });

      return { 
        pets: pagePets, 
        hasNextPage 
      };

    } catch (error) {
      utils.log(`Error scraping page ${pageNumber}: ${error.message}`, 'error');
      return { pets: [], hasNextPage: false };
    }
  }

  async extractPets() {
    return await this.page.evaluate(() => {
      const petElements = document.querySelectorAll(`
        .elementor.elementor-29304.e-loop-item,
        .elementor-post,
        .pet-card,
        [class*="pet-"],
        [class*="animal-"]
      `);

      return Array.from(petElements).map(petEl => {
        try {
          // Extract name
          const nameEl = petEl.querySelector('h2, h3, .elementor-heading-title, [class*="name"], [class*="title"]');
          let name = nameEl ? nameEl.textContent.trim() : 'Unknown';
          
          // Extract all text content
          const allText = petEl.textContent
            .replace(/\s+/g, ' ')
            .replace(/[\n\t]+/g, ' ')
            .trim();
          
          // Extract age
          let age = 'Unknown';
          const ageMatch = allText.match(/Age:\s*([^\s,]+(?:\s+[^\s,]+)*)/i) || 
                          allText.match(/(\d+\s*(?:years?|yrs?|months?|mos?|weeks?|wks?|days?|d))\b/i);
          if (ageMatch) age = ageMatch[1].trim();
          
          // Extract breed and color
          let breed = 'Unknown';
          let color = 'Unknown';
          const breedMatch = allText.match(/Dog\s+([^\n]+?)(?=\s*(?:Male|Female|Age:|$))/i) || 
                           allText.match(/(?:Breed|Type):\s*([^\n,]+)/i);
          
          if (breedMatch && breedMatch[1]) {
            const breedText = breedMatch[1].trim();
            // Try to split breed and color
            const colorMatch = breedText.match(/(.+?)\s+([A-Z][a-z]+(?:\/[A-Z][a-z]+)*)$/);
            if (colorMatch) {
              breed = colorMatch[1].trim();
              color = colorMatch[2].trim();
            } else {
              breed = breedText;
            }
          }
          
          // Extract gender
          let gender = 'Unknown';
          if (allText.match(/\bFemale\b/i)) gender = 'Female';
          else if (allText.match(/\bMale\b/i)) gender = 'Male';
          
          // Extract image
          let imageUrl = null;
          const imgEl = petEl.querySelector('img');
          if (imgEl) {
            const possibleSrc = imgEl.getAttribute('data-src') || 
                             imgEl.getAttribute('data-lazy-src') || 
                             imgEl.src;
            if (possibleSrc && 
                !possibleSrc.includes('data:image') && 
                !possibleSrc.includes('placeholder') &&
                !possibleSrc.includes('1x1')) {
              imageUrl = possibleSrc;
            }
          }
          
          // Get profile URL
          const profileUrl = petEl.closest('a')?.href || window.location.href;
          
          return {
            name,
            age: age.replace(/\s*years?/i, '').trim() + (age ? ' years' : ''),
            breed,
            color,
            gender,
            image_url: imageUrl,
            profile_url: profileUrl,
            source: window.location.hostname,
            last_scraped: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } catch (e) {
          console.error('Error processing pet:', e);
          return null;
        }
      }).filter(Boolean);
    });
  }

  printStats() {
    this.stats.endTime = new Date();
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    
    console.log('\n' + '='.repeat(50));
    console.log('SCRAPING COMPLETE - SUPABASE INTEGRATION');
    console.log('='.repeat(50));
    console.log(`Total time: ${duration.toFixed(2)} seconds`);
    console.log(`Pages scraped: ${this.stats.pagesScraped}`);
    console.log(`Total pets processed: ${this.stats.totalPets}`);
    console.log(`New pets saved to Supabase: ${this.stats.newPets}`);
    console.log(`Errors encountered: ${this.stats.errors}`);
    console.log('='.repeat(50) + '\n');
  }

  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
      utils.log('Scraper cleanup complete');
    } catch (error) {
      utils.log(`Error during cleanup: ${error.message}`, 'error');
    }
  }
}

// Main execution
(async () => {
  const scraper = new PetScraper();
  
  try {
    await scraper.init();
    const results = await scraper.scrapeAllPages();
    
    if (results && results.length > 0) {
      utils.log(`Successfully processed ${results.length} pets in total!`, 'success');
    } else {
      utils.log('Scraping completed but no pets were found', 'warning');
    }
  } catch (error) {
    utils.log(`Scraping failed: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    await scraper.cleanup();
    process.exit(0);
  }
})();
