/**
 * 🚀 PublicAPI.dev Integration Kit for PROGNO
 * Free APIs - No API keys required!
 *
 * Quick integrations for weather, geocoding, events, and more
 */

// ============================================
// 🌤️ OPEN-METEO WEATHER API (FREE - NO KEY!)
// ============================================

export interface WeatherForecast {
  time: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  weathercode?: number[];
  windspeed_10m_max?: number[];
  precipitation_sum?: number[];
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<WeatherForecast | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,precipitation_sum&timezone=auto&forecast_days=${days}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');

    const data = await response.json();
    return data.daily || null;
  } catch (error) {
    console.error('Open-Meteo error:', error);
    return null;
  }
}

/**
 * Get weather for a specific date range (perfect for PROGNO predictions!)
 */
export async function getWeatherForDateRange(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<{
  averageTemp: number;
  daysWithRain: number;
  windyDays: number;
  weatherScore: number; // 0-100, higher = better weather
} | null> {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const forecast = await getWeatherForecast(latitude, longitude, days);

  if (!forecast) return null;

  const temps = forecast.temperature_2m_max || [];
  const precip = forecast.precipitation_sum || [];
  const wind = forecast.windspeed_10m_max || [];

  const averageTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  const daysWithRain = precip.filter(p => p > 0).length;
  const windyDays = wind.filter(w => w > 15).length; // km/h

  // Calculate weather score (0-100)
  let score = 100;
  score -= daysWithRain * 10; // -10 per rainy day
  score -= windyDays * 5; // -5 per windy day
  if (averageTemp < 10 || averageTemp > 35) score -= 20; // Too cold/hot
  score = Math.max(0, Math.min(100, score));

  return {
    averageTemp,
    daysWithRain,
    windyDays,
    weatherScore: score
  };
}

// ============================================
// 🗺️ OPENSTREETMAP NOMINATIM (FREE - NO KEY!)
// ============================================

export interface LocationInfo {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export async function geocodeLocation(locationName: string): Promise<LocationInfo | null> {
  try {
    // Rate limit: 1 request per second (free tier)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PROGNO Prediction Engine' // Required by Nominatim
      }
    });

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    if (!data || data.length === 0) return null;

    return {
      display_name: data[0].display_name,
      lat: data[0].lat,
      lon: data[0].lon,
      place_id: data[0].place_id,
      address: data[0].address
    };
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<LocationInfo | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PROGNO Prediction Engine'
      }
    });

    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data = await response.json();
    return {
      display_name: data.display_name,
      lat: data.lat,
      lon: data.lon,
      place_id: data.place_id || 0,
      address: data.address
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// ============================================
// 📅 HOLIDAY API (FREE)
// ============================================

export async function getHolidaysForDateRange(
  country: string = 'US',
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; name: string }> | null> {
  try {
    const year = startDate.getFullYear();
    // Using a free holiday API
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Holiday API failed');

    const holidays = await response.json();

    // Filter holidays in date range
    const start = startDate.getTime();
    const end = endDate.getTime();

    return holidays.filter((h: any) => {
      const holidayDate = new Date(h.date).getTime();
      return holidayDate >= start && holidayDate <= end;
    }).map((h: any) => ({
      date: h.date,
      name: h.name
    }));
  } catch (error) {
    console.error('Holiday API error:', error);
    return null;
  }
}

// ============================================
// 🎯 PROGNO PREDICTION HELPER
// ============================================

export interface TravelRecommendation {
  location: string;
  startDate: Date;
  endDate: Date;
  weatherScore: number;
  holidays: Array<{ date: string; name: string }>;
  recommendation: string;
  confidence: number; // 0-100
}

/**
 * Get comprehensive travel recommendation (PROGNO style!)
 * Combines weather + holidays + location data
 */
export async function getTravelRecommendation(
  locationName: string,
  startDate: Date,
  endDate: Date,
  country: string = 'US'
): Promise<TravelRecommendation | null> {
  // Step 1: Geocode location
  const location = await geocodeLocation(locationName);
  if (!location) return null;

  const lat = parseFloat(location.lat);
  const lon = parseFloat(location.lon);

  // Step 2: Get weather forecast
  const weather = await getWeatherForDateRange(lat, lon, startDate, endDate);
  if (!weather) return null;

  // Step 3: Get holidays
  const holidays = await getHolidaysForDateRange(country, startDate, endDate);

  // Step 4: Generate recommendation
  let recommendation = '';
  let confidence = weather.weatherScore;

  if (weather.weatherScore >= 80) {
    recommendation = `Excellent weather conditions! Perfect time to visit ${locationName}.`;
  } else if (weather.weatherScore >= 60) {
    recommendation = `Good weather conditions. Some rain or wind expected, but still enjoyable.`;
  } else {
    recommendation = `Weather conditions may not be ideal. Consider adjusting your travel dates.`;
  }

  if (holidays && holidays.length > 0) {
    recommendation += ` Note: ${holidays.length} public holiday(s) during this period may affect availability and prices.`;
    confidence -= holidays.length * 5; // Slight penalty for holidays
  }

  if (weather.daysWithRain > 3) {
    recommendation += ` ${weather.daysWithRain} rainy days expected - pack accordingly!`;
  }

  return {
    location: location.display_name,
    startDate,
    endDate,
    weatherScore: weather.weatherScore,
    holidays: holidays || [],
    recommendation,
    confidence: Math.max(0, Math.min(100, confidence))
  };
}

