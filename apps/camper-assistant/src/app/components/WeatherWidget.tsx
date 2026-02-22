'use client';

import { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Droplets, Thermometer, AlertTriangle, MapPin, Loader2, RefreshCw, Navigation } from 'lucide-react';
import { useSettings } from './SettingsPanel';

interface WeatherData {
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
}

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitation: number;
}

interface HourlyData {
  time: string;
  temp: number;
  precip: number;
  windSpeed: number;
}

interface UVData {
  uv: number;
  maxUv: number;
  exposureTime: string;
  safeExposure: string;
}

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
  '02101': { lat: 42.3603, lon: -71.0583, name: 'Boston, MA' },
  '94101': { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
  '20001': { lat: 38.9072, lon: -77.0369, name: 'Washington, DC' },
  '15201': { lat: 40.4406, lon: -79.9959, name: 'Pittsburgh, PA' },
  '44101': { lat: 41.4993, lon: -81.6944, name: 'Cleveland, OH' },
  '48201': { lat: 42.3314, lon: -83.0458, name: 'Detroit, MI' },
  '55401': { lat: 44.9778, lon: -93.2650, name: 'Minneapolis, MN' },
  '64101': { lat: 39.0997, lon: -94.5786, name: 'Kansas City, MO' },
  '73101': { lat: 35.4676, lon: -97.5164, name: 'Oklahoma City, OK' },
  '73301': { lat: 30.2672, lon: -97.7431, name: 'Austin, TX' },
  '37201': { lat: 36.1627, lon: -86.7816, name: 'Nashville, TN' },
  '19101': { lat: 39.9526, lon: -75.1652, name: 'Philadelphia, PA' },
  '23219': { lat: 37.5407, lon: -77.4360, name: 'Richmond, VA' },
  '27601': { lat: 35.7796, lon: -78.6382, name: 'Raleigh, NC' },
  '28202': { lat: 35.2271, lon: -80.8431, name: 'Charlotte, NC' },
  '29201': { lat: 34.0007, lon: -81.0348, name: 'Columbia, SC' },
  '29577': { lat: 33.6956, lon: -78.8900, name: 'Myrtle Beach, SC' },
  '29601': { lat: 34.8526, lon: -82.3940, name: 'Greenville, SC' },
  '32801': { lat: 28.5383, lon: -81.3792, name: 'Orlando, FL' },
  '33602': { lat: 27.9506, lon: -82.4572, name: 'Tampa, FL' },
  '32202': { lat: 30.3322, lon: -81.6557, name: 'Jacksonville, FL' },
  '33401': { lat: 26.7153, lon: -80.0534, name: 'West Palm Beach, FL' },
  '34102': { lat: 26.1420, lon: -81.7948, name: 'Naples, FL' },
  '34236': { lat: 27.3364, lon: -82.5307, name: 'Sarasota, FL' },
  '32084': { lat: 29.8947, lon: -81.3145, name: 'St. Augustine, FL' },
  '32502': { lat: 30.4213, lon: -87.2169, name: 'Pensacola, FL' },
  '39530': { lat: 30.3674, lon: -89.0939, name: 'Gulfport, MS' },
  '70112': { lat: 29.9511, lon: -90.0715, name: 'New Orleans, LA' },
  '36104': { lat: 32.3668, lon: -86.3000, name: 'Montgomery, AL' },
  '35203': { lat: 33.5207, lon: -86.8025, name: 'Birmingham, AL' },
  '35801': { lat: 34.7304, lon: -86.5861, name: 'Huntsville, AL' },
  '37402': { lat: 35.0456, lon: -85.3097, name: 'Chattanooga, TN' },
  '37902': { lat: 35.9606, lon: -83.9207, name: 'Knoxville, TN' },
  '38103': { lat: 35.1495, lon: -90.0490, name: 'Memphis, TN' },
  '46204': { lat: 39.7684, lon: -86.1581, name: 'Indianapolis, IN' },
  '46225': { lat: 39.7391, lon: -86.1739, name: 'Indianapolis Downtown, IN' },
  '40202': { lat: 38.2527, lon: -85.7585, name: 'Louisville, KY' },
  '40508': { lat: 38.0406, lon: -84.5037, name: 'Lexington, KY' },
  '41011': { lat: 39.0837, lon: -84.5086, name: 'Covington, KY' },
  '45202': { lat: 39.1031, lon: -84.5120, name: 'Cincinnati, OH' },
  '43085': { lat: 40.0992, lon: -83.0170, name: 'Columbus, OH' },
  '44114': { lat: 41.5055, lon: -81.6894, name: 'Cleveland Downtown, OH' },
  '45219': { lat: 39.1329, lon: -84.5142, name: 'Cincinnati Uptown, OH' },
  '49001': { lat: 42.2917, lon: -85.5872, name: 'Kalamazoo, MI' },
  '49503': { lat: 42.9634, lon: -85.6681, name: 'Grand Rapids, MI' },
  '49440': { lat: 43.2342, lon: -86.2484, name: 'Muskegon, MI' },
  '49931': { lat: 47.1268, lon: -88.5960, name: 'Houghton, MI' },
  '53001': { lat: 43.0389, lon: -87.9065, name: 'Milwaukee, WI' },
  '53703': { lat: 43.0731, lon: -89.4012, name: 'Madison, WI' },
  '54301': { lat: 44.5192, lon: -88.0198, name: 'Green Bay, WI' },
  '55101': { lat: 44.9537, lon: -93.0900, name: 'St. Paul, MN' },
  '55415': { lat: 44.9778, lon: -93.2650, name: 'Minneapolis Downtown, MN' },
  '57104': { lat: 43.5446, lon: -96.7311, name: 'Sioux Falls, SD' },
  '57501': { lat: 44.3668, lon: -100.3538, name: 'Pierre, SD' },
  '57701': { lat: 44.0766, lon: -103.2310, name: 'Rapid City, SD' },
  '58501': { lat: 46.8772, lon: -100.7787, name: 'Bismarck, ND' },
  '58102': { lat: 46.8772, lon: -96.7898, name: 'Fargo, ND' },
  '59101': { lat: 45.7833, lon: -108.5007, name: 'Billings, MT' },
  '59701': { lat: 45.6770, lon: -111.0429, name: 'Bozeman, MT' },
  '59801': { lat: 46.8721, lon: -113.9940, name: 'Missoula, MT' },
  '82001': { lat: 41.1400, lon: -104.8203, name: 'Cheyenne, WY' },
  '82801': { lat: 44.7972, lon: -106.9562, name: 'Sheridan, WY' },
  '83001': { lat: 43.4799, lon: -110.7624, name: 'Jackson, WY' },
  '83401': { lat: 43.8264, lon: -111.7897, name: 'Idaho Falls, ID' },
  '83702': { lat: 43.6150, lon: -116.2023, name: 'Boise, ID' },
  '83843': { lat: 46.7324, lon: -117.0002, name: 'Moscow, ID' },
  '84044': { lat: 40.5251, lon: -112.0164, name: 'Magna, UT' },
  '84101': { lat: 40.7608, lon: -111.8910, name: 'Salt Lake City, UT' },
  '84720': { lat: 37.6775, lon: -113.0610, name: 'Cedar City, UT' },
  '86001': { lat: 35.1983, lon: -111.6513, name: 'Flagstaff, AZ' },
  '86336': { lat: 34.8697, lon: -111.7610, name: 'Sedona, AZ' },
  '86503': { lat: 36.0672, lon: -111.2264, name: 'Chinle, AZ' },
  '86535': { lat: 36.1540, lon: -109.0678, name: 'Dennehotso, AZ' },
  '87001': { lat: 35.0844, lon: -106.6504, name: 'Albuquerque, NM' },
  '87501': { lat: 35.6869, lon: -105.9378, name: 'Santa Fe, NM' },
  '87901': { lat: 32.3144, lon: -106.7789, name: 'Truth or Consequences, NM' },
  '88001': { lat: 32.3140, lon: -106.7767, name: 'Las Cruces, NM' },
  '88101': { lat: 34.4264, lon: -103.2044, name: 'Clovis, NM' },
  '88201': { lat: 33.3943, lon: -104.5230, name: 'Roswell, NM' },
  '88310': { lat: 32.9503, lon: -106.0364, name: 'Alamogordo, NM' },
  '88401': { lat: 35.1711, lon: -103.7250, name: 'Tucumcari, NM' },
  '88901': { lat: 36.9055, lon: -114.0541, name: 'Caliente, NV' },
  '89005': { lat: 35.9679, lon: -114.8906, name: 'Boulder City, NV' },
  '89101': { lat: 36.1699, lon: -115.1398, name: 'Las Vegas, NV' },
  '89501': { lat: 39.5296, lon: -119.8138, name: 'Reno, NV' },
  '89701': { lat: 39.1638, lon: -119.7674, name: 'Carson City, NV' },
  '89820': { lat: 40.8324, lon: -115.7630, name: 'Battle Mountain, NV' },
  '90001': { lat: 33.9737, lon: -118.2488, name: 'Los Angeles, CA' },
  '92101': { lat: 32.7157, lon: -117.1611, name: 'San Diego, CA' },
  '94102': { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
  '95113': { lat: 37.3382, lon: -121.8863, name: 'San Jose, CA' },
  '95814': { lat: 38.5816, lon: -121.4944, name: 'Sacramento, CA' },
  '97201': { lat: 45.5152, lon: -122.6784, name: 'Portland, OR' },
  '97401': { lat: 44.0521, lon: -123.0868, name: 'Eugene, OR' },
  '97701': { lat: 44.0582, lon: -121.3153, name: 'Bend, OR' },
  '97801': { lat: 45.6721, lon: -118.7857, name: 'Pendleton, OR' },
  '98104': { lat: 47.6062, lon: -122.3321, name: 'Seattle Downtown, WA' },
  '98402': { lat: 47.2529, lon: -122.4443, name: 'Tacoma, WA' },
  '98801': { lat: 47.4235, lon: -120.3103, name: 'Wenatchee, WA' },
  '99201': { lat: 47.6587, lon: -117.4260, name: 'Spokane, WA' },
  '99501': { lat: 61.2176, lon: -149.8583, name: 'Anchorage, AK' },
  '99701': { lat: 64.8378, lon: -147.7164, name: 'Fairbanks, AK' },
  '99801': { lat: 58.3019, lon: -134.4197, name: 'Juneau, AK' },
  '96701': { lat: 21.3099, lon: -157.8581, name: 'Aiea, HI' },
  '96815': { lat: 21.2793, lon: -157.8292, name: 'Honolulu, HI' },
  '96817': { lat: 21.3274, lon: -157.8383, name: 'Honolulu North, HI' },
  '20002': { lat: 38.9007, lon: -76.9822, name: 'Washington DC Northeast' },
};

const getConditionIcon = (code: number, isDay: boolean = true): string => {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code >= 1 && code <= 3) return 'cloud';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 55) return 'rain';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 66 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'cloud';
};

