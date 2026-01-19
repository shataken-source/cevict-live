import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sunrise, Sunset } from 'lucide-react';
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


  useEffect(() => {
    fetchWeatherData();
  }, [latitude, longitude]);

  const fetchWeatherData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('weather-api', {
        body: { latitude, longitude, location }
      });

      if (error) throw error;
      setWeatherData(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
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

  if (!weatherData) return null;

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
              <h3 className="text-2xl font-bold mb-2">{weatherData.location}</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold">{weatherData.current.temp}°F</span>
                <span className="text-xl text-muted-foreground">
                  Feels like {weatherData.current.feelsLike}°
                </span>
              </div>
              <p className="text-lg capitalize mb-6">{weatherData.current.description}</p>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Sunrise className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-muted-foreground">Sunrise</p>
                    <p className="font-semibold">{weatherData.sun.sunrise}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-muted-foreground">Sunset</p>
                    <p className="font-semibold">{weatherData.sun.sunset}</p>
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
