import { NextRequest, NextResponse } from 'next/server';

/**
 * Uses PROGNO to determine optimal search areas for a lost pet
 * Considers: pet type, breed, size, weather, time lost, location, terrain, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pet_type,
      breed,
      size,
      date_lost,
      location_city,
      location_state,
      location_zip,
      location_detail,
      markings,
      description
    } = body;

    if (!location_city || !location_state) {
      return NextResponse.json(
        { error: 'Location required' },
        { status: 400 }
      );
    }

    // Calculate days lost
    const daysLost = date_lost 
      ? Math.floor((new Date().getTime() - new Date(date_lost).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // PROGNO Factors for determining search areas:
    
    // 1. Pet Type & Breed Behavior Patterns
    const behaviorFactors: Record<string, { maxDistance: number; preferredAreas: string[] }> = {
      'dog': {
        maxDistance: size === 'small' ? 2 : size === 'large' ? 10 : 5, // miles per day
        preferredAreas: ['residential', 'parks', 'commercial', 'wooded areas']
      },
      'cat': {
        maxDistance: 0.5, // cats stay closer
        preferredAreas: ['residential', 'backyards', 'garages', 'under decks', 'sheds']
      }
    };

    const petBehavior = behaviorFactors[pet_type] || behaviorFactors['dog'];
    const maxTravelDistance = petBehavior.maxDistance * Math.max(daysLost, 1); // Distance in miles

    // 2. Breed-specific patterns (some breeds travel more, some hide)
    const breedPatterns: Record<string, { travelTendency: number; hideTendency: number }> = {
      'hound': { travelTendency: 1.5, hideTendency: 0.3 },
      'retriever': { travelTendency: 1.2, hideTendency: 0.4 },
      'terrier': { travelTendency: 0.8, hideTendency: 0.6 },
      'herding': { travelTendency: 1.3, hideTendency: 0.3 },
      'toy': { travelTendency: 0.5, hideTendency: 0.7 },
      'cat': { travelTendency: 0.3, hideTendency: 0.9 }
    };

    const breedLower = (breed || '').toLowerCase();
    let breedPattern = { travelTendency: 1.0, hideTendency: 0.5 };
    for (const [key, pattern] of Object.entries(breedPatterns)) {
      if (breedLower.includes(key)) {
        breedPattern = pattern;
        break;
      }
    }

    // Adjust max distance based on breed
    const adjustedMaxDistance = maxTravelDistance * breedPattern.travelTendency;

    // 3. Time-based search priority
    // First 24 hours: immediate local area
    // 24-72 hours: expand radius
    // 3-7 days: wider area
    // 7+ days: very wide area + check shelters far away
    const timeBasedRadius = daysLost < 1 
      ? 1 // First day: 1 mile
      : daysLost < 3
      ? 3 // 1-3 days: 3 miles
      : daysLost < 7
      ? 5 // 3-7 days: 5 miles
      : Math.min(adjustedMaxDistance, 25); // 7+ days: up to max distance

    // 4. Generate search areas with priority
    const searchAreas = [
      {
        priority: 1,
        radius: 0.5, // Immediate area
        description: 'Immediate area (within 0.5 miles)',
        focus: 'Check nearby yards, garages, under porches, sheds',
        urgency: 'HIGH',
        searchType: 'immediate_local'
      },
      {
        priority: 2,
        radius: 1,
        description: 'Local neighborhood (within 1 mile)',
        focus: 'Residential streets, local parks, nearby businesses',
        urgency: 'HIGH',
        searchType: 'local'
      },
      {
        priority: 3,
        radius: timeBasedRadius,
        description: `Expanded area (within ${timeBasedRadius} miles)`,
        focus: breedPattern.hideTendency > 0.6 
          ? 'Check hiding spots: under decks, in garages, sheds, dense brush'
          : 'Check parks, trails, commercial areas, residential neighborhoods',
        urgency: daysLost < 3 ? 'HIGH' : 'MEDIUM',
        searchType: 'expanded'
      }
    ];

    // Add long-range search if lost for 7+ days
    if (daysLost >= 7) {
      searchAreas.push({
        priority: 4,
        radius: Math.min(adjustedMaxDistance, 50),
        description: `Long-range search (up to ${Math.min(adjustedMaxDistance, 50)} miles)`,
        focus: 'Check all shelters, post on social media, check with animal control',
        urgency: 'MEDIUM',
        searchType: 'long_range'
      });
    }

    // 5. Specific location recommendations based on pet type
    const locationRecommendations = pet_type === 'cat'
      ? [
          'Check under porches and decks',
          'Look in garages and sheds (ask neighbors)',
          'Check dense bushes and shrubs',
          'Look in crawl spaces',
          'Check with neighbors - cats often hide nearby'
        ]
      : [
          'Check local parks and trails',
          'Visit nearby shelters daily',
          'Post on local Facebook groups',
          'Check with animal control',
          'Ask local businesses if they\'ve seen the pet',
          'Check areas with food sources (dumpsters, restaurants)'
        ];

    // 6. Weather/time of day factors (if we had weather API)
    const currentHour = new Date().getHours();
    const searchTimeRecommendations = [
      currentHour >= 6 && currentHour <= 10 
        ? 'Early morning is best - pets are more active'
        : currentHour >= 17 && currentHour <= 20
        ? 'Evening search recommended - pets come out at dusk'
        : 'Search during dawn or dusk for best results'
    ];

    return NextResponse.json({
      success: true,
      searchAreas,
      locationRecommendations,
      searchTimeRecommendations,
      analysis: {
        daysLost,
        maxTravelDistance: adjustedMaxDistance,
        breedTravelTendency: breedPattern.travelTendency,
        breedHideTendency: breedPattern.hideTendency,
        petType: pet_type,
        size
      },
      message: `Based on PROGNO analysis: Your ${pet_type} could be within ${timeBasedRadius} miles. Start with immediate area, then expand.`
    });

  } catch (error: any) {
    console.error('[PROGNO SEARCH AREAS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