const getConditionText = (code: number): string => {
  const conditions: Record<number, string> = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 53: 'Moderate Drizzle',
    55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
    71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Slight Showers',
    81: 'Moderate Showers', 82: 'Violent Showers', 95: 'Thunderstorm', 96: 'Thunderstorm with Hail',
    99: 'Heavy Thunderstorm',
  };
  return conditions[code] || 'Unknown';
};
export default function WeatherWidget() {
  const { settings } = useSettings();
  const zipCode = settings.zipCode || '90210';
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useRealData, setUseRealData] = useState(true);

  const [weather, setWeather] = useState<WeatherData>({
    temp: 0, condition: 'Loading...', humidity: 0, windSpeed: 0, uvIndex: 0,
    pressure: 0, feelsLike: 0, sunrise: '--:--', sunset: '--:--',
    precipitation: 0, visibility: 0,
  });

  const [forecast, setForecast] = useState<ForecastDay[]>([]);

  const [hourly, setHourly] = useState<HourlyData[]>([]);

  const [uvData, setUvData] = useState<UVData>({
    uv: 0, maxUv: 0, exposureTime: '--', safeExposure: 'Loading UV data...'
  });

  const fetchOpenMeteo = async (lat: number, lon: number) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather fetch failed');
      const data = await response.json();

      const current = data.current;
      const apiHourly = data.hourly;
      const dailyData = data.daily;

      // Convert Celsius to Fahrenheit
      const cToF = (c: number) => Math.round((c * 9 / 5) + 32);

      setWeather(prev => ({
        ...prev,
        temp: cToF(current.temperature_2m),
        condition: getConditionText(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m * 0.621371), // km/h to mph
        pressure: current.pressure_msl * 0.02953, // hPa to inHg
        feelsLike: cToF(current.apparent_temperature),
        sunrise: new Date(dailyData.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        sunset: new Date(dailyData.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        visibility: Math.round((current.visibility || 10000) / 1609.34), // m to miles
      }));

      const daily = data.daily;
      const newForecast: ForecastDay[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[date.getDay()];
        newForecast.push({
          day: dayName,
          high: cToF(daily.temperature_2m_max[i]),
          low: cToF(daily.temperature_2m_min[i]),
          condition: getConditionText(daily.weather_code[i]),
          icon: getConditionIcon(daily.weather_code[i]),
          precipitation: daily.precipitation_probability_max[i],
        });
      }
      setForecast(newForecast);

      const currentHour = new Date().getHours();
      const newHourly: HourlyData[] = [];
      for (let i = currentHour; i < currentHour + 6 && i < apiHourly.time.length; i++) {
        const time = new Date(apiHourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        newHourly.push({
          time, temp: cToF(apiHourly.temperature_2m[i]),
          precip: apiHourly.precipitation_probability[i],
          windSpeed: Math.round(apiHourly.wind_speed_10m[i]),
        });
      }
      setHourly(newHourly);
    } catch (err) {
      console.error('Open-Meteo error:', err);
      throw err;
    }
  };

  const fetchOpenUV = async (lat: number, lon: number) => {
    const apiKey = process.env.NEXT_PUBLIC_OPENUV_API_KEY;
    if (!apiKey) {
      // Silently skip OpenUV if no API key - WeatherAPI provides UV data
      return;
    }
    try {
      const response = await fetch(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
        headers: { 'x-access-token': apiKey }
      });
      if (!response.ok) throw new Error('UV fetch failed');
      const data = await response.json();

      setUvData({
        uv: Math.round(data.result.uv),
        maxUv: Math.round(data.result.uv_max),
        exposureTime: data.result.safe_exposure_time?.st1 || '15 min',
        safeExposure: data.result.uv_max > 5 ? 'High UV - Seek shade 10AM-4PM' : 'Moderate UV - Use protection',
      });
      setWeather(prev => ({ ...prev, uvIndex: Math.round(data.result.uv) }));
    } catch (err) {
      // Silently fail - WeatherAPI UV data is sufficient
      console.log('OpenUV fetch failed, using WeatherAPI UV data');
    }
  };

  const API_KEYS = {
    WEATHERAPI: process.env.NEXT_PUBLIC_WEATHERAPI_KEY || '',
  };
  console.log('API KEY CHECK:', API_KEYS.WEATHERAPI ? 'KEY EXISTS' : 'KEY MISSING');

  const fetchWeatherAPI = async (zip: string) => {
    console.log('STEP 1: fetchWeatherAPI called with zip:', zip);
    try {
      console.log('STEP 2: Checking API key...');
      if (!API_KEYS.WEATHERAPI) {
        console.log('STEP 2 FAILED: No API key');
        throw new Error('No WeatherAPI key');
      }
      console.log('STEP 3: API key exists, building URL...');
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEYS.WEATHERAPI}&q=${zip}&days=7&aqi=no&alerts=no`;

      console.log('STEP 4: Fetching...');
      const response = await fetch(url);
      console.log('STEP 5: Response received, status:', response.status);

      if (!response.ok) {
        console.log('STEP 5 FAILED: Response not ok');
        throw new Error(`WeatherAPI failed: ${response.status}`);
      }

      console.log('STEP 6: Parsing JSON...');
      const data = await response.json();
      console.log('STEP 7: JSON parsed, temp_f:', data.current?.temp_f);

      console.log('STEP 8: Calling setWeather with temp:', Math.round(data.current.temp_f));
      setWeather(prev => ({
        ...prev,
        temp: Math.round(data.current.temp_f),
        condition: data.current.condition.text,
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_mph),
        pressure: data.current.pressure_in,
        feelsLike: Math.round(data.current.feelslike_f),
        visibility: data.current.vis_miles,
        uvIndex: Math.round(data.current.uv),
      }));
      console.log('STEP 9: setWeather called successfully');

      // Set forecast
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const newForecast: ForecastDay[] = data.forecast.forecastday.map((day: any, i: number) => {
        const date = new Date(day.date);
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[date.getDay()];
        return {
          day: dayName,
          high: Math.round(day.day.maxtemp_f),
          low: Math.round(day.day.mintemp_f),
          condition: day.day.condition.text,
          icon: getConditionIcon(day.day.condition.code, day.day.daily_will_it_rain === 0),
          precipitation: day.day.daily_chance_of_rain,
        };
      });
      setForecast(newForecast);

      // Set hourly for today
      const currentHour = new Date().getHours();
      const todayHourly = data.forecast.forecastday[0].hour;
      const newHourly: HourlyData[] = [];
      for (let i = currentHour; i < currentHour + 6 && i < todayHourly.length; i++) {
        const hourData = todayHourly[i];
        const time = new Date(hourData.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        newHourly.push({
          time,
          temp: Math.round(hourData.temp_f),
          precip: hourData.chance_of_rain,
          windSpeed: Math.round(hourData.wind_mph),
        });
      }
      setHourly(newHourly);

      console.log('STEP 10: Done!');
    } catch (err) {
      console.log('ERROR in fetchWeatherAPI:', err);
      throw err;
    }
  };

  const geocodeZip = async (zip: string): Promise<{ lat: number; lon: number; name: string } | null> => {
    try {
      // Check hardcoded first
      if (ZIP_COORDS[zip]) return ZIP_COORDS[zip];

      // Try Zippopotam.us API (free, no key needed)
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.places && data.places[0]) {
        const place = data.places[0];
        const state = data['state abbreviation'] || place['state abbreviation'] || '';
        return {
          lat: parseFloat(place.latitude),
          lon: parseFloat(place.longitude),
          name: `${place['place name']}${state ? ', ' + state : ''}`
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  const fetchWeather = async () => {
    if (!useRealData) return;
    setLoading(true);
    setError('');
    try {
      const coords = await geocodeZip(zipCode);
      if (!coords) {
        setError('Invalid ZIP code. Please enter a valid US ZIP code.');
        setLoading(false);
        return;
      }
      setLocation(coords.name);

      // Try WeatherAPI first (Fahrenheit)
      try {
        await fetchWeatherAPI(zipCode);
        await fetchOpenUV(coords.lat, coords.lon);
      } catch (weatherApiErr) {
        // Fallback to Open-Meteo (Celsius, converted)
        console.log('Falling back to Open-Meteo');
        await fetchOpenMeteo(coords.lat, coords.lon);
        await fetchOpenUV(coords.lat, coords.lon);
      }
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useRealData && zipCode) fetchWeather();
  }, [zipCode]);

  const getUVColor = (uv: number): string => {
    if (uv <= 2) return 'text-green-400';
    if (uv <= 5) return 'text-yellow-400';
    if (uv <= 7) return 'text-orange-400';
    if (uv <= 10) return 'text-red-400';
    return 'text-purple-400';
  };

  const getUVLabel = (uv: number): string => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  return (
    <div className="space-y-6">
      {/* Location Header with Search */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-semibold">Weather</h2>
              <p className="text-slate-400">{location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">ZIP {zipCode} · Change in Settings</span>
            <button
              onClick={fetchWeather}
              disabled={loading}
              title="Refresh weather"
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Data Source Toggle */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div>
          <div className="text-sm text-slate-400">Data Sources</div>
          <div className="text-xs text-slate-500 mt-1">
            {useRealData ? 'Open-Meteo + OpenUV + WeatherAPI' : 'Simulated Data'}
          </div>
        </div>
        <button
          onClick={() => setUseRealData(!useRealData)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${useRealData ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
        >
          {useRealData ? 'Live Data On' : 'Demo Mode'}
        </button>
      </div>

      {/* Current Conditions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Weather */}
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${weather.condition.toLowerCase().includes('sun') || weather.condition.toLowerCase().includes('clear')
              ? 'bg-amber-500'
              : weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('storm')
                ? 'bg-blue-600'
                : 'bg-slate-600'
              }`}>
              {weather.condition.toLowerCase().includes('sun') || weather.condition.toLowerCase().includes('clear') ? (
                <Sun className="w-10 h-10 text-white" />
              ) : weather.condition.toLowerCase().includes('rain') ? (
                <CloudRain className="w-10 h-10 text-white" />
              ) : (
                <CloudRain className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <div className="text-5xl font-bold">{weather.temp}°F</div>
              <div className="text-slate-400">{weather.condition}</div>
              <div className="text-sm text-slate-500 mt-1">Feels like {weather.feelsLike}°F</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Droplets className="w-4 h-4" /> Humidity
              </div>
              <div className="text-xl font-semibold">{weather.humidity}%</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Wind className="w-4 h-4" /> Wind
              </div>
              <div className="text-xl font-semibold">{weather.windSpeed} mph</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Sun className="w-4 h-4" /> UV Index
              </div>
              <div className={`text-xl font-semibold ${getUVColor(weather.uvIndex)}`}>
                {weather.uvIndex} <span className="text-xs">({getUVLabel(weather.uvIndex)})</span>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CloudRain className="w-4 h-4" /> Pressure
              </div>
              <div className="text-xl font-semibold">{weather.pressure}"</div>
            </div>
          </div>
        </div>

        {/* Sun Times */}
        <div className="mt-4 flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" /> Sunrise: {weather.sunrise}
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-orange-400" style={{ transform: 'rotate(180deg)' }} /> Sunset: {weather.sunset}
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-400" /> Visibility: {weather.visibility} mi
          </div>
        </div>

        {/* UV Alert Banner */}
        {uvData.uv > 5 && (
          <div className="mt-4 bg-orange-900/30 border border-orange-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
              <div>
                <div className="font-semibold text-orange-400">High UV Alert</div>
                <div className="text-sm text-orange-200 mt-1">
                  Current UV: {uvData.uv} ({getUVLabel(uvData.uv)}) | Max today: {uvData.maxUv}
                  <br />{uvData.safeExposure} | Safe exposure: {uvData.exposureTime}
                </div>
              </div>
            </div>
          </div>
        )}
        {uvData.uv <= 5 && uvData.uv > 0 && (
          <div className="mt-4 bg-green-900/30 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sun className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-400">UV Conditions: {getUVLabel(uvData.uv)}</div>
                <div className="text-sm text-green-200 mt-1">
                  Current UV: {uvData.uv} | Max today: {uvData.maxUv}
                  <br />{uvData.safeExposure} | Safe exposure time: {uvData.exposureTime}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hourly Forecast */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">Hourly Forecast</h3>
        <div className="grid grid-cols-6 gap-4">
          {hourly.map((hour, i) => (
            <div key={i} className="text-center">
              <div className="text-sm text-slate-400">{hour.time}</div>
              <div className="text-lg font-semibold my-2">{hour.temp}°</div>
              <div className="text-xs text-blue-400">{hour.precip}%</div>
              <div className="text-xs text-slate-500">{hour.windSpeed}mph</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">7-Day Forecast</h3>
        <div className="space-y-3">
          {forecast.map((day, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-16 font-medium">{day.day}</div>
                {day.icon === 'sun' && <Sun className="w-5 h-5 text-amber-400" />}
                {day.icon === 'moon' && <Navigation className="w-5 h-5 text-slate-400" style={{ transform: 'rotate(180deg)' }} />}
                {day.icon === 'cloud' && <CloudRain className="w-5 h-5 text-slate-400" />}
                {day.icon === 'rain' && <CloudRain className="w-5 h-5 text-blue-400" />}
                {day.icon === 'snow' && <CloudRain className="w-5 h-5 text-white" />}
                {day.icon === 'storm' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {day.icon === 'fog' && <Navigation className="w-5 h-5 text-slate-500" />}
                <span className="text-slate-400 text-sm">{day.condition}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-blue-400">{day.precipitation > 0 ? `${day.precipitation}%` : ''}</span>
                <span className="font-semibold">{day.high}°</span>
                <span className="text-slate-500">{day.low}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Attribution */}
      <div className="text-xs text-slate-500 text-center">
        <p>
          Weather data: Open-Meteo (Free) | UV Index: OpenUV | WeatherAPI (when available)
          <br />
          <span className="text-slate-600">Data updates every hour • No API key required for basic weather</span>
        </p>
      </div>
    </div>
  );
}
