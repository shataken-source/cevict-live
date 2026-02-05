import { Card } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Wind } from 'lucide-react';

interface ForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  windSpeed: number;
  condition: string;
  icon: string;
}

interface WeatherForecastProps {
  forecast: ForecastDay[];
}

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
      return <Sun className="w-8 h-8 text-yellow-500" />;
    case 'rain':
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    case 'clouds':
      return <Cloud className="w-8 h-8 text-gray-500" />;
    default:
      return <Cloud className="w-8 h-8 text-gray-400" />;
  }
};

export default function WeatherForecast({ forecast }: WeatherForecastProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">7-Day Forecast</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {forecast.map((day, idx) => (
          <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium mb-2">
              {idx === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
            <div className="flex justify-center mb-2">
              {getWeatherIcon(day.condition)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{day.tempHigh}°</p>
              <p className="text-xs text-muted-foreground">{day.tempLow}°</p>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Wind className="w-3 h-3" />
                <span>{day.windSpeed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
