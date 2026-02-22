'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  pressure: number;
  feelsLike: number;
  sunrise: string;
  sunset: string;
  precipitation: number;
  visibility: number;
  weatherCode: number;
}

export interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitation: number;
}

interface WeatherContextValue {
  weather: WeatherData;
  forecast: ForecastDay[];
  location: string;
  loading: boolean;
  error: string;
  zipCode: string;
  refresh: (zip?: string) => void;
}

const defaultWeather: WeatherData = {
  temp: 0, condition: 'Loading...', humidity: 0, windSpeed: 0,
  uvIndex: 0, pressure: 0, feelsLike: 0, sunrise: '--:--',
  sunset: '--:--', precipitation: 0, visibility: 0, weatherCode: 0,
};

const WeatherContext = createContext<WeatherContextValue>({
  weather: defaultWeather,
  forecast: [],
  location: '',
  loading: false,
  error: '',
  zipCode: '',
  refresh: () => {},
});

const ZIP_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  '90210': { lat: 34.0901, lon: -118.4065, name: 'Beverly Hills, CA' },
  '10001': { lat: 40.7505, lon: -73.9934, name: 'New York, NY' },
  '33101': { lat: 25.7743, lon: -80.1937, name: 'Miami, FL' },
  '60601': { lat: 41.8858, lon: -87.6181, name: 'Chicago, IL' },
  '77001': { lat: 29.7604, lon: -95.3698, name: 'Houston, TX' },
  '85001': { lat: 33.4484, lon: -112.0740, name: 'Phoenix, AZ' },
  '98101': { lat: 47.6062, lon: -122.3321, name: 'Seattle, WA' },
  '80201': { lat: 39.7392, lon: -104.9903, name: 'Denver, CO' },
  '30301': { lat: 33.7490, lon: -84.3880, name: 'Atlanta, GA' },
  '94101': { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
};

const getConditionText = (code: number): string => {
  const conditions: Record<number, string> = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
    55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
    71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
    80: 'Slight Showers', 81: 'Moderate Showers', 82: 'Violent Showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ Hail', 99: 'Heavy Thunderstorm',
  };
  return conditions[code] || 'Unknown';
};

const getConditionIcon = (code: number): string => {
  if (code === 0) return 'sun';
  if (code <= 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'storm';
};

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number; name: string } | null> {
  if (ZIP_COORDS[zip]) return ZIP_COORDS[zip];
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.places?.[0]) {
      const place = data.places[0];
      const state = data['state abbreviation'] || place['state abbreviation'] || '';
      return {
        lat: parseFloat(place.latitude),
        lon: parseFloat(place.longitude),
        name: `${place['place name']}${state ? ', ' + state : ''}`,
      };
    }
  } catch {}
  return null;
}

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zipCode, setZipCode] = useState('90210');

  const fetchWeather = useCallback(async (zip: string) => {
    setLoading(true);
    setError('');
    try {
      const coords = await geocodeZip(zip);
      if (!coords) {
        setError('Invalid ZIP code');
        setLoading(false);
        return;
      }
      setLocation(coords.name);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();

      const c = data.current;
      const cToF = (cel: number) => Math.round((cel * 9 / 5) + 32);

      setWeather({
        temp: cToF(c.temperature_2m),
        condition: getConditionText(c.weather_code),
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m * 0.621371),
        uvIndex: Math.round(c.uv_index ?? 0),
        pressure: Math.round(c.pressure_msl * 0.02953 * 100) / 100,
        feelsLike: cToF(c.apparent_temperature),
        sunrise: new Date(data.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        sunset: new Date(data.daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        precipitation: c.precipitation,
        visibility: Math.round((c.visibility ?? 10000) / 1609.34),
        weatherCode: c.weather_code,
      });

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const newForecast: ForecastDay[] = data.daily.time.map((t: string, i: number) => {
        const date = new Date(t);
        return {
          day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[date.getDay()],
          high: cToF(data.daily.temperature_2m_max[i]),
          low: cToF(data.daily.temperature_2m_min[i]),
          condition: getConditionText(data.daily.weather_code[i]),
          icon: getConditionIcon(data.daily.weather_code[i]),
          precipitation: data.daily.precipitation_probability_max[i],
        };
      });
      setForecast(newForecast);
    } catch (err) {
      setError('Could not load weather data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('wildready_settings') : null;
    const zip = stored ? (JSON.parse(stored).zipCode || '90210') : '90210';
    setZipCode(zip);
    fetchWeather(zip);
  }, [fetchWeather]);

  const refresh = useCallback((zip?: string) => {
    const target = zip || zipCode;
    if (zip) setZipCode(zip);
    fetchWeather(target);
  }, [zipCode, fetchWeather]);

  return (
    <WeatherContext.Provider value={{ weather, forecast, location, loading, error, zipCode, refresh }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}
