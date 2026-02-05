import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface WeatherAlertNotifierProps {
  tripId: string;
  organizerEmail: string;
  latitude: number;
  longitude: number;
  startDate: Date;
  endDate: Date;
}

export default function WeatherAlertNotifier({
  tripId,
  organizerEmail,
  latitude,
  longitude,
  startDate,
  endDate
}: WeatherAlertNotifierProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    checkWeatherAlerts();
    const interval = setInterval(checkWeatherAlerts, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const checkWeatherAlerts = async () => {
    try {
      const { data } = await supabase.functions.invoke('weather-api', {
        body: { latitude, longitude, alerts: true }
      });

      if (data?.alerts && data.alerts.length > 0) {
        const newAlerts = data.alerts.filter((a: any) => !dismissed.includes(a.id));
        setAlerts(newAlerts);

        // Send email notification to organizer
        if (newAlerts.length > 0) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: organizerEmail,
              subject: `Weather Alert for Your Trip`,
              html: `
                <h2>Weather Alert</h2>
                <p>Dangerous weather conditions have been detected for your upcoming trip.</p>
                ${newAlerts.map((a: any) => `
                  <div style="background: #fee; padding: 15px; margin: 10px 0; border-left: 4px solid #f00;">
                    <h3>${a.event}</h3>
                    <p>${a.description}</p>
                    <p><strong>Effective:</strong> ${new Date(a.start).toLocaleString()}</p>
                    <p><strong>Expires:</strong> ${new Date(a.end).toLocaleString()}</p>
                  </div>
                `).join('')}
              `
            }
          });

          toast.error(`Weather Alert: ${newAlerts[0].event}`);
        }
      }
    } catch (error) {
      console.error('Failed to check weather alerts:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissed([...dismissed, alertId]);
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <Alert key={alert.id} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            {alert.event}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">{alert.description}</p>
            <p className="text-sm">
              <strong>Effective:</strong> {new Date(alert.start).toLocaleString()}
            </p>
            <p className="text-sm">
              <strong>Expires:</strong> {new Date(alert.end).toLocaleString()}
            </p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
