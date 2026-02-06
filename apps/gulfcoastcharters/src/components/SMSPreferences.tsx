/**
 * SMS Preferences Component
 * 
 * Allows users to:
 * - Enable/disable SMS notifications
 * - Toggle individual notification types
 * - View SMS usage statistics
 * - See cost tracking
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { MessageSquare, TrendingUp, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface SMSPreferencesProps {
  userId: string;
}

interface SMSStats {
  total_sent: number;
  total_failed: number;
  total_cost: number;
  period: string;
}

export default function SMSPreferences({ userId }: SMSPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [preferences, setPreferences] = useState({
    sms_notifications: false,
    sms_booking_confirmed: false,
    sms_booking_reminder: false,
    sms_booking_cancelled: false,
    sms_urgent_message: true,
    phone_verified: false,
  });

  useEffect(() => {
    loadPreferences();
    loadStats();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          sms_notifications: data.sms_notifications || false,
          sms_booking_confirmed: data.sms_booking_confirmed || false,
          sms_booking_reminder: data.sms_booking_reminder || false,
          sms_booking_cancelled: data.sms_booking_cancelled || false,
          sms_urgent_message: data.sms_urgent_message !== false,
          phone_verified: data.phone_verified || false,
        });
      } else {
        // Create default preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, phone_verified')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabase
            .from('notification_preferences')
            .insert({
              user_id: userId,
              phone_number: profile.phone_number,
              phone_verified: profile.phone_verified || false,
            });
        }
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load SMS preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('twilio-sms-service', {
        body: {
          action: 'get_stats',
          userId,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
      // Don't show error for stats - it's not critical
    }
  };

  const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
    if (key === 'sms_notifications' && value && !preferences.phone_verified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = { [key]: value };
      
      // If disabling SMS notifications, disable all types
      if (key === 'sms_notifications' && !value) {
        updateData.sms_booking_confirmed = false;
        updateData.sms_booking_reminder = false;
        updateData.sms_booking_cancelled = false;
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...updateData,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        throw error;
      }

      setPreferences(prev => ({
        ...prev,
        ...updateData,
      }));

      toast.success('SMS preferences updated');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage your SMS notification settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preferences.phone_verified && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Phone Verification Required
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please verify your phone number in the Phone Verification section above to enable SMS notifications.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex-1">
              <Label className="text-base font-semibold">Enable SMS Notifications</Label>
              <p className="text-sm text-gray-500 mt-1">
                Receive text message notifications for important updates
              </p>
            </div>
            <Switch
              checked={preferences.sms_notifications}
              onCheckedChange={(checked) => handleToggle('sms_notifications', checked)}
              disabled={saving || !preferences.phone_verified}
            />
          </div>

          {preferences.sms_notifications && (
            <div className="space-y-3 pl-4 border-l-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Confirmations</Label>
                  <p className="text-xs text-gray-500">Get notified when your booking is confirmed</p>
                </div>
                <Switch
                  checked={preferences.sms_booking_confirmed}
                  onCheckedChange={(checked) => handleToggle('sms_booking_confirmed', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Reminders</Label>
                  <p className="text-xs text-gray-500">Receive reminders before your charter</p>
                </div>
                <Switch
                  checked={preferences.sms_booking_reminder}
                  onCheckedChange={(checked) => handleToggle('sms_booking_reminder', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Cancellations</Label>
                  <p className="text-xs text-gray-500">Get notified if your booking is cancelled</p>
                </div>
                <Switch
                  checked={preferences.sms_booking_cancelled}
                  onCheckedChange={(checked) => handleToggle('sms_booking_cancelled', checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Urgent Messages</Label>
                  <p className="text-xs text-gray-500">Critical updates from captains or admin (always enabled)</p>
                </div>
                <Switch
                  checked={preferences.sms_urgent_message}
                  onCheckedChange={(checked) => handleToggle('sms_urgent_message', checked)}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              SMS Usage Statistics
            </CardTitle>
            <CardDescription>
              Your SMS activity for the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{stats.total_sent}</div>
                <div className="text-sm text-blue-700 mt-1">Messages Sent</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">{stats.total_failed}</div>
                <div className="text-sm text-red-700 mt-1">Failed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  ${stats.total_cost.toFixed(2)}
                </div>
                <div className="text-sm text-green-700 mt-1">Total Cost</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              * Approximate cost based on Twilio pricing (~$0.0075 per SMS)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
