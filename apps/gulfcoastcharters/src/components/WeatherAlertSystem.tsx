import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface WeatherAlert {
  id: string;
  severity: string;
  event: string;
  description: string;
  expires: string;
  affected_bookings?: string[];
}

type WeatherAlertSystemProps = {
  latitude?: number;
  longitude?: number;
};

export default function WeatherAlertSystem({ latitude, longitude }: WeatherAlertSystemProps) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    loadAlerts();
    
    const interval = setInterval(loadAlerts, 600000); // 10 min
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast.success('Notifications enabled', { description: 'You will receive weather alerts' });
      } else if (permission === 'denied') {
        toast.error('Notifications blocked', { description: 'Enable notifications in your browser settings.' });
      }
    }
  };

  const loadAlerts = async () => {
    try {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        setAlerts([]);
        return;
      }
      const { data, error } = await supabase.functions.invoke('weather-alerts', {
        body: { action: 'list', latitude, longitude }
      });
      
      if (!error && data?.alerts) {
        setAlerts(data.alerts);
        
        // Check for new severe alerts
        data.alerts.forEach((alert: WeatherAlert) => {
          if ((alert.severity === 'Severe' || alert.severity === 'Extreme') && notificationsEnabled) {
            showNotification(alert);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const showNotification = (alert: WeatherAlert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⚠️ ${alert.event}`, {
        body: alert.description.substring(0, 100) + '...',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: alert.id,
        requireInteraction: true
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme': return 'bg-red-600 text-white';
      case 'severe': return 'bg-orange-600 text-white';
      case 'moderate': return 'bg-yellow-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Weather Alerts</h3>
          <Button
            size="sm"
            variant={notificationsEnabled ? 'default' : 'outline'}
            onClick={requestNotificationPermission}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span className="ml-2">{notificationsEnabled ? 'Enabled' : 'Enable'}</span>
          </Button>
        </div>

        {alerts.length === 0 ? (
          <p className="text-gray-600">No active weather alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <Card key={alert.id} className="p-3 border-l-4 border-red-500">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="font-bold">{alert.event}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(alert.expires).toLocaleString()}
                    </p>
                    {alert.affected_bookings && alert.affected_bookings.length > 0 && (
                      <Badge variant="outline" className="mt-2">
                        {alert.affected_bookings.length} booking(s) affected
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}