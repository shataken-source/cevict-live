import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Major US cities with high pet populations
const TARGET_CITIES = [
  // Alabama
  { city: 'Birmingham', state: 'Alabama', zip: '35203' },
  { city: 'Mobile', state: 'Alabama', zip: '36602' },
  { city: 'Montgomery', state: 'Alabama', zip: '36104' },
  { city: 'Huntsville', state: 'Alabama', zip: '35801' },
  { city: 'Tuscaloosa', state: 'Alabama', zip: '35401' },
  
  // Florida
  { city: 'Miami', state: 'Florida', zip: '33101' },
  { city: 'Tampa', state: 'Florida', zip: '33602' },
  { city: 'Orlando', state: 'Florida', zip: '32801' },
  { city: 'Jacksonville', state: 'Florida', zip: '32202' },
  { city: 'Tallahassee', state: 'Florida', zip: '32301' },
  
  // Georgia
  { city: 'Atlanta', state: 'Georgia', zip: '30303' },
  { city: 'Savannah', state: 'Georgia', zip: '31401' },
  { city: 'Augusta', state: 'Georgia', zip: '30901' },
  
  // Texas
  { city: 'Houston', state: 'Texas', zip: '77002' },
  { city: 'Dallas', state: 'Texas', zip: '75201' },
  { city: 'Austin', state: 'Texas', zip: '78701' },
  { city: 'San Antonio', state: 'Texas', zip: '78205' },
  
  // California
  { city: 'Los Angeles', state: 'California', zip: '90001' },
  { city: 'San Diego', state: 'California', zip: '92101' },
  { city: 'San Francisco', state: 'California', zip: '94102' },
  { city: 'Sacramento', state: 'California', zip: '95814' },
  
  // New York
  { city: 'New York', state: 'New York', zip: '10001' },
  { city: 'Buffalo', state: 'New York', zip: '14201' },
  
  // New Jersey (South Jersey)
  { city: 'Camden', state: 'New Jersey', zip: '08102' },
  { city: 'Cherry Hill', state: 'New Jersey', zip: '08002' },
  { city: 'Vineland', state: 'New Jersey', zip: '08360' },
  { city: 'Atlantic City', state: 'New Jersey', zip: '08401' },
  { city: 'Millville', state: 'New Jersey', zip: '08332' },
  { city: 'Bridgeton', state: 'New Jersey', zip: '08302' },
  { city: 'Glassboro', state: 'New Jersey', zip: '08028' },
  { city: 'Pleasantville', state: 'New Jersey', zip: '08232' },
  
  // Illinois
  { city: 'Chicago', state: 'Illinois', zip: '60601' },
  
  // More cities...
  { city: 'Phoenix', state: 'Arizona', zip: '85001' },
  { city: 'Seattle', state: 'Washington', zip: '98101' },
  { city: 'Portland', state: 'Oregon', zip: '97201' },
  { city: 'Denver', state: 'Colorado', zip: '80202' },
  { city: 'Nashville', state: 'Tennessee', zip: '37201' },
  { city: 'Memphis', state: 'Tennessee', zip: '38103' },
  { city: 'New Orleans', state: 'Louisiana', zip: '70112' },
  { city: 'Baton Rouge', state: 'Louisiana', zip: '70801' },
  { city: 'Jackson', state: 'Mississippi', zip: '39201' },
  { city: 'Gulfport', state: 'Mississippi', zip: '39501' },
];

// AdoptAPet search URLs for each city
function generateAdoptAPetUrls() {
  const urls: Array<{ url: string; city: string; state: string }> = [];
  
  for (const location of TARGET_CITIES) {
    // Dogs
    urls.push({
      url: `https://www.adoptapet.com/pet-search?location=${encodeURIComponent(location.city + ', ' + location.state)}&animal_type_id=2&breed_id=&radius=25`,
      city: location.city,
      state: location.state
    });
    
    // Cats
    urls.push({
      url: `https://www.adoptapet.com/pet-search?location=${encodeURIComponent(location.city + ', ' + location.state)}&animal_type_id=1&breed_id=&radius=25`,
      city: location.city,
      state: location.state
    });
  }
  
  return urls;
}

