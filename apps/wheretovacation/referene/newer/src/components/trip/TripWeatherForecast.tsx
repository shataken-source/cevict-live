import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { Cloud, Droplets, Wind, Sunrise, Sunset, Moon, AlertTriangle, Waves } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TripWeatherForecastProps {
  startDate: Date;
  endDate: Date;
  latitude: number;
  longitude: number;
  fishingSpots: Array<{ name: string; latitude: number; longitude: number; day: number }>;
}

export default function TripWeatherForecast({
  startDate,
  endDate,
  latitude,
  longitude,
  fishingSpots
}: TripWeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [tideData, setTideData] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  useEffect(() => {
    fetchWeatherAndTides();
  }, [latitude, longitude, startDate, endDate]);

  const fetchWeatherAndTides = async () => {
    try {
      const { data: weather } = await supabase.functions.invoke('weather-api', {
        body: { latitude, longitude, days }
      });

      setWeatherData(weather);

      if (weather?.alerts) {
        setAlerts(weather.alerts);
      }

      for (const spot of fishingSpots) {
        const { data: tides } = await supabase.functions.invoke('noaa-buoy-data', {
          body: { 
            action: 'tides',
            latitude: spot.latitude,
            longitude: spot.longitude,
            date: new Date(startDate.getTime() + spot.day * 24 * 60 * 60 * 1000)
          }
        });
        
        setTideData(prev => ({ ...prev, [spot.day]: tides }));
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Card className="p-6">Loading weather data...</Card>;

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Weather Alerts:</strong> {alerts.map(a => a.event).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="day-1" className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
          {Array.from({ length: days }).map((_, i) => (
            <TabsTrigger key={i} value={`day-${i + 1}`}>Day {i + 1}</TabsTrigger>
          ))}
        </TabsList>

        {Array.from({ length: days }).map((_, dayIndex) => {
          const dayData = weatherData?.daily?.[dayIndex];
          const date = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
          
          return (
            <TabsContent key={dayIndex} value={`day-${dayIndex + 1}`} className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">
                  {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-bold">{dayData?.temp?.max || 75}°F</span>
                      <span className="text-muted-foreground">/ {dayData?.temp?.min || 65}°</span>
                    </div>
                    <p className="text-lg capitalize mb-4">{dayData?.weather?.[0]?.description || 'Partly cloudy'}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        <span>Wind: {dayData?.wind_speed || 10} mph</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        <span>Humidity: {dayData?.humidity || 70}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        <span>Pressure: {dayData?.pressure || 1013} mb</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Sun & Moon</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-4 h-4 text-orange-400" />
                        <span>{dayData?.sunrise || '6:30 AM'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sunset className="w-4 h-4 text-purple-400" />
                        <span>{dayData?.sunset || '7:45 PM'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        <span>{dayData?.moon_phase || 'Waxing Crescent'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Waves className="w-4 h-4" />
                      Tide Times
                    </h4>
                    <div className="space-y-2">
                      {tideData[dayIndex + 1]?.predictions?.slice(0, 4).map((tide: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <Badge variant={tide.type === 'H' ? 'default' : 'secondary'}>
                            {tide.type === 'H' ? 'High' : 'Low'}
                          </Badge>
                          <span>{new Date(tide.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                          <span>{parseFloat(tide.v).toFixed(1)}ft</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
