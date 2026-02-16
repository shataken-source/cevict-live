import { NextRequest, NextResponse } from 'next/server';

// US Naval Observatory API - Official sunrise/sunset data
// Docs: https://aa.usno.navy.mil/data/api
const USNO_API_BASE = 'https://aa.usno.navy.mil/api';

interface USNORiseSet {
  year: number;
  month: number;
  day: number;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonphase: number;
}

interface MoonPhaseInfo {
  phase: number;
  name: string;
  emoji: string;
  illumination: number;
  isDarkSky: boolean;
}

function getMoonPhase(phase: number): MoonPhaseInfo {
  // Phase 0-1: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  if (phase < 0.02 || phase > 0.98) {
    return { phase, name: 'New Moon', emoji: '🌑', illumination: 0, isDarkSky: true };
  } else if (phase < 0.23) {
    return { phase, name: 'Waxing Crescent', emoji: '🌒', illumination: phase * 200, isDarkSky: true };
  } else if (phase < 0.27) {
    return { phase, name: 'First Quarter', emoji: '🌓', illumination: 50, isDarkSky: false };
  } else if (phase < 0.48) {
    return { phase, name: 'Waxing Gibbous', emoji: '🌔', illumination: 50 + (phase - 0.25) * 200, isDarkSky: false };
  } else if (phase < 0.52) {
    return { phase, name: 'Full Moon', emoji: '🌕', illumination: 100, isDarkSky: false };
  } else if (phase < 0.73) {
    return { phase, name: 'Waning Gibbous', emoji: '🌖', illumination: 100 - (phase - 0.5) * 200, isDarkSky: false };
  } else if (phase < 0.77) {
    return { phase, name: 'Last Quarter', emoji: '🌗', illumination: 50, isDarkSky: true };
  } else {
    return { phase, name: 'Waning Crescent', emoji: '🌘', illumination: (1 - phase) * 200, isDarkSky: true };
  }
}

