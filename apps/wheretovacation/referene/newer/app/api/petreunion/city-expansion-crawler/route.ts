import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Get cities in expanding radius from starting city
 * Uses zipcode distance or state-based expansion
 */
async function getCitiesInRadius(
  startCity: string, 
  startState: string, 
  startZip?: string,
  maxCities: number = 50,
  radiusMiles: number = 100
): Promise<Array<{ city: string; state: string; zip?: string; distance: number }>> {
  const cities: Array<{ city: string; state: string; zip?: string; distance: number }> = [];
  
  // Start with the origin city
  cities.push({ city: startCity, state: startState, zip: startZip, distance: 0 });
  
  // If we have a zipcode, we could use a zipcode distance API
  // For now, we'll use a state-based expansion pattern
  
  // Get nearby cities from a predefined list or expand by state
  const nearbyCities = await expandByState(startCity, startState, maxCities - 1, radiusMiles);
  cities.push(...nearbyCities);
  
  return cities.slice(0, maxCities);
}

/**
 * Expand cities by state, prioritizing closer cities
 */
async function expandByState(
  startCity: string,
  startState: string,
  maxCities: number,
  maxRadius: number
): Promise<Array<{ city: string; state: string; zip?: string; distance: number }>> {
  // Common cities by state (you could load this from a database or API)
  const stateCities: Record<string, Array<{ city: string; zip?: string }>> = {
    'Alabama': [
      { city: 'Birmingham', zip: '35203' },
      { city: 'Mobile', zip: '36602' },
      { city: 'Montgomery', zip: '36104' },
      { city: 'Huntsville', zip: '35801' },
      { city: 'Tuscaloosa', zip: '35401' }
    ],
    'Florida': [
      { city: 'Miami', zip: '33101' },
      { city: 'Tampa', zip: '33602' },
      { city: 'Orlando', zip: '32801' },
      { city: 'Jacksonville', zip: '32202' },
      { city: 'Tallahassee', zip: '32301' },
      { city: 'Fort Lauderdale', zip: '33301' },
      { city: 'Pensacola', zip: '32501' }
    ],
    'Georgia': [
      { city: 'Atlanta', zip: '30303' },
      { city: 'Savannah', zip: '31401' },
      { city: 'Augusta', zip: '30901' },
      { city: 'Columbus', zip: '31901' },
      { city: 'Athens', zip: '30601' }
    ],
    'Texas': [
      { city: 'Houston', zip: '77002' },
      { city: 'Dallas', zip: '75201' },
      { city: 'Austin', zip: '78701' },
      { city: 'San Antonio', zip: '78205' },
      { city: 'Fort Worth', zip: '76102' }
    ],
    'New Jersey': [
      { city: 'Camden', zip: '08102' },
      { city: 'Cherry Hill', zip: '08002' },
      { city: 'Vineland', zip: '08360' },
      { city: 'Atlantic City', zip: '08401' },
      { city: 'Millville', zip: '08332' },
      { city: 'Bridgeton', zip: '08302' },
      { city: 'Glassboro', zip: '08028' },
      { city: 'Pleasantville', zip: '08232' }
    ],
    'New York': [
      { city: 'New York', zip: '10001' },
      { city: 'Buffalo', zip: '14201' },
      { city: 'Rochester', zip: '14604' },
      { city: 'Albany', zip: '12207' }
    ],
    'California': [
      { city: 'Los Angeles', zip: '90001' },
      { city: 'San Diego', zip: '92101' },
      { city: 'San Francisco', zip: '94102' },
      { city: 'Sacramento', zip: '95814' }
    ]
  };
  
  const cities: Array<{ city: string; state: string; zip?: string; distance: number }> = [];
  
  // Start with same state cities
  const sameStateCities = stateCities[startState] || [];
  let added = 0;
  
  for (const cityData of sameStateCities) {
    if (cityData.city.toLowerCase() === startCity.toLowerCase()) continue;
    if (added >= maxCities) break;
    
    cities.push({
      city: cityData.city,
      state: startState,
      zip: cityData.zip,
      distance: 25 + (added * 25) // Approximate distance
    });
    added++;
  }
  
  // Then add neighboring states (simplified - you could use actual distance calculations)
  const neighboringStates: Record<string, string[]> = {
    'Alabama': ['Florida', 'Georgia', 'Mississippi', 'Tennessee'],
    'Florida': ['Georgia', 'Alabama'],
    'Georgia': ['Florida', 'Alabama', 'South Carolina', 'Tennessee', 'North Carolina'],
    'Texas': ['Louisiana', 'Oklahoma', 'New Mexico', 'Arkansas'],
    'New Jersey': ['New York', 'Pennsylvania', 'Delaware'],
    'New York': ['New Jersey', 'Pennsylvania', 'Connecticut', 'Massachusetts'],
    'California': ['Nevada', 'Oregon', 'Arizona']
  };
  
  const neighbors = neighboringStates[startState] || [];
  for (const neighborState of neighbors) {
    if (added >= maxCities) break;
    const neighborCities = stateCities[neighborState] || [];
    
    for (const cityData of neighborCities.slice(0, 5)) {
      if (added >= maxCities) break;
      cities.push({
        city: cityData.city,
        state: neighborState,
        zip: cityData.zip,
        distance: 50 + (added * 25)
      });
      added++;
    }
  }
  
  return cities;
}

