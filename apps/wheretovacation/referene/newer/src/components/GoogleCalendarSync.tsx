import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function GoogleCalendarSync({ captainId }: { captainId: string }) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const connectGoogleCalendar = () => {
    const clientId = 'YOUR_GOOGLE_CLIENT_ID';
    const redirectUri = `${window.location.origin}/captain-dashboard`;
    const scope = 'https://www.googleapis.com/auth/calendar';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
    
    window.location.href = authUrl;
  };

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'export',
          captainId,
          startDate,
          endDate,
          accessToken: localStorage.getItem('google_access_token'),
          calendarId: 'primary'
        }
      });

      if (error) throw error;

      setLastSync(new Date().toLocaleString());
      toast.success(`Synced ${data.synced} dates to Google Calendar`);
    } catch (error: any) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              Connect your Google Calendar to automatically sync your availability
            </p>
            <Button onClick={connectGoogleCalendar}>
              <Calendar className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Connected to Google Calendar</span>
            </div>

            {lastSync && (
              <p className="text-sm text-gray-600">
                Last synced: {lastSync}
              </p>
            )}

            <Button onClick={syncCalendar} disabled={syncing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>

            <div className="text-sm text-gray-600 space-y-1">
              <p>• Blocked dates will appear as "Unavailable" in your Google Calendar</p>
              <p>• Bookings will be added as calendar events</p>
              <p>• Changes sync automatically every hour</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}