// Scrape from AdoptAPet
async function scrapeAdoptAPet(url: string, city: string, state: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/scrape-adoptapet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        maxPages: 3, // Get first 3 pages per location
        shelterId: null
      })
    });
    
    const data = await response.json();
    return {
      success: data.success,
      petsScraped: data.petsScraped || 0,
      petsSaved: data.petsSaved || 0,
      city,
      state,
      url
    };
  } catch (error: any) {
    return {
      success: false,
      petsScraped: 0,
      petsSaved: 0,
      city,
      state,
      url,
      error: error.message
    };
  }
}

// Main population function
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      maxCities = 50, 
      startCity = 'Camden', // Default to South Jersey
      startState = 'New Jersey',
      startZip,
      delayBetweenCities = 5000, // 5 seconds
      useCityExpansion = true // Use city expansion crawler (small rescues only)
    } = body;

    console.log(`[POPULATE DB] Starting database population...`);
    console.log(`[POPULATE DB] Using city expansion crawler (SMALL RESCUE SHELTERS ONLY)`);
    console.log(`[POPULATE DB] Starting from: ${startCity}, ${startState}`);
    console.log(`[POPULATE DB] Max cities: ${maxCities}`);

    const results = {
      totalCities: 0,
      totalPetsScraped: 0,
      totalPetsSaved: 0,
      sheltersDiscovered: 0,
      sheltersScraped: 0,
      citiesProcessed: [] as any[],
      errors: [] as string[],
      startTime: new Date().toISOString()
    };

    // Use city expansion crawler (discovers and scrapes small rescue shelters)
    if (useCityExpansion) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
      
      console.log(`[POPULATE DB] Step 1: Discovering shelters...`);
      
      // Step 1: Discover shelters first
      try {
        const crawlerResponse = await fetch(`${baseUrl}/api/petreunion/city-expansion-crawler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startCity,
            startState,
            startZip,
            maxCities,
            maxRadius: 200,
            discoverShelters: true,
            scrapeShelters: false, // Don't scrape yet, just discover
            delayBetweenCities: Math.max(2000, delayBetweenCities / 2) // Faster for discovery
          })
        });
        
        const crawlerData = await crawlerResponse.json();
        
        if (crawlerData.success) {
          results.totalCities = crawlerData.cities || 0;
          results.sheltersDiscovered = crawlerData.sheltersDiscovered || 0;
          console.log(`[POPULATE DB] Discovered ${results.sheltersDiscovered} shelters`);
        }
      } catch (error: any) {
        console.error('[POPULATE DB] Discovery error:', error);
      }
      
      // Step 2: Bulk scrape Facebook shelters (FASTEST method)
      console.log(`[POPULATE DB] Step 2: Bulk scraping Facebook shelters...`);
      try {
        const bulkScrapeResponse = await fetch(`${baseUrl}/api/petreunion/bulk-scrape-facebook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maxShelters: 200, // Scrape up to 200 Facebook shelters
            maxPetsPerShelter: 50,
            parallel: 5, // 5 parallel scrapers
            city: startCity,
            state: startState
          })
        });
        
        const bulkData = await bulkScrapeResponse.json();
        
        if (bulkData.success) {
          results.sheltersScraped = bulkData.summary?.sheltersScraped || 0;
          results.totalPetsScraped = bulkData.summary?.totalPetsFound || 0;
          results.totalPetsSaved = bulkData.summary?.totalPetsSaved || 0;
          console.log(`[POPULATE DB] Bulk scrape complete: ${results.totalPetsSaved} pets saved`);
        }
      } catch (error: any) {
        results.errors.push(`Bulk Facebook scrape error: ${error.message}`);
        console.error('[POPULATE DB] Bulk scrape error:', error);
      }
      
      // Step 3: Also scrape non-Facebook shelters (backup)
      console.log(`[POPULATE DB] Step 3: Scraping non-Facebook shelters...`);
      try {
        const scrapeResponse = await fetch(`${baseUrl}/api/petreunion/scrape-discovered-shelters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: startCity,
            state: startState,
            maxShelters: 50,
            onlyUnscraped: false
          })
        });
        
        const scrapeData = await scrapeResponse.json();
        
        if (scrapeData.success) {
          results.sheltersScraped += scrapeData.sheltersScraped || 0;
          results.totalPetsScraped += scrapeData.totalPetsFound || 0;
          results.totalPetsSaved += scrapeData.totalPetsSaved || 0;
        }
      } catch (error: any) {
        results.errors.push(`Shelter scrape error: ${error.message}`);
        console.error('[POPULATE DB] Shelter scrape error:', error);
      }
      
      results.citiesProcessed = [{ 
        city: startCity, 
        state: startState,
        message: `Discovered ${results.sheltersDiscovered} shelters, scraped ${results.sheltersScraped}, saved ${results.totalPetsSaved} pets`
      }];
    } else {
      // Fallback to old AdoptAPet method (not recommended)
      const urls = generateAdoptAPetUrls();
      const citiesToProcess = urls.slice(0, maxCities);
      results.totalCities = citiesToProcess.length;

      console.log(`[POPULATE DB] Processing ${citiesToProcess.length} AdoptAPet locations...`);

      for (let i = 0; i < citiesToProcess.length; i++) {
        const { url, city, state } = citiesToProcess[i];
        
        console.log(`[POPULATE DB] [${i + 1}/${citiesToProcess.length}] Scraping ${city}, ${state}...`);
        
        const result = await scrapeAdoptAPet(url, city, state);
        
        results.totalPetsScraped += result.petsScraped;
        results.totalPetsSaved += result.petsSaved;
        results.citiesProcessed.push(result);

        // Delay between cities to avoid rate limiting
        if (i < citiesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCities));
        }
      }
    }

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(results.startTime).getTime();

    // Get current database count
    const { count: currentCount } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      summary: {
        totalCitiesProcessed: results.totalCities,
        sheltersDiscovered: results.sheltersDiscovered,
        sheltersScraped: results.sheltersScraped,
        totalPetsScraped: results.totalPetsScraped,
        totalPetsSaved: results.totalPetsSaved,
        currentDatabaseTotal: currentCount || 0,
        duration: `${Math.round(duration / 1000)} seconds`,
        startTime: results.startTime,
        endTime
      },
      citiesProcessed: results.citiesProcessed,
      errors: results.errors,
      message: `Successfully processed ${results.totalCities} cities. Discovered ${results.sheltersDiscovered} small rescue shelters, scraped ${results.sheltersScraped} shelters, found ${results.totalPetsScraped} pets, saved ${results.totalPetsSaved} to database.`
    });

  } catch (error: any) {
    console.error('[POPULATE DB] Error:', error);
    return NextResponse.json(
      { 
        error: 'Database population failed', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current database stats
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { count: totalPets } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });

    const { count: dogs } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true })
      .eq('pet_type', 'dog');

    const { count: cats } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true })
      .eq('pet_type', 'cat');

    const { count: foundPets } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'found');

    const { count: lostPets } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'lost');

    // Get pets by state
    const { data: petsByState } = await supabase
      .from('lost_pets')
      .select('location_state')
      .not('location_state', 'is', null);

    const stateCounts: Record<string, number> = {};
    petsByState?.forEach(pet => {
      const state = pet.location_state;
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalPets: totalPets || 0,
        dogs: dogs || 0,
        cats: cats || 0,
        foundPets: foundPets || 0,
        lostPets: lostPets || 0,
        petsByState: stateCounts,
        targetCities: TARGET_CITIES.length
      },
      message: `Database currently has ${totalPets || 0} pets`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get stats', message: error.message },
      { status: 500 }
    );
  }
}

