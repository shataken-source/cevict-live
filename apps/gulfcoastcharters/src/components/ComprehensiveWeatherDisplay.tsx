import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Droplets, Eye, Gauge, RefreshCw, Sunrise, Sunset, Wind } from 'lucide-react';
import MarineForecast from './MarineForecast';
import WeatherForecast from './WeatherForecast';
import TideChart from './TideChart';
import WeatherAlertSystem from './WeatherAlertSystem';
import BuoyDataDisplay from './BuoyDataDisplay';
import BuoyMap from './BuoyMap';

interface ComprehensiveWeatherDisplayProps {
  latitude: number;
  longitude: number;
  location: string;
}

export default function ComprehensiveWeatherDisplay({ 
  latitude, 
  longitude, 
  location 
}: ComprehensiveWeatherDisplayProps) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [selectedBuoy, setSelectedBuoy] = useState<string>('42039'); // Default: Pensacola
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


  useEffect(() => {
    fetchWeatherData();
  }, [latitude, longitude]);

  useEffect(() => {
    // Keep it fresh while the user is on the page.
    const t = setInterval(() => {
      void fetchWeatherData({ silent: true });
    }, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [latitude, longitude, location]);

  const formattedSunrise = useMemo(() => {
    const raw = String(weatherData?.sun?.sunrise || '');
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
  }, [weatherData?.sun?.sunrise]);

  const formattedSunset = useMemo(() => {
    const raw = String(weatherData?.sun?.sunset || '');
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
  }, [weatherData?.sun?.sunset]);

  const fetchWeatherData = async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      // Prefer Next.js API (works without Edge Function)
      const res = await fetch('/api/weather/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, location }),
      });
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
        setLastUpdated(new Date());
        return;
      }
      // Fallback: Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('weather-api', {
        body: { latitude, longitude, location },
      });
      if (error) throw error;
      setWeatherData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Weather fetch error:', err);
      setWeatherData(null);
      setError('Unable to load weather right now. Please try again.');
      toast.error('Weather unavailable', { description: 'Please try again in a moment.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!weatherData) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Weather</h3>
            <p className="text-sm text-muted-foreground">{error || 'No data available.'}</p>
          </div>
          <Button variant="outline" onClick={() => void fetchWeatherData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WeatherAlertSystem latitude={latitude} longitude={longitude} />
      
      <Tabs defaultValue="weather" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weather">Weather & Tides</TabsTrigger>
          <TabsTrigger value="buoys">NOAA Buoys</TabsTrigger>
          <TabsTrigger value="marine">Marine Forecast</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weather" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-2xl font-bold">{weatherData.location}</h3>
                  <p className="text-xs text-muted-foreground">
                    {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void fetchWeatherData()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold">{weatherData.current.temp}°F</span>
                <span className="text-xl text-muted-foreground">
                  Feels like {weatherData.current.feelsLike}°
                </span>
              </div>
              <p className="text-lg capitalize mb-6">{weatherData.current.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                <div className="flex items-start gap-2">
                  <Wind className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Wind</p>
                    <p className="font-semibold">
                      {weatherData.current.windSpeed} mph
                      {typeof weatherData.current.windSpeedKnots === 'number' ? ` (${weatherData.current.windSpeedKnots} kt)` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Gusts {weatherData.current.windGust} mph</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Droplets className="w-4 h-4 text-sky-500 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Humidity</p>
                    <p className="font-semibold">{weatherData.current.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Visibility</p>
                    <p className="font-semibold">{weatherData.current.visibility} mi</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Gauge className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Pressure</p>
                    <p className="font-semibold">{weatherData.current.pressure ?? '—'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Sunrise className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-muted-foreground">Sunrise</p>
                    <p className="font-semibold">{formattedSunrise}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-muted-foreground">Sunset</p>
                    <p className="font-semibold">{formattedSunset}</p>
                  </div>
                </div>
              </div>
            </Card>
            
            <TideChart location={location} />
          </div>
          
          <WeatherForecast forecast={weatherData.forecast} />
        </TabsContent>
        
        <TabsContent value="buoys" className="space-y-6">
          <BuoyMap onBuoySelect={setSelectedBuoy} />
          <BuoyDataDisplay stationId={selectedBuoy} />
        </TabsContent>
        
        <TabsContent value="marine" className="space-y-6">
          <MarineForecast data={weatherData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
