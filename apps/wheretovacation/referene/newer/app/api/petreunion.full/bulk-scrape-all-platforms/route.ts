import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * BULK SCRAPE ALL PLATFORMS
 * Scrapes from Facebook, Pawboost, and PetHarbor in parallel
 * Fastest way to get 15,000+ pets
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
      cities = [], // Array of {city, state, zipcode}
      maxPetsPerCity = 100,
      platforms = ['facebook', 'pawboost', 'petharbor']
    } = body;
    
    // Default cities if none provided (focus on South Jersey + major cities)
    const defaultCities = cities.length > 0 ? cities : [
      { city: 'Camden', state: 'New Jersey', zipcode: '08102' },
      { city: 'Cherry Hill', state: 'New Jersey', zipcode: '08002' },
      { city: 'Vineland', state: 'New Jersey', zipcode: '08360' },
      { city: 'Atlantic City', state: 'New Jersey', zipcode: '08401' },
      { city: 'Philadelphia', state: 'Pennsylvania', zipcode: '19102' },
      { city: 'Birmingham', state: 'Alabama', zipcode: '35203' },
      { city: 'Mobile', state: 'Alabama', zipcode: '36602' },
      { city: 'Miami', state: 'Florida', zipcode: '33101' },
      { city: 'Tampa', state: 'Florida', zipcode: '33602' },
      { city: 'Atlanta', state: 'Georgia', zipcode: '30303' },
      { city: 'Houston', state: 'Texas', zipcode: '77002' },
      { city: 'Dallas', state: 'Texas', zipcode: '75201' },
      { city: 'Los Angeles', state: 'California', zipcode: '90001' },
      { city: 'Chicago', state: 'Illinois', zipcode: '60601' },
      { city: 'New York', state: 'New York', zipcode: '10001' }
    ];
    
    console.log(`[BULK ALL PLATFORMS] Starting bulk scrape for ${defaultCities.length} cities...`);
    console.log(`[BULK ALL PLATFORMS] Platforms: ${platforms.join(', ')}`);
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app';
    const results = {
      citiesProcessed: 0,
      totalPetsFound: 0,
      totalPetsSaved: 0,
      platformResults: {
        facebook: { found: 0, saved: 0 },
        pawboost: { found: 0, saved: 0 },
        petharbor: { found: 0, saved: 0 }
      },
      errors: [] as string[],
      startTime: Date.now()
    };
    
    // Process each city
    for (let i = 0; i < defaultCities.length; i++) {
      const { city, state, zipcode } = defaultCities[i];
      
      console.log(`[BULK ALL PLATFORMS] [${i + 1}/${defaultCities.length}] Processing ${city}, ${state}...`);
      
      // Scrape all platforms in parallel for this city
      const platformPromises: Promise<any>[] = [];
      
      // Facebook: Get shelters first, then scrape
      if (platforms.includes('facebook')) {
        platformPromises.push(
          (async () => {
            try {
              // First discover Facebook shelters in this city
              const discoverResponse = await fetch(`${baseUrl}/api/petreunion/discover-shelters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  city,
                  state,
                  zipcode,
                  sources: ['facebook']
                })
              });
              
              const discoverData = await discoverResponse.json();
              
              if (discoverData.success && discoverData.saved > 0) {
                // Then bulk scrape Facebook shelters
                const fbResponse = await fetch(`${baseUrl}/api/petreunion/bulk-scrape-facebook`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    maxShelters: 50,
                    maxPetsPerShelter: 30,
                    parallel: 3,
                    city,
                    state
                  })
                });
                
                const fbData = await fbResponse.json();
                return { platform: 'facebook', ...fbData.summary || {} };
              }
              
              return { platform: 'facebook', totalPetsFound: 0, totalPetsSaved: 0 };
            } catch (error: any) {
              return { platform: 'facebook', error: error.message };
            }
          })()
        );
      }
      
      // Pawboost
      if (platforms.includes('pawboost')) {
        platformPromises.push(
          (async () => {
            try {
              const response = await fetch(`${baseUrl}/api/petreunion/scrape-pawboost`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  city,
                  state,
                  zipcode,
                  maxPets: maxPetsPerCity
                })
              });
              
              const data = await response.json();
              return { 
                platform: 'pawboost', 
                totalPetsFound: data.petsFound || 0, 
                totalPetsSaved: data.petsSaved || 0 
              };
            } catch (error: any) {
              return { platform: 'pawboost', error: error.message };
            }
          })()
        );
      }
      
      // PetHarbor
      if (platforms.includes('petharbor')) {
        platformPromises.push(
          (async () => {
            try {
              const response = await fetch(`${baseUrl}/api/petreunion/scrape-petharbor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  city,
                  state,
                  zipcode,
                  maxPets: maxPetsPerCity
                })
              });
              
              const data = await response.json();
              return { 
                platform: 'petharbor', 
                totalPetsFound: data.petsFound || 0, 
                totalPetsSaved: data.petsSaved || 0 
              };
            } catch (error: any) {
              return { platform: 'petharbor', error: error.message };
            }
          })()
        );
      }
      
      // Wait for all platforms to complete for this city
      const cityResults = await Promise.all(platformPromises);
      
      // Aggregate results
      for (const result of cityResults) {
        if (result.error) {
          results.errors.push(`${result.platform} in ${city}: ${result.error}`);
        } else {
          results.platformResults[result.platform as keyof typeof results.platformResults].found += result.totalPetsFound || 0;
          results.platformResults[result.platform as keyof typeof results.platformResults].saved += result.totalPetsSaved || 0;
          results.totalPetsFound += result.totalPetsFound || 0;
          results.totalPetsSaved += result.totalPetsSaved || 0;
        }
      }
      
      results.citiesProcessed++;
      
      console.log(`[BULK ALL PLATFORMS] ${city} complete. Total so far: ${results.totalPetsSaved} pets saved`);
      
      // Small delay between cities
      if (i < defaultCities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const duration = Math.round((Date.now() - results.startTime) / 1000);
    
    // Get current database count
    const { count: currentCount } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      success: true,
      summary: {
        citiesProcessed: results.citiesProcessed,
        totalPetsFound: results.totalPetsFound,
        totalPetsSaved: results.totalPetsSaved,
        currentDatabaseTotal: currentCount || 0,
        duration: `${duration} seconds`,
        petsPerMinute: duration > 0 ? Math.round((results.totalPetsSaved / duration) * 60) : 0,
        platformBreakdown: results.platformResults
      },
      errors: results.errors.slice(0, 20),
      message: `Processed ${results.citiesProcessed} cities across ${platforms.length} platforms. Found ${results.totalPetsFound} pets, saved ${results.totalPetsSaved} to database. Current total: ${currentCount || 0} pets.`
    });
    
  } catch (error: any) {
    console.error('[BULK ALL PLATFORMS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk scrape all platforms' },
      { status: 500 }
    );
  }
}

