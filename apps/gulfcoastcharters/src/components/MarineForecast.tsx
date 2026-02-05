import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wind, Waves, Thermometer, Eye, Droplets, Compass, AlertTriangle } from 'lucide-react';

interface MarineForecastProps {
  data: {
    current: {
      temp: number;
      windSpeed: number;
      windGust: number;
      windDirection: number;
      humidity: number;
      visibility: number;
      waterTemp: number;
      condition: string;
      description: string;
    };
  };
}

const getWindDirection = (deg: number): string => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const getWaveHeight = (windSpeed: number): number => {
  // Simplified wave calculation
  return Math.round((windSpeed / 10) * 10) / 10;
};

const getSafetyLevel = (windSpeed: number, visibility: number) => {
  if (windSpeed > 25 || visibility < 2) return { level: 'Dangerous', color: 'destructive' };
  if (windSpeed > 15 || visibility < 5) return { level: 'Caution', color: 'warning' };
  return { level: 'Safe', color: 'default' };
};

export default function MarineForecast({ data }: MarineForecastProps) {
  const waveHeight = getWaveHeight(data.current.windSpeed);
  const safety = getSafetyLevel(data.current.windSpeed, data.current.visibility);
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Marine Conditions</h3>
        <Badge variant={safety.color as any}>{safety.level}</Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <Wind className="w-5 h-5 text-blue-500 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Wind</p>
            <p className="font-semibold">{data.current.windSpeed} mph</p>
            <p className="text-xs text-muted-foreground">
              {getWindDirection(data.current.windDirection)} • Gusts {data.current.windGust} mph
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Waves className="w-5 h-5 text-cyan-500 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Wave Height</p>
            <p className="font-semibold">{waveHeight} ft</p>
            <p className="text-xs text-muted-foreground">Estimated</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Thermometer className="w-5 h-5 text-orange-500 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Water Temp</p>
            <p className="font-semibold">{data.current.waterTemp}°F</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-purple-500 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Visibility</p>
            <p className="font-semibold">{data.current.visibility} mi</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Droplets className="w-5 h-5 text-blue-400 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Humidity</p>
            <p className="font-semibold">{data.current.humidity}%</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Compass className="w-5 h-5 text-green-500 mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Conditions</p>
            <p className="font-semibold text-sm">{data.current.description}</p>
          </div>
        </div>
      </div>
      
      {safety.level !== 'Safe' && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {safety.level === 'Dangerous' 
              ? 'Dangerous conditions detected. Charter operations not recommended.'
              : 'Exercise caution. Monitor conditions closely before departure.'}
          </p>
        </div>
      )}
    </Card>
  );
}
