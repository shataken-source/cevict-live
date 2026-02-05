/**
 * weather-api (Supabase Edge Function)
 *
 * Implements a no-key weather backend using Open-Meteo (weather + marine).
 * This matches existing frontend usage via `supabase.functions.invoke('weather-api', { body })`.
 *
 * Expected input:
 * { latitude: number, longitude: number, location?: string }
 *
 * Response shape is designed to satisfy:
 * - src/components/ComprehensiveWeatherDisplay.tsx
 * - src/components/WeatherWidget.tsx
 * - src/components/trip/TripWeatherForecast.tsx (basic compatibility)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function weatherDescriptionFromCode(code: number): { condition: string; description: string } {
  // Open-Meteo weather codes: https://open-meteo.com/en/docs
  if (code === 0) return { condition: 'Clear', description: 'Clear sky' };
  if (code === 1) return { condition: 'Clear', description: 'Mainly clear' };
  if (code === 2) return { condition: 'Clouds', description: 'Partly cloudy' };
  if (code === 3) return { condition: 'Clouds', description: 'Overcast' };
  if (code === 45 || code === 48) return { condition: 'Clouds', description: 'Fog' };
  if (code >= 51 && code <= 57) return { condition: 'Rain', description: 'Drizzle' };
  if (code >= 61 && code <= 67) return { condition: 'Rain', description: 'Rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', description: 'Snow' };
  if (code >= 80 && code <= 82) return { condition: 'Rain', description: 'Rain showers' };
  if (code >= 95 && code <= 99) return { condition: 'Storm', description: 'Thunderstorm' };
  return { condition: 'Clouds', description: 'Unknown' };
}

function mphToKnots(mph: number) {
  return Math.round((mph / 1.15078) * 10) / 10;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const latitude = toNum(body?.latitude);
  const longitude = toNum(body?.longitude);
  const location = String(body?.location || '').trim() || 'Selected location';

  if (latitude === null || longitude === null) {
    return json({ error: 'Missing latitude/longitude' }, { status: 400 });
  }

  const lat = clamp(latitude, -90, 90);
  const lon = clamp(longitude, -180, 180);

  // Open-Meteo weather forecast (no API key required)
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(lat));
  weatherUrl.searchParams.set('longitude', String(lon));
  weatherUrl.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relativehumidity_2m',
      'precipitation',
      'weathercode',
      'windspeed_10m',
      'winddirection_10m',
      'windgusts_10m',
      'pressure_msl',
      'visibility',
    ].join(',')
  );
  weatherUrl.searchParams.set(
    'daily',
    ['temperature_2m_max', 'temperature_2m_min', 'weathercode', 'windspeed_10m_max', 'sunrise', 'sunset'].join(',')
  );
  weatherUrl.searchParams.set('timezone', 'auto');
  weatherUrl.searchParams.set('temperature_unit', 'fahrenheit');
  weatherUrl.searchParams.set('windspeed_unit', 'mph');
  weatherUrl.searchParams.set('precipitation_unit', 'inch');

  // Open-Meteo marine (water temperature; optional)
  const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
  marineUrl.searchParams.set('latitude', String(lat));
  marineUrl.searchParams.set('longitude', String(lon));
  marineUrl.searchParams.set('hourly', ['water_temperature'].join(','));
  marineUrl.searchParams.set('timezone', 'auto');
  marineUrl.searchParams.set('temperature_unit', 'fahrenheit');

  try {
    const [wRes, mRes] = await Promise.all([fetch(weatherUrl.toString()), fetch(marineUrl.toString())]);

    if (!wRes.ok) {
      const text = await wRes.text();
      return json({ error: 'Weather upstream failed', status: wRes.status, body: text.slice(0, 2000) }, { status: 502 });
    }

    const wJson: any = await wRes.json();
    const current = wJson.current || {};
    const daily = wJson.daily || {};

    // Marine is optional; if it fails, we still return weather.
    let waterTemp: number | null = null;
    if (mRes.ok) {
      const mJson: any = await mRes.json();
      const series: any[] = Array.isArray(mJson?.hourly?.water_temperature) ? mJson.hourly.water_temperature : [];
      const times: any[] = Array.isArray(mJson?.hourly?.time) ? mJson.hourly.time : [];
      // Find index matching current.time when possible, else take the first non-null.
      const currentTime = String(current?.time || '');
      const idx = currentTime ? times.findIndex((t) => String(t) === currentTime) : -1;
      const v = idx >= 0 ? series[idx] : series.find((x) => x !== null && x !== undefined);
      const n = toNum(v);
      waterTemp = n === null ? null : Math.round(n);
    }

    const temp = toNum(current.temperature_2m) ?? 0;
    const feelsLike = toNum(current.apparent_temperature) ?? temp;
    const humidity = toNum(current.relativehumidity_2m) ?? 0;
    const windSpeed = toNum(current.windspeed_10m) ?? 0;
    const windGust = toNum(current.windgusts_10m) ?? windSpeed;
    const windDirection = toNum(current.winddirection_10m) ?? 0;
    const precipitation = toNum(current.precipitation) ?? 0;
    const weatherCode = toNum(current.weathercode) ?? 0;
    const visibilityMeters = toNum(current.visibility);
    const visibilityMiles =
      visibilityMeters === null ? 10 : Math.round(((visibilityMeters / 1609.34) * 10)) / 10;

    const wx = weatherDescriptionFromCode(Math.round(weatherCode));

    const sun = {
      sunrise: Array.isArray(daily.sunrise) ? String(daily.sunrise[0] || '') : '',
      sunset: Array.isArray(daily.sunset) ? String(daily.sunset[0] || '') : '',
    };

    const forecast: any[] = [];
    const times: any[] = Array.isArray(daily.time) ? daily.time : [];
    const highs: any[] = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
    const lows: any[] = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
    const codes: any[] = Array.isArray(daily.weathercode) ? daily.weathercode : [];
    const winds: any[] = Array.isArray(daily.windspeed_10m_max) ? daily.windspeed_10m_max : [];

    for (let i = 0; i < Math.min(times.length, 7); i++) {
      const code = toNum(codes[i]) ?? 0;
      const { condition } = weatherDescriptionFromCode(Math.round(code));
      forecast.push({
        date: String(times[i]),
        tempHigh: Math.round(toNum(highs[i]) ?? 0),
        tempLow: Math.round(toNum(lows[i]) ?? 0),
        windSpeed: Math.round(toNum(winds[i]) ?? 0),
        condition,
        icon: condition.toLowerCase(),
      });
    }

    return json(
      {
        location,
        lat,
        lon,
        // Shape used by ComprehensiveWeatherDisplay
        current: {
          temp: Math.round(temp),
          // WeatherWidget expects `current.temperature`
          temperature: Math.round(temp),
          feelsLike: Math.round(feelsLike),
          humidity: Math.round(humidity),
          windSpeed: Math.round(windSpeed),
          windGust: Math.round(windGust),
          windDirection: Math.round(windDirection),
          precipitation: Math.round(precipitation * 100) / 100,
          weatherCode: Math.round(weatherCode),
          condition: wx.condition,
          description: wx.description,
          visibility: visibilityMiles,
          // Derived from marine API when available; fallback to null-safe number for UI
          waterTemp: waterTemp ?? Math.round(temp),
          // Extra fields some UIs may want
          windSpeedKnots: mphToKnots(windSpeed),
          pressure: toNum(current.pressure_msl),
        },
        sun,
        forecast,
      },
      {
        headers: {
          // Edge caching: 5 minutes at the edge; clients can revalidate quickly.
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (e: any) {
    return json({ error: 'Internal error', details: String(e?.message || e) }, { status: 500 });
  }
});

