import { useEffect, useState } from 'react';
import { AlertTriangle, CloudRain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface WeatherAlert {
  severity: string;
  event: string;
  start_date: string;
  end_date: string;
}

interface CaptainWeatherBadgeProps {
  captainId: string;
  location?: string;
  compact?: boolean;
}

export default function CaptainWeatherBadge({ 
  captainId, 
  location,
  compact = false 
}: CaptainWeatherBadgeProps) {
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeatherAlert();
    const interval = setInterval(loadWeatherAlert, 300000); // 5 min
    return () => clearInterval(interval);
  }, [captainId, location]);

  const loadWeatherAlert = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('captain-weather-alerts', {
        body: { 
          action: 'check_captain_weather',
          captain_id: captainId,
          location: location
        }
      });
      
      if (!error && data?.alert) {
        setAlert(data.alert);
      } else {
        setAlert(null);
      }
    } catch (error) {
      console.error('Failed to load weather alert:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !alert) return null;

  const getSeverityConfig = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme':
      case 'severe':
        return { 
          color: 'bg-red-600 text-white border-red-700', 
          icon: AlertTriangle,
          label: 'Severe Weather'
        };
      case 'warning':
        return { 
          color: 'bg-orange-500 text-white border-orange-600', 
          icon: AlertTriangle,
          label: 'Weather Warning'
        };
      case 'watch':
      case 'moderate':
        return { 
          color: 'bg-yellow-500 text-white border-yellow-600', 
          icon: CloudRain,
          label: 'Weather Watch'
        };
      default:
        return { 
          color: 'bg-blue-500 text-white border-blue-600', 
          icon: CloudRain,
          label: 'Weather Advisory'
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;
  const startDate = new Date(alert.start_date).toLocaleDateString();
  const endDate = new Date(alert.end_date).toLocaleDateString();

  if (compact) {
    return (
      <Badge className={`${config.color} flex items-center gap-1 animate-pulse`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs">{config.label}</span>
      </Badge>
    );
  }

  return (
    <div className={`${config.color} rounded-lg p-3 border-2 animate-pulse`}>
      <div className="flex items-start gap-2">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-sm">{alert.event}</p>
          <p className="text-xs mt-1">
            {startDate} - {endDate}
          </p>
        </div>
      </div>
    </div>
  );
}
