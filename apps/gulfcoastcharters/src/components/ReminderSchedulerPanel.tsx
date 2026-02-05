import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Mail, User, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileReminder {
  captain_id: string;
  email: string;
  full_name: string;
  last_update: string;
  days_since_update: number;
  last_reminder_sent: string | null;
}

export const ReminderSchedulerPanel: React.FC = () => {
  const [profileReminders, setProfileReminders] = useState<ProfileReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfileReminders();
  }, []);

  const loadProfileReminders = async () => {
    try {
      // Get captains who haven't updated profile in 90+ days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('captain_profile_updates')
        .select(`
          captain_id,
          updated_at,
          captains:captain_id (email, full_name)
        `)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      // Process data to find captains needing reminders
      const captainMap = new Map();
      data?.forEach((update: any) => {
        if (!captainMap.has(update.captain_id) || 
            new Date(update.updated_at) > new Date(captainMap.get(update.captain_id).updated_at)) {
          captainMap.set(update.captain_id, update);
        }
      });

      const reminders: ProfileReminder[] = [];
      for (const [captainId, update] of captainMap) {
        const daysSince = Math.floor((Date.now() - new Date(update.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 90) {
          reminders.push({
            captain_id: captainId,
            email: update.captains.email,
            full_name: update.captains.full_name,
            last_update: update.updated_at,
            days_since_update: daysSince,
            last_reminder_sent: null
          });
        }
      }

      setProfileReminders(reminders);
    } catch (error) {
      console.error('Error loading profile reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAllReminders = async () => {
    setTriggering(true);
    try {
      // Trigger document expiration reminders
      const { error: docError } = await supabase.functions.invoke('document-expiration-reminder');
      if (docError) throw docError;

      // Trigger profile update reminders
      const { error: profileError } = await supabase.functions.invoke('profile-update-reminder');
      if (profileError) throw profileError;

      toast({
        title: 'Reminders Triggered',
        description: 'All reminder emails have been queued for sending.',
      });

      loadProfileReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger reminders.',
        variant: 'destructive',
      });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminder Scheduler
            </CardTitle>
            <Button onClick={triggerAllReminders} disabled={triggering}>
              <RefreshCw className={`w-4 h-4 mr-2 ${triggering ? 'animate-spin' : ''}`} />
              Trigger All Reminders
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{profileReminders.length}</div>
                  <div className="text-sm text-gray-600">Profile Updates Due</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Mail className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">Daily</div>
                  <div className="text-sm text-gray-600">Auto-Check Frequency</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">9 AM UTC</div>
                  <div className="text-sm text-gray-600">Scheduled Time</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <h3 className="font-semibold mb-4">Captains Needing Profile Updates</h3>
          <div className="space-y-3">
            {profileReminders.length === 0 ? (
              <p className="text-gray-500">All captain profiles are up to date!</p>
            ) : (
              profileReminders.map((reminder) => (
                <div key={reminder.captain_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{reminder.full_name}</p>
                    <p className="text-sm text-gray-600">{reminder.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(reminder.last_update).toLocaleDateString()} 
                      ({reminder.days_since_update} days ago)
                    </p>
                  </div>
                  <Badge variant="secondary">{reminder.days_since_update}d overdue</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
