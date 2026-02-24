import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Loader2, MessageSquare, DollarSign } from 'lucide-react';
import SMSPhoneVerification from './SMSPhoneVerification';

interface SMSPreferencesProps {
  userId: string;
}

export default function SMSPreferences({ userId }: SMSPreferencesProps) {
  const [preferences, setPreferences] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadStats();
  }, [userId]);

  const loadPreferences = async () => {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    setPreferences(data);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await supabase.functions.invoke('twilio-sms-service', {
      body: { action: 'get_stats', userId }
    });
    setStats(data);
  };

  const updatePreference = async (key: string, value: boolean) => {
    setSaving(true);
    await supabase
      .from('notification_preferences')
      .update({ [key]: value })
      .eq('user_id', userId);

    setPreferences({ ...preferences, [key]: value });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!preferences?.phone_verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>Verify your phone to receive SMS notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <SMSPhoneVerification userId={userId} onVerified={loadPreferences} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Phone: {preferences.phone_number} (Verified)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
            <Switch
              id="sms-enabled"
              checked={preferences.sms_notifications}
              onCheckedChange={(checked) => updatePreference('sms_notifications', checked)}
              disabled={saving}
            />
          </div>

          {preferences.sms_notifications && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-confirmations">Booking Confirmations</Label>
                <Switch
                  id="sms-confirmations"
                  checked={preferences.sms_booking_confirmations}
                  onCheckedChange={(checked) => updatePreference('sms_booking_confirmations', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sms-reminders">Booking Reminders</Label>
                <Switch
                  id="sms-reminders"
                  checked={preferences.sms_booking_reminders}
                  onCheckedChange={(checked) => updatePreference('sms_booking_reminders', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sms-cancellations">Cancellations</Label>
                <Switch
                  id="sms-cancellations"
                  checked={preferences.sms_cancellations}
                  onCheckedChange={(checked) => updatePreference('sms_cancellations', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sms-urgent">Urgent Messages</Label>
                <Switch
                  id="sms-urgent"
                  checked={preferences.sms_urgent_messages}
                  onCheckedChange={(checked) => updatePreference('sms_urgent_messages', checked)}
                  disabled={saving}
                />
              </div>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => setShowVerification(true)}
            className="w-full"
          >
            Change Phone Number
          </Button>
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              SMS Usage (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Messages Sent:</span>
              <span className="font-medium">{stats.totalSent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Failed:</span>
              <span className="font-medium">{stats.totalFailed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Cost:</span>
              <span className="font-medium">${stats.totalCost.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {showVerification && (
        <Card>
          <CardHeader>
            <CardTitle>Update Phone Number</CardTitle>
          </CardHeader>
          <CardContent>
            <SMSPhoneVerification
              userId={userId}
              onVerified={() => {
                setShowVerification(false);
                loadPreferences();
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}