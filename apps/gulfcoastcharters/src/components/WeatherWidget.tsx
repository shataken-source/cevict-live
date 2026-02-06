import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Cloud, Wind, Droplets, Thermometer } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    weatherCode: number;
  };
}

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  location: string;
}

const getWeatherDescription = (code: number): string => {
  const codes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    61: 'Light rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    80: 'Rain showers',
    95: 'Thunderstorm'
  };
  return codes[code] || 'Unknown';
};

export default function WeatherWidget({ latitude, longitude, location }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
  }, [latitude, longitude]);

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, location }),
      });
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
        return;
      }
      const { data, error } = await supabase.functions.invoke('weather-api', {
        body: { latitude, longitude, location },
      });
      if (error) throw error;
      setWeather(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Card className="p-4"><p>Loading weather...</p></Card>;
  if (!weather) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Cloud className="w-5 h-5" />
        Current Weather
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <span className="text-sm">Temperature</span>
          </div>
          <span className="font-semibold">{weather.current.temperature}°F</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Wind</span>
          </div>
          <span className="font-semibold">{weather.current.windSpeed} mph</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-500" />
            <span className="text-sm">Humidity</span>
          </div>
          <span className="font-semibold">{weather.current.humidity}%</span>
        </div>
        <div className="text-sm text-muted-foreground mt-3">
          {getWeatherDescription(weather.current.weatherCode)}
        </div>
      </div>
    </Card>
  );
}