import { Card } from '@/components/ui/card';
import { Cloud, Droplets, Wind, Thermometer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HourlyWeatherDisplayProps {
  hourlyData: Array<{
    time: string;
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    precipitation: number;
    description: string;
  }>;
}

export default function HourlyWeatherDisplay({ hourlyData }: HourlyWeatherDisplayProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Hourly Forecast</h3>
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {hourlyData.map((hour, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="font-semibold w-20">{hour.time}</span>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <span className="font-bold">{hour.temp}°F</span>
                  <span className="text-sm text-muted-foreground">
                    Feels {hour.feelsLike}°
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4" />
                  <span>{hour.windSpeed} mph {hour.windDirection}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="w-4 h-4" />
                  <span>{hour.humidity}%</span>
                </div>
                {hour.precipitation > 0 && (
                  <div className="flex items-center gap-1">
                    <Cloud className="w-4 h-4" />
                    <span>{hour.precipitation}%</span>
                  </div>
                )}
              </div>
              
              <span className="text-sm text-muted-foreground capitalize w-32 text-right">
                {hour.description}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
