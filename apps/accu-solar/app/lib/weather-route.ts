import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/weather?lat=37.7749&lon=-122.4194
 *
 * Returns weather data from Open-Meteo for solar impact scoring.
 * No API key required. Global coverage.
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

    // Fetch from Open-Meteo
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set(
      'hourly',
      'temperature_2m,relative_humidity_2m,precipitation_probability,cloud_cover,wind_speed_10m,global_horizontal_irradiance,direct_normal_irradiance,diffuse_radiation'
    );
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString());

    if (!res.ok) {
      console.error('[weather] Open-Meteo error:', res.status, res.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch weather data from Open-Meteo' },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Extract current hour (first entry)
    const hourly = data.hourly || {};
    const currentHour = 0;

    return NextResponse.json({
      lat: latNum,
      lon: lonNum,
      timezone: data.timezone || 'UTC',
      time: hourly.time?.[currentHour] || new Date().toISOString(),
      temperatureC: hourly.temperature_2m?.[currentHour] || 20,
      humidity: hourly.relative_humidity_2m?.[currentHour] || 50,
      precipitationProbability: hourly.precipitation_probability?.[currentHour] || 0,
      cloudCover: hourly.cloud_cover?.[currentHour] || 0,
      windSpeed: hourly.wind_speed_10m?.[currentHour] || 0,
      ghi: hourly.global_horizontal_irradiance?.[currentHour] || 0,
      dni: hourly.direct_normal_irradiance?.[currentHour] || 0,
      dhi: hourly.diffuse_radiation?.[currentHour] || 0,
      // Hourly forecast arrays for later use
      hourlyForecast: hourly,
    });
  } catch (error) {
    console.error('[weather GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
