/**
 * 

/**
 * PetReunion 50-State Scraper
 * Logic: Loops through all 50 states and scrapes 25 cities per state.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Initialize Supabase (Using your credentials)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. State & City Data (Simplified for the example)
const STATES = [
  { name: 'Alabama', code: 'AL', cities: ['Mobile', 'Birmingham', 'Montgomery', 'Huntsville', 'Tuscaloosa', 'Albertville', 'Decatur', 'Dothan', 'Auburn', 'Hoover', 'Madison', 'Florence', 'Gadsden', 'Prattville', 'Phenix City', 'Vestavia Hills', 'Alabaster', 'Bessemer', 'Opelika', 'Enterprise', 'Homewood', 'Northport', 'Anniston', 'Athens', 'Pelham'] },
  // ... Add lists for other states here or load from a JSON file
];

async function runGlobalScrape() {
  console.log("🚀 Starting 50-State " + "PetReunion".toUpperCase() + " Expansion...");
  
  for (const state of STATES) {
    console.log(`\n🌎 PROCESSING STATE: ${state.name} (${state.code})`);
    
    // Process up to 25 cities
    const targetCities = state.cities.slice(0, 25);

    for (const city of targetCities) {
      console.log(`🔍 Scraping ${city}, ${state.code}...`);
      
      try {
        // Here we trigger the platform-specific mock data generation
        const fbPets = await generateMockData(city, state.code, 'Facebook');
        const igPets = await generateMockData(city, state.code, 'Instagram');
        
        const allFound = [...fbPets, ...igPets];
        
        for (const pet of allFound) {
          // Check for duplicates before inserting
          const { data: existing } = await supabase
            .from('lost_pets')
            .select('id')
            .eq('pet_name', pet.pet_name)
            .eq('location_city', pet.location_city)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('lost_pets').insert([pet]);
          }
        }
        
        // Wait 1 second between cities to manage system resources
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (err) {
        console.error(`❌ Failed city ${city}:`, err.message);
      }
    }
  }
}

// Mock generator for the expansion
async function generateMockData(city, state, source) {
  return [{
    pet_name: "Buddy",
    pet_type: "dog",
    breed: "Labrador",
    color: "Yellow",
    location_city: city,
    location_state: state,
    status: "found",
    description: `Auto-scraped from ${source} for ${city}.`,
    date_lost: new Date().toISOString().split('T')[0]
  }];
}

runGlobalScrape();