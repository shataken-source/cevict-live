/**
 * Weather API — Open-Meteo + marine (no API key).
 * Same shape as weather-api Edge Function for ComprehensiveWeatherDisplay, WeatherWidget, TripWeatherForecast, WeatherAlertNotifier.
 * POST body: { latitude, longitude, location?, alerts? }
 * GET query: ?latitude=&longitude=&location=
 */

import type { NextApiRequest, NextApiResponse } from 'next';

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

const USER_AGENT = 'gulfcoastcharters (weather-api; contact: support@gulfcoastcharters.com)';

async function fetchMarineAlerts(lat: number, lon: number): Promise<Array<{ id: string; event: string; severity: string; description?: string; expires?: string; headline?: string }>> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
      { headers: { Accept: 'application/geo+json', 'User-Agent': USER_AGENT } }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features.slice(0, 15).map((f: any) => {
      const p = f?.properties || {};
      return {
        id: String(p?.id || f?.id || ''),
        event: String(p?.event || ''),
        severity: String(p?.severity || ''),
        description: p?.description ?? p?.headline ?? '',
        expires: p?.expires ?? '',
        headline: p?.headline,
      };
    });
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    let location = 'Selected location';
    let includeAlerts = false;

    if (req.method === 'POST' && req.body) {
      latitude = toNum(req.body.latitude);
      longitude = toNum(req.body.longitude);
      location = String(req.body.location || '').trim() || location;
      includeAlerts = !!req.body.alerts;
    } else {
      const query = req.query || {};
      const latVal = query.latitude;
      const lonVal = query.longitude;
      latitude = toNum(Array.isArray(latVal) ? latVal[0] : latVal);
      longitude = toNum(Array.isArray(lonVal) ? lonVal[0] : lonVal);
      location = String(query.location || '').trim() || location;
      const alertsVal = Array.isArray(query.alerts) ? query.alerts[0] : query.alerts;
      includeAlerts = String(alertsVal || '').toLowerCase() === 'true';
    }

    if (latitude === null || longitude === null) {
      return res.status(400).json({ error: 'Missing latitude/longitude' });
    }

    const lat = clamp(latitude, -90, 90);
    const lon = clamp(longitude, -180, 180);

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(lat));
  weatherUrl.searchParams.set('longitude', String(lon));
  weatherUrl.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relativehumidity_2m,precipitation,weathercode,windspeed_10m,winddirection_10m,windgusts_10m,pressure_msl,visibility'
  );
  weatherUrl.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,sunrise,sunset'
  );
  weatherUrl.searchParams.set('timezone', 'auto');
  weatherUrl.searchParams.set('temperature_unit', 'fahrenheit');
  weatherUrl.searchParams.set('windspeed_unit', 'mph');
  weatherUrl.searchParams.set('precipitation_unit', 'inch');

  const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
  marineUrl.searchParams.set('latitude', String(lat));
  marineUrl.searchParams.set('longitude', String(lon));
  marineUrl.searchParams.set('hourly', 'water_temperature');
  marineUrl.searchParams.set('timezone', 'auto');
  marineUrl.searchParams.set('temperature_unit', 'fahrenheit');

  try {
    const [wRes, mRes] = await Promise.all([
      fetch(weatherUrl.toString()),
      fetch(marineUrl.toString()),
    ]);

    if (!wRes.ok) {
      const text = await wRes.text();
      return res.status(502).json({ error: 'Weather upstream failed', status: wRes.status, body: text.slice(0, 500) });
    }

    const wJson: any = await wRes.json();
    const current = wJson.current || {};
    const daily = wJson.daily || {};

    let waterTemp: number | null = null;
    if (mRes.ok) {
      const mJson: any = await mRes.json();
      const series: any[] = Array.isArray(mJson?.hourly?.water_temperature) ? mJson.hourly.water_temperature : [];
      const times: any[] = Array.isArray(mJson?.hourly?.time) ? mJson.hourly.time : [];
      const currentTime = String(current?.time || '');
      const idx = currentTime ? times.findIndex((t: string) => String(t) === currentTime) : -1;
      const v = idx >= 0 ? series[idx] : series.find((x: any) => x != null);
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
    const visibilityMiles = visibilityMeters === null ? 10 : Math.round((visibilityMeters / 1609.34) * 10) / 10;
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

    const payload: any = {
      location,
      lat,
      lon,
      current: {
        temp: Math.round(temp),
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
        waterTemp: waterTemp ?? Math.round(temp),
        windSpeedKnots: mphToKnots(windSpeed),
        pressure: toNum(current.pressure_msl),
      },
      sun,
      forecast,
    };

    if (includeAlerts) {
      payload.alerts = await fetchMarineAlerts(lat, lon);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(payload);
  } catch (e: any) {
    console.error('Weather API error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
  } catch (e: any) {
    console.error('Weather API error (outer):', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}
