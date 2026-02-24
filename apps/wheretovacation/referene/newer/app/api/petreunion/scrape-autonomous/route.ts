import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface ScrapedPet {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age?: string;
  gender?: string;
  size?: string;
  color?: string;
  photo_url?: string;
  description: string;
  status: 'lost' | 'found';
  location_city?: string;
  location_state?: string;
  location_detail?: string;
  date_lost?: string;
  date_found?: string;
  source: string;
  source_url?: string;
  contact_info?: string;
}

interface ScrapeResult {
  source: string;
  success: boolean;
  petsFound: number;
  petsSaved: number;
  errors: string[];
  duration: number;
}

// Facebook scraper - searches for lost/found pet posts
async function scrapeFacebook(location: string = 'Alabama'): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  console.log(`[FACEBOOK] Starting Facebook scrape for location: ${location}`);
  
  // Facebook search URLs for lost/found pets
  const searchTerms = [
    `lost dog ${location}`,
    `lost cat ${location}`,
    `found dog ${location}`,
    `found cat ${location}`,
    `missing dog ${location}`,
    `missing cat ${location}`,
    `pet lost ${location}`,
    `pet found ${location}`
  ];
  
  // Note: Facebook requires authentication and has strict rate limits
  // This is a simplified version - in production, you'd need:
  // 1. Facebook Graph API access
  // 2. Or use a service like Apify/ScraperAPI
  // 3. Or scrape public groups/pages (with proper permissions)
  
  // For now, we'll use a pattern that works with public Facebook posts
  // In production, integrate with Facebook Graph API or a scraping service
  
  try {
    // Example: Search public Facebook posts (this would need proper implementation)
    // For now, return empty array - will be enhanced with actual Facebook API integration
    console.log(`[FACEBOOK] Facebook scraping requires API integration`);
    console.log(`[FACEBOOK] Consider using Facebook Graph API or a scraping service`);
    
    // Placeholder: In production, implement actual Facebook scraping
    // This could use:
    // - Facebook Graph API (requires app approval)
    // - Public group scraping (with rate limiting)
    // - Third-party scraping service
    
  } catch (error: any) {
    console.error(`[FACEBOOK] Error:`, error.message);
  }
  
  return pets;
}

// Enhanced Facebook scraper using public group/pages
async function scrapeFacebookGroups(location: string = 'Alabama'): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  // Common Facebook groups for lost/found pets
  const groupPatterns = [
    `Lost and Found Pets ${location}`,
    `Lost Dogs ${location}`,
    `Lost Cats ${location}`,
    `Pet Recovery ${location}`,
    `Missing Pets ${location}`
  ];
  
  console.log(`[FACEBOOK] Searching Facebook groups for: ${location}`);
  
  // This would need actual implementation with:
  // 1. Facebook Graph API access
  // 2. Or web scraping of public groups (with proper rate limiting)
  // 3. Or integration with a service like Apify
  
  // For demonstration, we'll create a structure that can be enhanced
  // In production, you'd implement actual Facebook API calls here
  
  return pets;
}

