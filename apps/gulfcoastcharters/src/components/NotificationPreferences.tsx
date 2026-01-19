import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import SMSPreferences from '@/components/SMSPreferences';


interface Preferences {
  booking_updates: boolean;
  messages: boolean;
  reviews: boolean;
  system_alerts: boolean;
  payment_updates: boolean;
  marketing: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>({
    booking_updates: true,
    messages: true,
    reviews: true,
    system_alerts: true,
    payment_updates: true,
    marketing: false,
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching preferences:', error);
    } else if (data) {
      setPreferences(data);
    }
    setLoading(false);
  };


  const handleToggle = (key: keyof Preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Notification preferences saved'
      });
    }
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="booking_updates">Booking Updates</Label>
            <Switch
              id="booking_updates"
              checked={preferences.booking_updates}
              onCheckedChange={() => handleToggle('booking_updates')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="messages">Messages</Label>
            <Switch
              id="messages"
              checked={preferences.messages}
              onCheckedChange={() => handleToggle('messages')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reviews">Reviews</Label>
            <Switch
              id="reviews"
              checked={preferences.reviews}
              onCheckedChange={() => handleToggle('reviews')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="system_alerts">System Alerts</Label>
            <Switch
              id="system_alerts"
              checked={preferences.system_alerts}
              onCheckedChange={() => handleToggle('system_alerts')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="payment_updates">Payment Updates</Label>
            <Switch
              id="payment_updates"
              checked={preferences.payment_updates}
              onCheckedChange={() => handleToggle('payment_updates')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="marketing">Marketing & Promotions</Label>
            <Switch
              id="marketing"
              checked={preferences.marketing}
              onCheckedChange={() => handleToggle('marketing')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Methods</CardTitle>
          <CardDescription>How you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_notifications">Email</Label>
            <Switch
              id="email_notifications"
              checked={preferences.email_notifications}
              onCheckedChange={() => handleToggle('email_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push_notifications">Push Notifications</Label>
            <Switch
              id="push_notifications"
              checked={preferences.push_notifications}
              onCheckedChange={() => handleToggle('push_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sms_notifications">SMS</Label>
            <Switch
              id="sms_notifications"
              checked={preferences.sms_notifications}
              onCheckedChange={() => handleToggle('sms_notifications')}
            />
          </div>
        </CardContent>
      </Card>

      <PushNotificationManager />

      {userId && <SMSPreferences userId={userId} />}

      <Button onClick={savePreferences} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
