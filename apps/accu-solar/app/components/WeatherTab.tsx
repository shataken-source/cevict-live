'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sun, Wind, Droplets, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSettings } from '../context/SettingsContext';

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  cloudCover: number;
  sunrise: string;
  sunset: string;
  precipitation: number;
}

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  weatherCode: number;
  solarScore: number;
}

const getConditionText = (code: number) => {
  const c: Record<number, string> = {
    0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 51: 'Light Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
    71: 'Slight Snow', 80: 'Showers', 95: 'Thunderstorm',
  };
  return c[code] ?? 'Unknown';
};

const weatherEmoji = (code: number) =>
  code === 0 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : '⛈️';

// Solar Impact Score formula
function solarImpactScore(cloudCover: number, humidity: number, uvIndex: number): number {
  const irradiance = Math.max(0, 1000 * (1 - cloudCover / 100));
  return Math.round(
    ((1 - cloudCover / 100) * 0.5 + (irradiance / 1000) * 0.3 + (1 - humidity / 100) * 0.1 + (uvIndex / 10) * 0.1) * 100
  );
}

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.places?.[0]) return { lat: parseFloat(d.places[0].latitude), lon: parseFloat(d.places[0].longitude) };
  } catch { }
  return null;
}

export default function WeatherTab() {
  const { zipCode } = useSettings();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeather = useCallback(async (z: string) => {
    setLoading(true);
    setError('');
    try {
      const coords = await geocodeZip(z);
      if (!coords) { setError('Invalid ZIP code'); setLoading(false); return; }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
        `&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,relative_humidity_2m,wind_speed_10m,precipitation,uv_index` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,cloud_cover_mean` +
        `&timezone=auto&forecast_days=7`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const d = await res.json();
      const c = d.current;
      const cToF = (cel: number) => Math.round(cel * 9 / 5 + 32);

      setWeather({
        temp: cToF(c.temperature_2m),
        feelsLike: cToF(c.apparent_temperature),
        condition: getConditionText(c.weather_code),
        weatherCode: c.weather_code,
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m * 0.621),
        uvIndex: Math.round(c.uv_index ?? 0),
        cloudCover: c.cloud_cover,
        sunrise: new Date(d.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        sunset: new Date(d.daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        precipitation: c.precipitation,
      });

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setForecast(d.daily.time.map((t: string, i: number) => {
        const date = new Date(t);
        const score = solarImpactScore(d.daily.cloud_cover_mean[i] ?? 50, 60, d.daily.uv_index_max[i] ?? 5);
        return {
          day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[date.getDay()],
          high: cToF(d.daily.temperature_2m_max[i]),
          low: cToF(d.daily.temperature_2m_min[i]),
          condition: getConditionText(d.daily.weather_code[i]),
          precipitation: d.daily.precipitation_probability_max[i],
          weatherCode: d.daily.weather_code[i],
          solarScore: score,
        };
      }));
    } catch {
      setError('Could not load weather data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever zipCode changes
  useEffect(() => {
    if (zipCode) fetchWeather(zipCode);
  }, [zipCode, fetchWeather]);

  const solarScore = weather ? solarImpactScore(weather.cloudCover, weather.humidity, weather.uvIndex) : 0;

  return (
    <div className="space-y-4">
      {/* Location + refresh row */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Location: <span className="text-slate-200 font-medium">ZIP {zipCode}</span></span>
        <button onClick={() => fetchWeather(zipCode)} disabled={loading} title="Refresh weather"
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="text-xs text-slate-500">Change ZIP in Settings tab</span>
        {error && <span className="text-rose-400 text-sm">{error}</span>}
      </div>

      {weather && (
        <>
          {/* Solar Impact Hero */}
          <div className="heroPanel">
            <div className="analyticsGrid">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-5 h-5 text-amber-400" />
                  <span className="panelTitle text-base">Solar Impact Score</span>
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <div>
                    <div className={`kpiValueLarge ${solarScore > 70 ? 'text-emerald-400' : solarScore > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {solarScore}
                    </div>
                    <div className="text-slate-400 text-sm">/ 100</div>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${solarScore > 70 ? 'bg-emerald-400' : solarScore > 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${solarScore}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {solarScore > 70 ? 'Excellent solar conditions' : solarScore > 40 ? 'Moderate solar production expected' : 'Poor solar conditions today'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="kpiTile text-center">
                    <div className="text-slate-500">Cloud Cover</div>
                    <div className="font-semibold text-slate-200">{weather.cloudCover}%</div>
                  </div>
                  <div className="kpiTile text-center">
                    <div className="text-slate-500">UV Index</div>
                    <div className={`font-semibold ${weather.uvIndex > 6 ? 'text-amber-400' : 'text-slate-200'}`}>{weather.uvIndex}</div>
                  </div>
                  <div className="kpiTile text-center">
                    <div className="text-slate-500">Humidity</div>
                    <div className="font-semibold text-slate-200">{weather.humidity}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{weatherEmoji(weather.weatherCode)}</span>
                  <div>
                    <div className="text-3xl font-bold text-white">{weather.temp}°F</div>
                    <div className="text-sm text-slate-400">{weather.condition}</div>
                    <div className="text-xs text-slate-500">Feels like {weather.feelsLike}°F</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { icon: Wind, label: `${weather.windSpeed} mph` },
                    { icon: Droplets, label: `${weather.humidity}% humidity` },
                    { icon: Sun, label: `Rise ${weather.sunrise}` },
                    { icon: Sun, label: `Set ${weather.sunset}` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-400">
                      <item.icon className="w-3.5 h-3.5" />
                      <span className="text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7-day Solar Forecast */}
          <div className="panel">
            <div className="panelTitleRow">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="panelTitle">7-Day Solar Forecast</span>
            </div>
            <div className="h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}`, 'Solar Score']}
                  />
                  <Bar dataKey="solarScore" radius={[4, 4, 0, 0]}>
                    {forecast.map((d, i) => (
                      <Cell key={i} fill={d.solarScore > 70 ? '#34d399' : d.solarScore > 40 ? '#fbbf24' : '#fb7185'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {forecast.map((d, i) => (
                <div key={i} className="kpiTile text-center p-2">
                  <div className="text-xs text-slate-500 font-medium">{d.day.slice(0, 3)}</div>
                  <div className="text-lg my-1">{weatherEmoji(d.weatherCode)}</div>
                  <div className="text-xs font-semibold text-slate-200">{d.high}°</div>
                  <div className="text-xs text-slate-500">{d.low}°</div>
                  <div className="text-xs text-blue-400 mt-1">{d.precipitation}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-3" />
          Loading weather data...
        </div>
      )}
    </div>
  );
}
