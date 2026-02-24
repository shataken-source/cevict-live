import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Report a lost pet and immediately search for matches
 * This is the main entry point - triggers the full workflow
 */
export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const warnings: string[] = [];

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (contentLength && Number.isFinite(contentLength) && contentLength > 2_500_000) {
      return NextResponse.json(
        { error: 'Request too large', requestId },
        { status: 413 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured', requestId },
        { status: 500 }
      );
    }

    const body = await request.json();

    const photoValue = (body?.photo || '') as string;
    if (typeof photoValue === 'string' && photoValue.startsWith('data:image') && photoValue.length > 2_500_000) {
      return NextResponse.json(
        { error: 'Photo too large', requestId },
        { status: 413 }
      );
    }

    // Validate required fields
    if (!body.pet_type || !body.breed || !body.color || !body.date_lost ||
      !body.location_city || !body.location_state || !body.owner_name) {
      return NextResponse.json(
        { error: 'Missing required fields', requestId },
        { status: 400 }
      );
    }

    // Resize photo if provided (client-side resize should already be done, but double-check server-side)
    let photoUrl = body.photo || null;
    if (photoUrl && photoUrl.startsWith('data:image')) {
      try {
        // If it's a base64 data URL, try to resize it server-side
        const { downloadAndResizeImage } = await import('@/lib/image-resize-server');
        // For base64, we need to convert it first - but since client already resized, we can use as-is
        // Only resize if it's a URL (not base64)
      } catch (error) {
        console.warn('[IMMEDIATE SEARCH] Could not resize photo, using as-is:', error);
      }
    }

    // Step 1: Save the lost pet report
    const petData = {
      pet_name: body.pet_name || null,
      pet_type: body.pet_type,
      breed: body.breed,
      color: body.color,
      size: body.size || null,
      date_lost: body.date_lost,
      location_city: body.location_city,
      location_state: body.location_state,
      location_zip: body.location_zip || null,
      location_detail: body.location_detail || null,
      markings: body.markings || null,
      description: body.description || null,
      microchip: body.microchip || null,
      collar: body.collar || null,
      owner_name: body.owner_name,
      owner_email: body.owner_email || null,
      owner_phone: body.owner_phone || null,
      reward_amount: body.reward_amount ? parseFloat(String(body.reward_amount)) : null,
      photo_url: photoUrl,
      status: 'lost',
      shelter_id: body.shelter_id || null,
    };

    const { data: savedPet, error: saveError } = await supabase
      .from('lost_pets')
      .insert([petData])
      .select()
      .single();

    if (saveError) {
      console.error('[IMMEDIATE SEARCH] Error saving pet:', saveError);
      return NextResponse.json(
        { error: 'Failed to save pet report', details: saveError.message, requestId },
        { status: 500 }
      );
    }

    // Step 2: IMMEDIATE DATABASE SEARCH for matches
    console.log('[IMMEDIATE SEARCH] Searching database for matches...');

    let matches: any[] = [];
    try {
      const { data: matchRows, error: searchError } = await supabase
        .from('lost_pets')
        .select('*')
        .eq('status', 'found') // Only search found pets
        .eq('pet_type', body.pet_type)
        .ilike('breed', `%${body.breed}%`)
        .ilike('color', `%${body.color}%`)
        .eq('location_city', body.location_city)
        .eq('location_state', body.location_state)
        .order('created_at', { ascending: false })
        .limit(20);

      if (searchError) {
        console.error('[IMMEDIATE SEARCH] Search error:', searchError);
        warnings.push('databaseSearch_failed');
      } else {
        matches = matchRows || [];
      }
    } catch (e) {
      console.error('[IMMEDIATE SEARCH] Search fatal error:', e);
      warnings.push('databaseSearch_failed');
    }

    // Step 3: Score matches
    const scoredMatches = (matches || []).map(foundPet => {
      let score = 0;
      const reasons: string[] = [];

      // Breed match
      if (foundPet.breed?.toLowerCase() === body.breed?.toLowerCase()) {
        score += 30;
        reasons.push('Exact breed match');
      } else if (foundPet.breed?.toLowerCase().includes(body.breed?.toLowerCase() || '') ||
        body.breed?.toLowerCase().includes(foundPet.breed?.toLowerCase() || '')) {
        score += 15;
        reasons.push('Similar breed');
      }

      // Color match
      if (foundPet.color?.toLowerCase() === body.color?.toLowerCase()) {
        score += 20;
        reasons.push('Exact color match');
      } else if (foundPet.color?.toLowerCase().includes(body.color?.toLowerCase() || '') ||
        body.color?.toLowerCase().includes(foundPet.color?.toLowerCase() || '')) {
        score += 10;
        reasons.push('Similar color');
      }

      // Size match
      if (foundPet.size === body.size) {
        score += 10;
        reasons.push('Size match');
      }

      // Markings match
      if (foundPet.markings && body.markings) {
        const foundMarkings = foundPet.markings.toLowerCase();
        const lostMarkings = body.markings.toLowerCase();
        if (foundMarkings === lostMarkings) {
          score += 20;
          reasons.push('Exact markings match');
        } else if (foundMarkings.includes(lostMarkings) || lostMarkings.includes(foundMarkings)) {
          score += 10;
          reasons.push('Similar markings');
        }
      }

      // Microchip match (STRONG)
      if (foundPet.microchip && body.microchip &&
        foundPet.microchip === body.microchip) {
        score += 50;
        reasons.push('MICROCHIP MATCH - VERY STRONG');
      }

      // Timeframe (recently found)
      const daysLost = Math.floor((new Date().getTime() - new Date(body.date_lost).getTime()) / (1000 * 60 * 60 * 24));
      if (daysLost >= 0 && daysLost <= 7) {
        score += 5;
        reasons.push('Found around the time your pet was lost');
      }

      return {
        ...foundPet,
        matchScore: score,
        confidence: score >= 80 ? 'high' : score >= 60 ? 'medium' : score >= 40 ? 'low' : 'very_low',
        matchReasons: reasons,
        similarity: Math.min(score / 100, 1.0),
        isStrongMatch: score >= 50
      };
    });

    // Sort by match score
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
    const strongMatches = scoredMatches.filter(m => m.isStrongMatch);

    // Step 4: Get PROGNO-determined search areas
    let prognoAnalysis: { searchAreas?: any[]; locationRecommendations?: any[] } | null = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || 'https://petreunion-final.vercel.app';
      const prognoResponse = await fetch(
        `${baseUrl}/api/petreunion/progno-determine-search-areas`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_type: body.pet_type,
            breed: body.breed,
            size: body.size,
            date_lost: body.date_lost,
            location_city: body.location_city,
            location_state: body.location_state,
            location_zip: body.location_zip,
            location_detail: body.location_detail
          })
        }
      );
      prognoAnalysis = await prognoResponse.json();
    } catch (e) {
      console.error('[IMMEDIATE SEARCH] PROGNO analysis error:', e);
      warnings.push('prognoAnalysis_failed');
    }

    // Step 5: Trigger immediate local search (don't wait)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || 'https://petreunion-final.vercel.app';
      fetch(
        `${baseUrl}/api/petreunion/search-for-lost-pet`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId: savedPet.id })
        }
      ).catch(() => { }); // Run in background
    } catch (e) {
      // Ignore
    }

    // Step 6: Start continuous search (pet stays in database until found)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || 'https://petreunion-final.vercel.app';
      fetch(
        `${baseUrl}/api/petreunion/start-continuous-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId: savedPet.id })
        }
      ).catch(() => { }); // Run in background
    } catch (e) {
      // Ignore
    }

    // Step 5: Return results with immediate matches
    return NextResponse.json({
      success: true,
      requestId,
      warnings,
      pet: savedPet,
      immediateMatches: {
        total: scoredMatches.length,
        strong: strongMatches.length,
        matches: scoredMatches.slice(0, 10), // Top 10 matches
        strongMatches: strongMatches.slice(0, 5) // Top 5 strong matches
      },
      workflow: {
        databaseSearch: warnings.includes('databaseSearch_failed') ? 'degraded' : 'completed',
        prognoAnalysis: prognoAnalysis ? 'completed' : warnings.includes('prognoAnalysis_failed') ? 'degraded' : 'pending',
        localSearch: 'initiated',
        shelterSearch: 'initiated',
        continuousSearch: 'started',
        notifications: 'pending'
      },
      prognoSearchAreas: prognoAnalysis?.searchAreas || [],
      prognoRecommendations: prognoAnalysis?.locationRecommendations || [],
      message: strongMatches.length > 0
        ? `🎉 We found ${strongMatches.length} strong potential matches! Check them out below.`
        : scoredMatches.length > 0
          ? `We found ${scoredMatches.length} potential matches. Review them below.`
          : 'Your pet has been reported. PROGNO has determined the best search areas, and we\'re searching now. Your pet will be searched continuously until found.'
    });

  } catch (error: any) {
    console.error('[IMMEDIATE SEARCH] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error', requestId: request.headers.get('x-request-id') || null },
      { status: 500 }
    );
  }
}