// Shelter scraper - scrapes multiple shelter sites
async function scrapeShelters(location: string = 'Alabama'): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  console.log(`[SHELTERS] Starting shelter scrape for: ${location}`);
  
  // List of shelter sites to scrape
  const shelterSites = [
    {
      name: 'AdoptAPet',
      url: `https://www.adoptapet.com/pet-search?location=${location}`,
      type: 'adoptapet'
    },
    {
      name: 'Petfinder',
      url: `https://www.petfinder.com/search/dogs-for-adoption/us/${location.toLowerCase().replace(/\s+/g, '-')}/`,
      type: 'petfinder'
    }
  ];
  
  for (const site of shelterSites) {
    try {
      console.log(`[SHELTERS] Scraping ${site.name}...`);
      
      // Call the appropriate scraper API
      // Use relative URL or construct from request
      // Since we're in the same server, we can use relative paths or localhost:3002
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
      const scraperUrl = site.type === 'adoptapet' 
        ? `${baseUrl}/api/petreunion/scrape-adoptapet`
        : `${baseUrl}/api/petreunion/scrape-alternative-sites`;
      
      console.log(`[SHELTERS] Calling scraper: ${scraperUrl}`);
      
      console.log(`[SHELTERS] Calling ${site.name} scraper with URL: ${site.url}`);
      
      const response = await fetch(scraperUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: site.url,
          location,
          maxPages: 5 
        })
      });
      
      console.log(`[SHELTERS] ${site.name} response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[SHELTERS] ${site.name} response:`, {
          success: data.success,
          petsFound: data.petsFound || data.petsScraped || 0,
          petsSaved: data.petsSaved || 0,
          hasPetsArray: !!data.pets,
          petsArrayLength: data.pets?.length || 0,
          fullResponse: JSON.stringify(data).substring(0, 500)
        });
        
        if (data.pets && Array.isArray(data.pets) && data.pets.length > 0) {
          data.pets.forEach((pet: any) => {
            pets.push({
              name: pet.pet_name || pet.name || 'Unknown',
              type: (pet.pet_type || pet.type || 'dog') as 'dog' | 'cat',
              breed: pet.breed || 'Mixed Breed',
              age: pet.age || 'Unknown',
              gender: pet.gender || 'Unknown',
              size: pet.size || 'medium',
              color: pet.color || 'N/A',
              photo_url: pet.photo_url || pet.photo || undefined,
              description: pet.description || `${pet.age || 'Unknown'}, ${pet.breed || 'Mixed Breed'}`,
              status: 'found', // Shelter pets are "found" (available for adoption)
              location_city: pet.location_city || location.split(',')[0] || 'Unknown',
              location_state: pet.location_state || location.split(',')[1]?.trim() || 'AL',
              source: site.name,
              source_url: site.url
            });
          });
          console.log(`[SHELTERS] Added ${data.pets.length} pets from ${site.name} to results`);
        } else {
          console.log(`[SHELTERS] No pets found in ${site.name} response (or empty array)`);
          console.log(`[SHELTERS] Response data:`, JSON.stringify(data).substring(0, 500));
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[SHELTERS] ${site.name} API returned error ${response.status}:`, errorText.substring(0, 500));
        console.error(`[SHELTERS] Full error response:`, errorText);
      }
    } catch (error: any) {
      console.error(`[SHELTERS] Error scraping ${site.name}:`, error.message);
    }
  }
  
  return pets;
}

// Save pets to database with deduplication
async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const pet of pets) {
    try {
      // Check for duplicates (by name + location + source)
      const { data: existing } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .ilike('location_city', pet.location_city || '')
        .eq('status', pet.status)
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Determine date
      const dateField = pet.status === 'lost' ? 'date_lost' : 'date_found';
      const dateValue = pet.date_lost || pet.date_found || new Date().toISOString().split('T')[0];
      
      // Save pet
      const { error: insertError } = await supabase
        .from('lost_pets')
        .insert({
          pet_name: pet.name,
          pet_type: pet.type,
          breed: pet.breed,
          color: pet.color || 'N/A',
          size: pet.size || 'medium',
          description: `${pet.description} (Source: ${pet.source})`,
          photo_url: pet.photo_url || null,
          status: pet.status,
          location_city: pet.location_city || 'Unknown',
          location_state: pet.location_state || 'AL',
          location_detail: pet.location_detail || null,
          [dateField]: dateValue,
          owner_name: pet.contact_info || 'Community',
          owner_email: null,
          owner_phone: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`[SAVE] Error saving ${pet.name}:`, insertError.message);
        errors++;
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[SAVE] Error processing ${pet.name}:`, error.message);
      errors++;
    }
  }
  
  return { saved, skipped, errors };
}

