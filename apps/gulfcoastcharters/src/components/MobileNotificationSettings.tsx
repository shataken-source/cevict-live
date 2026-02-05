import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MobileNotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    bookings: true,
    messages: true,
    weather: true,
    reminders: true,
    marketing: false
  });
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setEnabled(Notification.permission === 'granted');
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Notifications not supported', variant: 'destructive' });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setEnabled(true);
      await subscribeToPush();
      toast({ title: 'Notifications enabled!' });
    }
  };

  const subscribeToPush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || '')
        });
        
        // Send subscription to backend
        console.log('Push subscription:', subscription);
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {enabled ? <Bell className="w-5 h-5 text-blue-600" /> : <BellOff className="w-5 h-5 text-gray-400" />}
            <div>
              <h3 className="font-semibold">Push Notifications</h3>
              <p className="text-sm text-gray-600">
                {enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          {!enabled && (
            <Button size="sm" onClick={requestPermission}>
              Enable
            </Button>
          )}
        </div>

        {enabled && (
          <div className="space-y-3 pt-3 border-t">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm capitalize">{key}</span>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {enabled && (
        <Button className="w-full">
          <Check className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      )}
    </div>
  );
}
