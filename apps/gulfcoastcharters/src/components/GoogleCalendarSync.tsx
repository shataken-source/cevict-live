import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function GoogleCalendarSync({ captainId }: { captainId: string }) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [clientIdConfigured, setClientIdConfigured] = useState(false);

  useEffect(() => {
    // Check if Google Client ID is configured
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    setClientIdConfigured(!!clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID');
    
    // Check if we have a stored access token (user previously connected)
    const storedToken = localStorage.getItem('google_access_token');
    if (storedToken) {
      setConnected(true);
    }

    // Handle OAuth callback from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('google_auth_success');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const authError = urlParams.get('google_auth_error');

    if (authSuccess === '1' && accessToken) {
      // Store tokens
      localStorage.setItem('google_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('google_refresh_token', refreshToken);
      }
      setConnected(true);
      toast.success('Google Calendar connected successfully!');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
      toast.error(`Google Calendar connection failed: ${authError}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const connectGoogleCalendar = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      toast.error('Google Calendar integration is not configured. Please contact support or configure NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
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
        {!clientIdConfigured ? (
          <div className="text-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Google Calendar Integration Not Configured</h3>
              <p className="text-sm text-gray-600 mb-4">
                To enable Google Calendar sync, you need to configure a Google OAuth Client ID.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-left text-sm space-y-2">
                <p className="font-semibold">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                  <li>Create OAuth 2.0 Client ID credentials</li>
                  <li>Add authorized redirect URI: <code className="bg-gray-200 px-1 rounded">{window.location.origin}/api/auth/google/callback</code></li>
                  <li>Add <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your environment variables</li>
                </ol>
              </div>
            </div>
          </div>
        ) : !connected ? (
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