// Main autonomous scraper function
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: ScrapeResult[] = [];
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      sources = ['facebook', 'shelters'], // Default: scrape all sources
      location = 'Alabama',
      maxPetsPerSource = 50,
      runMode = 'autonomous' // 'autonomous' or 'manual'
    } = body;

    // Normalize sources - ensure it's an array
    const sourcesArray = Array.isArray(sources) ? sources : [sources].filter(Boolean);
    
    console.log(`[AUTONOMOUS] ========================================`);
    console.log(`[AUTONOMOUS] Starting autonomous scraper...`);
    console.log(`[AUTONOMOUS] Sources: ${sourcesArray.join(', ')}`);
    console.log(`[AUTONOMOUS] Location: ${location}`);
    console.log(`[AUTONOMOUS] Mode: ${runMode}`);
    console.log(`[AUTONOMOUS] Max pets per source: ${maxPetsPerSource}`);
    console.log(`[AUTONOMOUS] ========================================`);

    const allPets: ScrapedPet[] = [];

    // Scrape Facebook
    if (sourcesArray.includes('facebook')) {
      const sourceStart = Date.now();
      try {
        console.log(`[AUTONOMOUS] Scraping Facebook...`);
        const facebookPets = await scrapeFacebook(location);
        allPets.push(...facebookPets.slice(0, maxPetsPerSource));
        
        results.push({
          source: 'Facebook',
          success: true,
          petsFound: facebookPets.length,
          petsSaved: 0, // Will be updated after save
          errors: [],
          duration: Date.now() - sourceStart
        });
        
        console.log(`[AUTONOMOUS] Facebook: Found ${facebookPets.length} pets`);
      } catch (error: any) {
        console.error(`[AUTONOMOUS] Facebook error:`, error.message);
        results.push({
          source: 'Facebook',
          success: false,
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message],
          duration: Date.now() - sourceStart
        });
      }
    }

    // Scrape Shelters
    if (sourcesArray.includes('shelters')) {
      const sourceStart = Date.now();
      try {
        console.log(`[AUTONOMOUS] Scraping shelters...`);
        const shelterPets = await scrapeShelters(location);
        allPets.push(...shelterPets.slice(0, maxPetsPerSource));
        
        results.push({
          source: 'Shelters',
          success: true,
          petsFound: shelterPets.length,
          petsSaved: 0,
          errors: [],
          duration: Date.now() - sourceStart
        });
        
        console.log(`[AUTONOMOUS] Shelters: Found ${shelterPets.length} pets`);
      } catch (error: any) {
        console.error(`[AUTONOMOUS] Shelters error:`, error.message);
        results.push({
          source: 'Shelters',
          success: false,
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message],
          duration: Date.now() - sourceStart
        });
      }
    }

    // Save all pets
    console.log(`[AUTONOMOUS] Saving ${allPets.length} pets to database...`);
    const saveResult = await savePets(allPets);
    
    // Update results with save counts
    results.forEach(result => {
      if (result.success) {
        // Estimate saved pets per source (proportional)
        const sourcePets = allPets.filter(p => p.source === result.source).length;
        result.petsSaved = Math.round((saveResult.saved / allPets.length) * sourcePets) || 0;
      }
    });

    const totalDuration = Date.now() - startTime;

    console.log(`[AUTONOMOUS] Complete! Saved ${saveResult.saved} pets, skipped ${saveResult.skipped}, errors: ${saveResult.errors}`);

    // Run matching after scraping
    let matchResult: any = null;
    if (saveResult.saved > 0) {
      try {
        console.log(`[AUTONOMOUS] Running pet matching after scrape...`);
        const matchStartTime = Date.now();
        
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
        const matchResponse = await fetch(`${apiUrl}/api/petreunion/match-pets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minScore: 60, saveMatches: true })
        });
        
        if (matchResponse.ok) {
          matchResult = await matchResponse.json();
          const matchDuration = Date.now() - matchStartTime;
          console.log(`[AUTONOMOUS] Matching complete: Found ${matchResult.summary.totalMatches} matches in ${matchDuration}ms`);
        } else {
          console.warn(`[AUTONOMOUS] Matching failed: ${matchResponse.status}`);
        }
      } catch (matchError: any) {
        console.error(`[AUTONOMOUS] Matching error:`, matchError.message);
        // Don't fail the whole scrape if matching fails
      }
    }

    return NextResponse.json({
      success: true,
      mode: runMode,
      timestamp: new Date().toISOString(),
      location,
      summary: {
        totalFound: allPets.length,
        totalSaved: saveResult.saved,
        totalSkipped: saveResult.skipped,
        totalErrors: saveResult.errors,
        duration: totalDuration
      },
      results,
      matching: matchResult ? {
        totalMatches: matchResult.summary.totalMatches,
        matchesSaved: matchResult.summary.saved,
        duration: matchResult.summary.duration
      } : null,
      message: `Autonomous scraper completed: Found ${allPets.length} pets, saved ${saveResult.saved} new pets${matchResult ? `, found ${matchResult.summary.totalMatches} matches` : ''}`
    });

  } catch (error: any) {
    console.error('[AUTONOMOUS] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Autonomous scraper failed',
        message: error.message,
        results,
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check and status
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get recent scrape history (if you have a scrape_logs table)
    const { data: recentPets } = await supabase
      .from('lost_pets')
      .select('id, pet_name, status, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      recentPets: recentPets?.length || 0,
      message: 'Autonomous scraper is ready'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

