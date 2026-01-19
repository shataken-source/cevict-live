import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wind, Waves, Droplets, Eye, Thermometer, AlertTriangle, CloudRain, Compass, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { WeatherAlertSystem } from './WeatherAlertSystem';


interface WeatherData {
  current: {
    temp: number;
    windSpeed: number;
    windDirection: number;
    waveHeight: number;
    visibility: number;
    humidity: number;
    conditions: string;
  };
  forecast: Array<{
    time: string;
    temp: number;
    windSpeed: number;
    waveHeight: number;
    conditions: string;
  }>;
  alerts: Array<{
    severity: string;
    event: string;
    description: string;
    expires: string;
  }>;
}

export function CaptainWeatherDashboard({ latitude = 30.3935, longitude = -86.4958 }: { latitude?: number; longitude?: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 1800000); // 30 min
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [latitude, longitude]);

  const loadWeather = async () => {
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase.functions.invoke('marine-weather', {
          body: { latitude, longitude }
        });
        
        if (!error && data) {
          setWeather(data);
          cacheWeather(data);
          setLastUpdate(new Date());
          checkForAlerts(data.alerts);
        }
      } else {
        const cached = getCachedWeather();
        if (cached) setWeather(cached);
      }
    } catch (error) {
      const cached = getCachedWeather();
      if (cached) setWeather(cached);
    } finally {
      setLoading(false);
    }
  };

  const cacheWeather = (data: WeatherData) => {
    localStorage.setItem('cached_weather', JSON.stringify(data));
    localStorage.setItem('weather_timestamp', new Date().toISOString());
  };

  const getCachedWeather = (): WeatherData | null => {
    const cached = localStorage.getItem('cached_weather');
    return cached ? JSON.parse(cached) : null;
  };

  const checkForAlerts = (alerts: WeatherData['alerts']) => {
    if (alerts && alerts.length > 0) {
      alerts.forEach(alert => {
        if (alert.severity === 'Severe' || alert.severity === 'Extreme') {
          toast({
            title: `⚠️ ${alert.event}`,
            description: alert.description,
            variant: 'destructive',
          });
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Weather Alert: ${alert.event}`, {
              body: alert.description,
              icon: '/icon-192.png',
            });
          }
        }
      });
    }
  };

  const getSafetyLevel = () => {
    if (!weather) return { level: 'unknown', color: 'gray' };
    const { windSpeed, waveHeight } = weather.current;
    
    if (windSpeed > 25 || waveHeight > 6) return { level: 'Dangerous', color: 'red' };
    if (windSpeed > 15 || waveHeight > 4) return { level: 'Caution', color: 'yellow' };
    return { level: 'Safe', color: 'green' };
  };

  if (loading) {
    return <Card className="p-4"><p>Loading weather...</p></Card>;
  }

  if (!weather) {
    return <Card className="p-4"><p>Weather data unavailable</p></Card>;
  }

  const safety = getSafetyLevel();

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">Marine Weather</h2>
            <p className="text-sm opacity-90">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Cached data'}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={loadWeather} disabled={!isOnline}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Thermometer className="w-6 h-6" />
          <span className="text-4xl font-bold">{weather.current.temp}°F</span>
        </div>
        <p className="text-lg">{weather.current.conditions}</p>
      </Card>

      <Card className={`p-4 border-2 border-${safety.color}-500`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={`w-5 h-5 text-${safety.color}-600`} />
          <h3 className="font-bold">Safety Level: {safety.level}</h3>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <WeatherStat icon={Wind} label="Wind" value={`${weather.current.windSpeed} mph`} />
        <WeatherStat icon={Compass} label="Direction" value={`${weather.current.windDirection}°`} />
        <WeatherStat icon={Waves} label="Waves" value={`${weather.current.waveHeight} ft`} />
        <WeatherStat icon={Eye} label="Visibility" value={`${weather.current.visibility} mi`} />
        <WeatherStat icon={Droplets} label="Humidity" value={`${weather.current.humidity}%`} />
      </div>

      {weather.alerts && weather.alerts.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-300">
          <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Alerts
          </h3>
          {weather.alerts.map((alert, i) => (
            <div key={i} className="mb-2">
              <Badge variant="destructive">{alert.severity}</Badge>
              <p className="font-semibold mt-1">{alert.event}</p>
              <p className="text-sm">{alert.description}</p>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-bold mb-3">24-Hour Forecast</h3>
        <div className="space-y-2">
          {weather.forecast.slice(0, 8).map((f, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">{f.time}</span>
              <div className="flex items-center gap-4">
                <span>{f.temp}°F</span>
                <span className="text-sm text-gray-600">{f.windSpeed} mph</span>
                <span className="text-sm text-gray-600">{f.waveHeight} ft</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <WeatherAlertSystem />
    </div>
  );
}


function WeatherStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-blue-600" />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </Card>
  );
}