function calculateStargazingWindow(sunset: string, sunrise: string, moonrise: string, moonset: string, moonPhase: number): { start: string; end: string; duration: number; quality: string } {
  // Parse times
  const parseTime = (t: string) => {
    if (!t || t === '-----') return null;
    const [h, m] = t.match(/\d+/g)?.map(Number) || [0, 0];
    const isPM = t.includes('p.m.');
    return h + (isPM && h !== 12 ? 12 : 0) + m / 60;
  };

  const sunsetH = parseTime(sunset);
  const sunriseH = parseTime(sunrise);
  const moonriseH = parseTime(moonrise);
  const moonsetH = parseTime(moonset);

  if (!sunsetH || !sunriseH) {
    return { start: 'N/A', end: 'N/A', duration: 0, quality: 'unknown' };
  }

  // Stargazing starts after astronomical twilight (1.5 hrs after sunset)
  const astroTwilightEnd = sunsetH + 1.5;
  
  // Stargazing ends before astronomical twilight begins (1.5 hrs before sunrise)
  const astroTwilightStart = sunriseH - 1.5;

  // Account for moon interference
  let darkStart = astroTwilightEnd;
  let darkEnd = astroTwilightStart;

  // If moon is up during night, reduce dark window
  if (moonriseH && moonsetH) {
    if (moonriseH < astroTwilightStart && moonsetH > astroTwilightEnd) {
      // Moon up all night - worst case
      if (moonPhase > 0.3 && moonPhase < 0.7) {
        darkStart = Math.min(darkEnd, moonsetH); // Start after moon sets
        darkEnd = Math.max(darkStart, moonriseH);  // End before moon rises
      }
    }
  }

  // Format time
  const formatTime = (h: number) => {
    if (h >= 24) h -= 24;
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const duration = Math.max(0, darkEnd - darkStart);
  
  // Quality rating
  let quality = 'poor';
  if (duration > 5) quality = 'excellent';
  else if (duration > 3) quality = 'good';
  else if (duration > 1.5) quality = 'fair';

  return {
    start: formatTime(darkStart),
    end: formatTime(darkEnd),
    duration: Math.round(duration * 10) / 10,
    quality
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat') || '44.5';
  const lon = searchParams.get('lon') || '-110.0';
  const date = searchParams.get('date'); // Optional specific date

  try {
    const today = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Try USNO API
    const response = await fetch(
      `${USNO_API_BASE}/rstt/oneday?date=${today}&coords=${lat},${lon}&tz=-7`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WildReadyCampingApp/1.0'
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    let data: any = {};
    let source = 'usno';

    if (response.ok) {
      data = await response.json();
    } else {
      // Fallback: calculated data
      data = calculateAstronomy(parseFloat(lat), parseFloat(lon));
      source = 'calculated';
    }

    // Extract properties
    const properties = data.properties || data;
    const sunData = properties?.data?.[0] || properties;
    
    const moonPhaseInfo = getMoonPhase(sunData?.curphase || 0.25);
    
    const stargazing = calculateStargazingWindow(
      sunData?.sunrise || '6:00 a.m.',
      sunData?.sunset || '6:00 p.m.',
      sunData?.moonrise || '',
      sunData?.moonset || '',
      moonPhaseInfo.phase
    );

    const result = {
      location: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        date: today
      },
      sun: {
        sunrise: sunData?.sunrise || '6:00 a.m.',
        sunset: sunData?.sunset || '6:00 p.m.',
        solarNoon: sunData?.solarnoon || '12:00 p.m.',
        dayLength: sunData?.daylength || '12:00'
      },
      moon: {
        phase: moonPhaseInfo,
        rise: sunData?.moonrise || null,
        set: sunData?.moonset || null,
        illumination: Math.round(moonPhaseInfo.illumination)
      },
      stargazing: {
        ...stargazing,
        bestTime: stargazing.quality === 'excellent' ? 'Perfect for deep sky' : 
                  stargazing.quality === 'good' ? 'Great conditions' :
                  stargazing.quality === 'fair' ? 'Decent viewing' : 'Poor - moon washed out'
      },
      source,
      updated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Astronomy API error:', error);
    
    // Return calculated fallback
    const fallback = calculateAstronomy(parseFloat(lat), parseFloat(lon));
    const moonPhaseInfo = getMoonPhase(0.25);
    
    return NextResponse.json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      sun: {
        sunrise: '6:00 a.m.',
        sunset: '6:00 p.m.',
        solarNoon: '12:00 p.m.',
        dayLength: '12:00'
      },
      moon: {
        phase: moonPhaseInfo,
        rise: null,
        set: null,
        illumination: 50
      },
      stargazing: {
        start: '8:00 PM',
        end: '5:00 AM',
        duration: 9,
        quality: 'good',
        bestTime: 'Great conditions'
      },
      source: 'calculated',
      error: error instanceof Error ? error.message : 'API error'
    });
  }
}

// Simple astronomical calculation fallback
function calculateAstronomy(lat: number, lon: number) {
  const now = new Date();
  const isSummer = now.getMonth() >= 5 && now.getMonth() <= 8;
  
  // Rough estimates based on latitude
  const dayLength = isSummer ? (lat > 40 ? 15 : 14) : (lat > 40 ? 9 : 10);
  const sunriseHour = 12 - dayLength / 2;
  const sunsetHour = 12 + dayLength / 2;
  
  const formatTime = (h: number) => {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  // Moon phase calculation (simplified)
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor((year - 2000) / 100);
  const e = Math.floor((365.25 * (year - 2000)) + (30.6 * month) + day - 694039.09);
  const phase = (e / 29.53) % 1;
  
  return {
    properties: {
      data: [{
        sunrise: formatTime(sunriseHour),
        sunset: formatTime(sunsetHour),
        solarnoon: '12:00 p.m.',
        daylength: `${dayLength}:00`,
        moonrise: formatTime(sunsetHour + 1),
        moonset: formatTime(sunriseHour + 1),
        curphase: phase
      }]
    }
  };
}
