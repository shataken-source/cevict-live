import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/weather?lat=37.7749&lon=-122.4194
 *
 * Returns weather data with solar irradiance for accurate impact scoring.
 * Primary: WeatherAPI.com (with API key)
 * Fallback: Open-Meteo (no key required)
 */
export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lon = request.nextUrl.searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing lat/lon parameters' },
        { status: 400 }
      );
    }

    // Validate coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return NextResponse.json(
        { error: 'Invalid lat/lon values' },
        { status: 400 }
      );
    }

    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      );
    }

    // Try WeatherAPI.com first (includes solar irradiance)
    const weatherApiKey = process.env.WEATHERAPI_KEY;
    if (weatherApiKey) {
      try {
        const result = await fetchFromWeatherAPI(latNum, lonNum, weatherApiKey);
        if (result.success) {
          return NextResponse.json(result.data, { status: 200 });
        }
        console.warn('[weather] WeatherAPI failed, trying fallback:', result.error);
      } catch (err) {
        console.warn('[weather] WeatherAPI error:', err);
      }
    } else {
      console.log('[weather] WEATHERAPI_KEY not set, using Open-Meteo');
    }

    // Fallback to Open-Meteo
    return await fetchFromOpenMeteo(latNum, lonNum);
  } catch (error) {
    console.error('[weather GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}

async function fetchFromWeatherAPI(
  lat: number,
  lon: number,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = new URL('https://api.weatherapi.com/v1/current.json');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', `${lat},${lon}`);
  url.searchParams.set('aqi', 'no');

  console.log('[weather] WeatherAPI request for', `${lat},${lon}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `HTTP ${res.status}: ${text.substring(0, 200)}`,
      };
    }

    const data = await res.json();
    const current = data.current || {};

    return {
      success: true,
      data: {
        lat,
        lon,
        timezone: data.timezone?.name || 'UTC',
        time: new Date().toISOString(),
        temperatureC: current.temp_c || 20,
        precipitationProbability: current.chance_of_rain || 0,
        cloudCover: current.cloud || 0,
        windSpeed: current.wind_kph ? current.wind_kph / 3.6 : 0,
        ghi: current.solar_irradiance || 0,
        dni: 0,
        dhi: 0,
        hourlyForecast: {},
        source: 'weatherapi',
      },
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout (10s)' };
    }
    return { success: false, error: error.message };
  }
}

async function fetchFromOpenMeteo(lat: number, lon: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('current', 'temperature_2m,cloud_cover,wind_speed_10m');
  url.searchParams.set('timezone', 'auto');

  console.log('[weather] Open-Meteo request:', url.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[weather] Open-Meteo error:', res.status, errorText);
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: `Weather API error (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    clearTimeout(timeoutId);
    const current = data.current || {};

    return NextResponse.json({
      lat,
      lon,
      timezone: data.timezone || 'UTC',
      time: current.time || new Date().toISOString(),
      temperatureC: current.temperature_2m || 20,
      precipitationProbability: 0,
      cloudCover: current.cloud_cover || 0,
      windSpeed: current.wind_speed_10m || 0,
      ghi: 0,
      dni: 0,
      dhi: 0,
      hourlyForecast: {},
      source: 'open-meteo',
    });
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      console.error('[weather] Request timeout (10s)');
      return NextResponse.json(
        { error: 'Weather service timeout' },
        { status: 504 }
      );
    }
    throw fetchError;
  }
}
