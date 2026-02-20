import { NextRequest, NextResponse } from 'next/server';

// NASA FIRMS API - Active fire data from satellites
// Docs: https://firms.modaps.eosdis.nasa.gov/api/
const FIRMS_API_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/json';

interface FireData {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  version: string;
  bright_ti5: number;
  frp: number;
  daynight: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat') || '44.5'; // Default to Yellowstone area
  const lon = searchParams.get('lon') || '-110.0';
  const radius = searchParams.get('radius') || '100'; // km radius
  const days = searchParams.get('days') || '1'; // Look back days

  const apiKey = process.env.NASA_FIRMS_API_KEY;

  try {
    let fires: FireData[] = [];
    let source = 'mock';

    if (apiKey) {
      // Calculate bounding box from lat/lon + radius
      const boxSize = parseFloat(radius) / 111; // Approximate km to degrees
      const minLat = parseFloat(lat) - boxSize;
      const maxLat = parseFloat(lat) + boxSize;
      const minLon = parseFloat(lon) - boxSize;
      const maxLon = parseFloat(lon) + boxSize;

      // Fetch from NASA FIRMS
      const response = await fetch(
        `${FIRMS_API_BASE}/VIIRS_SNPP_NRT/${apiKey}/${minLon},${minLat},${maxLon},${maxLat}/${days}`,
        {
          headers: {
            'User-Agent': 'WildReadyCampingApp/1.0',
          },
          next: { revalidate: 1800 } // Cache for 30 minutes
        }
      );

      if (response.ok) {
        const data = await response.json();
        fires = data || [];
        source = 'nasa-firms';
      }
    }

    // If no real data, return mock data for demo
    if (fires.length === 0) {
      fires = getMockFires(parseFloat(lat), parseFloat(lon), parseFloat(radius));
      source = 'mock';
    }

    // Map to our format with threat levels
    const mappedFires = fires.map((fire, index) => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lon),
        fire.latitude,
        fire.longitude
      );

      return {
        id: `fire-${index}`,
        lat: fire.latitude,
        lon: fire.longitude,
        distance: Math.round(distance),
        direction: getDirection(parseFloat(lat), parseFloat(lon), fire.latitude, fire.longitude),
        intensity: getIntensity(fire.frp || 0, fire.bright_ti4 || 0),
        threat: getThreatLevel(distance, fire.confidence || 'nominal'),
        confidence: fire.confidence || 'nominal',
        detected: `${fire.acq_date} ${fire.acq_time}`,
        satellite: fire.satellite || 'VIIRS',
        frp: Math.round(fire.frp || 0),
        brightness: Math.round(fire.bright_ti4 || 0)
      };
    });

    // Sort by distance
    mappedFires.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      fires: mappedFires.slice(0, 20), // Limit to 20 closest fires
      count: mappedFires.length,
      source,
      query: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        radius: parseFloat(radius),
        center: getLocationName(parseFloat(lat), parseFloat(lon))
      },
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('NASA FIRMS API error:', error);

    // Return mock data on error
    const mockFires = getMockFires(parseFloat(lat), parseFloat(lon), parseFloat(radius));

    return NextResponse.json({
      fires: mockFires,
      count: mockFires.length,
      source: 'mock',
      error: error instanceof Error ? error.message : 'API error',
      message: 'Using sample wildfire data'
    });
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get compass direction from point A to point B
function getDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((brng + 360) % 360) / 45) % 8;
  return directions[index];
}

// Get fire intensity based on Fire Radiative Power (FRP)
function getIntensity(frp: number, brightness: number): string {
  if (frp > 100 || brightness > 400) return 'extreme';
  if (frp > 50 || brightness > 375) return 'high';
  if (frp > 20 || brightness > 350) return 'moderate';
  return 'low';
}

// Calculate threat level based on distance and confidence
function getThreatLevel(distance: number, confidence: string): string {
  if (distance < 50 && confidence === 'high') return 'critical';
  if (distance < 100 || (distance < 50 && confidence === 'nominal')) return 'high';
  if (distance < 200) return 'moderate';
  return 'low';
}

// Get location name from coordinates (simplified)
function getLocationName(lat: number, lon: number): string {
  // Yellowstone area
  if (lat > 44 && lat < 45 && lon > -111 && lon < -109) {
    return 'Yellowstone National Park';
  }
  // West Virginia
  if (lat > 37 && lat < 41 && lon > -83 && lon < -77) {
    return 'West Virginia';
  }
  // California
  if (lat > 32 && lat < 42 && lon > -124 && lon < -114) {
    return 'California';
  }
  return 'Unknown Location';
}

// Simple seeded pseudo-random for deterministic mock data (same location = same fires)
function seeded(seed: number): () => number {
  let s = Math.abs(Math.round(seed * 1000)) % 233280 || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// Generate realistic mock fire data (deterministic - same lat/lon always returns same fires)
function getMockFires(centerLat: number, centerLon: number, radiusKm: number): FireData[] {
  const fires: FireData[] = [];
  const rand = seeded(centerLat * 100 + centerLon);
  const numFires = Math.floor(rand() * 8) + 2; // 2-10 fires, stable per location
  const today = new Date().toISOString().split('T')[0];

  // Fixed offsets so fires don't move on every page load
  const offsets = [
    [0.45, 0.12], [0.78, 0.67], [0.23, 0.89], [0.91, 0.34],
    [0.56, 0.45], [0.14, 0.72], [0.83, 0.21], [0.37, 0.58],
    [0.62, 0.93], [0.08, 0.41]
  ];

  for (let i = 0; i < numFires; i++) {
    const [distFrac, angleFrac] = offsets[i % offsets.length];
    const distance = distFrac * radiusKm;
    const angle = angleFrac * 2 * Math.PI;
    const lat = centerLat + (distance / 111) * Math.cos(angle);
    const lon = centerLon + (distance / 111) * Math.sin(angle);
    const brightness = 300 + Math.round(rand() * 150);
    const frpVal = Math.round(rand() * 100);
    const hourVal = Math.floor(rand() * 24);
    const minVal = Math.floor(rand() * 60);

    fires.push({
      latitude: lat,
      longitude: lon,
      bright_ti4: brightness,
      scan: 0.5,
      track: 0.5,
      acq_date: today,
      acq_time: `${String(hourVal).padStart(2, '0')}${String(minVal).padStart(2, '0')}`,
      satellite: 'VIIRS',
      confidence: frpVal > 70 ? 'high' : 'nominal',
      version: '1.0',
      bright_ti5: brightness + 20,
      frp: frpVal,
      daynight: hourVal >= 6 && hourVal < 20 ? 'D' : 'N'
    });
  }

  return fires;
}
