/**
 * Rental Scraper for Where To Vacation
 *
 * Scrapes vacation rentals from various sources and adds them to the database
 * Supports all rental types: condos, houses, villas, beachfront, etc.
 *
 * Usage:
 *   node scripts/rental-scraper.js
 *   node scripts/rental-scraper.js --source=airbnb
 *   node scripts/rental-scraper.js --source=vrbo
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rental types supported
const RENTAL_TYPES = [
  'condo',
  'house',
  'villa',
  'apartment',
  'cottage',
  'cabin',
  'beachfront',
  'waterfront',
  'gulf_view',
  'pool',
  'pet_friendly',
];

// Property categories
const PROPERTY_CATEGORIES = {
  beachfront: ['condo', 'house', 'villa'],
  family: ['house', 'condo', 'cottage'],
  luxury: ['villa', 'house', 'condo'],
  budget: ['condo', 'apartment', 'cottage'],
  pet_friendly: ['house', 'cottage', 'cabin'],
};

/**
 * Scrape rentals from a source
 */
async function scrapeRentals(source = 'manual', location = 'Gulf Coast') {
  console.log(`🔍 Scraping rentals from ${source} for ${location}...`);

  // Example: Scrape from Airbnb (would use API in production)
  if (source === 'airbnb' || source === 'all') {
    return await scrapeAirbnb(location);
  }

  // Example: Scrape from VRBO
  if (source === 'vrbo' || source === 'all') {
    return await scrapeVRBO(location);
  }

  // Example: Scrape from local rental sites
  if (source === 'local_sites' || source === 'all') {
    return await scrapeLocalRentalSites(location);
  }

  return [];
}

/**
 * Scrape Airbnb for rentals
 */
async function scrapeAirbnb(location) {
  console.log(`🏠 Scraping Airbnb for ${location}...`);

  try {
    // TODO: Implement actual Airbnb scraping logic
    // For now, return empty array - no mock data
    console.log('⚠️  Airbnb scraping not yet implemented. Returning empty array.');
    return [];
  } catch (error) {
    console.error(`❌ Error scraping Airbnb for ${location}:`, error.message);
    return [];
  }
}

/**
 * Scrape VRBO for rentals
 */
async function scrapeVRBO(location) {
  console.log(`🏡 Scraping VRBO for ${location}...`);

  // TODO: Implement actual VRBO scraping logic
  // For now, return empty array - no mock data
  console.log('⚠️  VRBO scraping not yet implemented. Returning empty array.');
  return [];
}

/**
 * Scrape local rental websites
 */
async function scrapeLocalRentalSites(location) {
  console.log(`🌐 Scraping local rental sites for ${location}...`);

  // TODO: Implement actual local rental site scraping logic
  // For now, return empty array - no mock data
  console.log('⚠️  Local rental site scraping not yet implemented. Returning empty array.');
  return [];
}

/**
 * Insert rental into database
 */
async function insertRental(rental) {
  try {
    // Check if rental already exists
    const { data: existing } = await supabase
      .from('rentals')
      .select('id')
      .eq('name', rental.name)
      .eq('location', rental.location)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping duplicate: ${rental.name} in ${rental.location}`);
      return { inserted: false, reason: 'duplicate' };
    }

    // Insert new rental
    const { data, error } = await supabase
      .from('rentals')
      .insert([{
        name: rental.name,
        rental_type: rental.rental_type,
        property_category: rental.property_category,
        bedrooms: rental.bedrooms,
        bathrooms: rental.bathrooms,
        max_guests: rental.max_guests,
        price_per_night: rental.price_per_night,
        location: rental.location,
        address: rental.address,
        description: rental.description,
        amenities: rental.amenities || [],
        available: rental.available !== false,
        source: rental.source || 'manual',
        source_url: rental.source_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      console.error(`❌ Error inserting ${rental.name}:`, error.message);
      return { inserted: false, error: error.message };
    }

    console.log(`✅ Added: ${rental.name} (${rental.rental_type}) in ${rental.location}`);

    // Trigger activities bot (makes activities available to Finn)
    try {
      const botUrl = process.env.ACTIVITIES_BOT_URL || process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3006';
      await fetch(`${botUrl}/api/activities/trigger-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'new_rental_added',
          rentalId: data[0].id,
          rentalName: rental.name,
          location: rental.location,
        }),
      });
      console.log(`  ✅ Triggered activities bot for Finn`);
    } catch (error) {
      console.error('  ⚠️  Failed to trigger activities bot:', error.message);
    }

    return { inserted: true, data };
  } catch (error) {
    console.error(`❌ Error inserting ${rental.name}:`, error.message);
    return { inserted: false, error: error.message };
  }
}

/**
 * Run the scraper
 */
async function runScraper() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : 'all';
  const location = 'Gulf Coast';

  console.log('🏠 Starting Rental Scraper');
  console.log('==========================================\n');
  console.log(`Source: ${source}`);
  console.log(`Location: ${location}\n`);

  try {
    const rentals = await scrapeRentals(source, location);

    console.log(`📋 Found ${rentals.length} rentals\n`);

    let added = 0;
    let skipped = 0;

    for (const rental of rentals) {
      const result = await insertRental(rental);
      if (result.inserted) {
        added++;
      } else {
        skipped++;
      }
    }

    console.log('\n==========================================');
    console.log('📊 Scraping Summary');
    console.log('==========================================');
    console.log(`✅ Added: ${added} rentals`);
    console.log(`⏭️  Skipped: ${skipped} duplicates`);
    console.log('==========================================\n');

    return {
      success: true,
      stats: {
        total: rentals.length,
        added,
        skipped,
      },
    };
  } catch (error) {
    console.error('❌ Scraper error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run if called directly
if (require.main === module) {
  runScraper()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runScraper, scrapeRentals, insertRental };