/**
 * Main crawler that discovers shelters and scrapes them in expanding circles
 */
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
      startCity,
      startState,
      startZip,
      maxCities = 50,
      maxRadius = 200,
      discoverShelters = true,
      scrapeShelters = true,
      delayBetweenCities = 5000
    } = body;
    
    if (!startCity || !startState) {
      return NextResponse.json(
        { error: 'startCity and startState are required' },
        { status: 400 }
      );
    }
    
    console.log(`[CITY EXPANSION] Starting from ${startCity}, ${startState}...`);
    
    // Get cities in expanding radius
    const cities = await getCitiesInRadius(startCity, startState, startZip, maxCities, maxRadius);
    
    console.log(`[CITY EXPANSION] Found ${cities.length} cities to process`);
    
    const results = {
      citiesProcessed: 0,
      sheltersDiscovered: 0,
      sheltersScraped: 0,
      petsFound: 0,
      petsSaved: 0,
      errors: [] as string[]
    };
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    
    // Process each city
    for (let i = 0; i < cities.length; i++) {
      const cityData = cities[i];
      
      try {
        console.log(`[CITY EXPANSION] [${i + 1}/${cities.length}] Processing ${cityData.city}, ${cityData.state} (distance: ${cityData.distance}mi)...`);
        
        // Step 1: Discover shelters in this city
        if (discoverShelters) {
          try {
            const discoverResponse = await fetch(`${baseUrl}/api/petreunion/discover-shelters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                city: cityData.city,
                state: cityData.state,
                zipcode: cityData.zip,
                sources: ['adoptapet', 'petfinder']
              })
            });
            
            const discoverData = await discoverResponse.json();
            
            if (discoverData.success) {
              results.sheltersDiscovered += discoverData.saved || 0;
              console.log(`[CITY EXPANSION] Discovered ${discoverData.saved} new shelters in ${cityData.city}`);
            }
          } catch (error: any) {
            results.errors.push(`Discover error in ${cityData.city}: ${error.message}`);
          }
        }
        
        // Step 2: Scrape shelters in this city
        if (scrapeShelters) {
          try {
            const scrapeResponse = await fetch(`${baseUrl}/api/petreunion/scrape-discovered-shelters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                city: cityData.city,
                state: cityData.state,
                maxShelters: 20,
                onlyUnscraped: false
              })
            });
            
            const scrapeData = await scrapeResponse.json();
            
            if (scrapeData.success) {
              results.sheltersScraped += scrapeData.sheltersScraped || 0;
              results.petsFound += scrapeData.totalPetsFound || 0;
              results.petsSaved += scrapeData.totalPetsSaved || 0;
              console.log(`[CITY EXPANSION] Scraped ${scrapeData.sheltersScraped} shelters, found ${scrapeData.totalPetsFound} pets in ${cityData.city}`);
            }
          } catch (error: any) {
            results.errors.push(`Scrape error in ${cityData.city}: ${error.message}`);
          }
        }
        
        results.citiesProcessed++;
        
        // Delay between cities
        if (i < cities.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCities));
        }
        
      } catch (error: any) {
        results.errors.push(`Error processing ${cityData.city}: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      cities: cities.length,
      message: `Processed ${results.citiesProcessed} cities. Discovered ${results.sheltersDiscovered} shelters, scraped ${results.sheltersScraped}, found ${results.petsFound} pets, saved ${results.petsSaved}`
    });
    
  } catch (error: any) {
    console.error('[CITY EXPANSION] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run city expansion crawler' },
      { status: 500 }
    );
  }
}


