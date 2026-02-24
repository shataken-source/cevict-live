const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    outputFile: 'pets.json',
    maxPages: 5, // Maximum number of pages to scrape
    baseUrl: 'https://ghhs.org/adopt-animals/dog/'
};

async function loadExistingPets() {
    try {
        if (fs.existsSync(CONFIG.outputFile)) {
            const data = fs.readFileSync(CONFIG.outputFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading existing pets:', error);
    }
    return [];
}

function isDuplicate(existingPets, newPet) {
    return existingPets.some(pet => 
        pet.name === newPet.name && 
        pet.breed === newPet.breed
    );
}

async function scrapePage(page, pageNumber = 1) {
    console.log(`Scraping page ${pageNumber}...`);
    
    // Navigate to the page with pagination if not first page
    const url = pageNumber === 1 ? CONFIG.baseUrl : `${CONFIG.baseUrl}page/${pageNumber}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for pet elements to load
    try {
        await page.waitForSelector('.elementor.elementor-29304.e-loop-item', { timeout: 10000 });
    } catch (error) {
        console.log('No more pet elements found or page load timeout');
        return { pets: [], hasNextPage: false };
    }

    // Extract pet data
    const pagePets = await page.evaluate(() => {
        const petElements = document.querySelectorAll('.elementor.elementor-29304.e-loop-item');
        return Array.from(petElements).map(petEl => {
            try {
                // Extract name
                const nameEl = petEl.querySelector('.elementor-heading-title');
                const name = nameEl ? nameEl.textContent.trim() : 'Unknown';
                
                // Extract all text content
                const allText = petEl.textContent
                    .replace(/\s+/g, ' ')
                    .replace(/[\n\t]+/g, ' ')
                    .trim();
                
                // Extract age
                let age = 'Unknown';
                const ageMatch = allText.match(/Age:\s*([^\s,]+(?:\s+[^\s,]+)*)/i);
                if (ageMatch && ageMatch[1]) {
                    age = ageMatch[1].replace(/\s+/g, ' ').trim();
                }
                
                // Extract breed and color
                let breed = 'Unknown';
                let color = 'Unknown';
                const breedMatch = allText.match(/Dog\s+([^\n]+?)(?=\s*(?:Male|Female|Age:|$))/i);
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
                if (allText.includes('Female')) gender = 'Female';
                else if (allText.includes('Male')) gender = 'Male';
                
                // Extract image
                let imageUrl = null;
                const imgEl = petEl.querySelector('img');
                if (imgEl) {
                    const possibleSrc = imgEl.getAttribute('data-src') || 
                                      imgEl.getAttribute('data-lazy-src') || 
                                      imgEl.src;
                    if (possibleSrc && !possibleSrc.includes('data:image') && 
                        !possibleSrc.includes('placeholder') &&
                        !possibleSrc.includes('1x1')) {
                        imageUrl = possibleSrc;
                    }
                }
                
                return {
                    name,
                    age: age.replace(/\s*years?/i, '').trim() + (age ? ' years' : ''),
                    breed,
                    color,
                    gender,
                    imageUrl,
                    source: window.location.href,
                    lastScraped: new Date().toISOString()
                };
            } catch (e) {
                console.error('Error processing pet:', e);
                return null;
            }
        }).filter(Boolean);
    });

    // Check if there's a next page
    const hasNextPage = await page.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('a.page-numbers, .page-numbers a'))
            .find(el => el.textContent.includes('Next') || el.textContent.includes('>'));
        return nextButton && !nextButton.classList.contains('current');
    });

    return { pets: pagePets, hasNextPage };
}

async function scrapePets() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 2000 });
    
    try {
        const existingPets = await loadExistingPets();
        const newPets = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages && currentPage <= CONFIG.maxPages) {
            const { pets: pagePets, hasNextPage } = await scrapePage(page, currentPage);
            
            // Filter out duplicates
            const uniqueNewPets = pagePets.filter(pet => !isDuplicate([...existingPets, ...newPets], pet));
            
            if (uniqueNewPets.length > 0) {
                console.log(`Found ${uniqueNewPets.length} new pets on page ${currentPage}`);
                newPets.push(...uniqueNewPets);
            } else {
                console.log(`No new pets found on page ${currentPage}`);
            }

            hasMorePages = hasNextPage;
            currentPage++;
            
            // Add a small delay between pages
            if (hasMorePages && currentPage <= CONFIG.maxPages) {
                await page.waitForTimeout(2000);
            }
        }

        // Combine and save all pets
        const allPets = [...existingPets, ...newPets];
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(allPets, null, 2));
        
        console.log(`\nScraping complete!`);
        console.log(`- Total pets: ${allPets.length}`);
        console.log(`- New pets added: ${newPets.length}`);
        console.log(`- Data saved to: ${path.resolve(CONFIG.outputFile)}`);
        
        return allPets;
        
    } catch (error) {
        console.error('Error during scraping:', error);
        return [];
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrapePets().catch(console.error);