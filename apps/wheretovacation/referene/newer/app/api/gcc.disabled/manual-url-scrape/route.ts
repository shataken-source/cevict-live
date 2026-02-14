import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ATTRACTIONS_BY_CITY: Record<string, string[]> = {
  'Miami,FL': ['South Beach', 'Bayfront Park', 'Vizcaya Museum', 'Wynwood Walls'],
  'Gulf Shores,AL': ['Gulf State Park Pier', 'Bon Secour National Wildlife Refuge', 'The Wharf', 'Alabama Gulf Coast Zoo'],
  'New Orleans,LA': ['French Quarter', 'Jackson Square', 'Boat Tours on the Mississippi', 'Garden District'],
  'Tampa,FL': ['Tampa Riverwalk', 'Channelside Bay Plaza', 'Ybor City', 'Busch Gardens'],
};

function findNearbyAttractions(city: string, state: string, radiusMiles: number): string[] {
  const key = `${city.trim()},${state.trim().toUpperCase()}`;
  return ATTRACTIONS_BY_CITY[key] || ['Marina boardwalks', 'Popular charter docks', 'Waterfront dining rows'];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

function buildAttractionUrl(name: string, city: string, state: string): string {
  const query = encodeURIComponent(`${name} ${city} ${state}`);
  return `https://www.google.com/search?q=${query}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      urls = [],
      city,
      state,
      radiusMiles = 50,
      maxBoats = 50
    } = body;

    const attractions = Array.isArray(body.attractions)
      ? body.attractions.filter((name: any) => typeof name === 'string')
      : findNearbyAttractions(city, state, radiusMiles);

    if (!city || !state) {
      return NextResponse.json({ error: 'City and state are required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003';
    const targetUrl = new URL('/api/charters/scrape-gulfcoastcharters-bulletproof', baseUrl);

    const scrapeResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxBoats,
        states: [state.trim()],
        focusCity: city.trim(),
        focusState: state.trim().toUpperCase(),
        radiusMiles,
        manualUrls: urls
      }),
    });

    const scrapeData = await scrapeResponse.json().catch(() => ({}));
    const structuredAttractions = attractions.map((name: string) => ({
      name,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      url: buildAttractionUrl(name, city.trim(), state.trim())
    }));

    if (supabase && structuredAttractions.length > 0) {
      await supabase.from('manual_attractions').upsert(structuredAttractions, {
        onConflict: 'name,city,state',
      });
    }
    const nearbyAttractions = findNearbyAttractions(city, state, radiusMiles);

    return NextResponse.json({
      status: scrapeResponse.ok ? 'ok' : 'error',
      requestId: scrapeData.requestId,
      summary: scrapeData.summary || {},
      manualUrls: Array.isArray(urls) ? urls : [],
      attractions: structuredAttractions.map((a) => ({
        name: a.name,
        url: a.url
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Manual scrub failed' }, { status: 500 });
  }
}

