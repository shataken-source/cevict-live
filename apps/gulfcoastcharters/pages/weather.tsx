/**
 * Weather Dashboard Page
 * 
 * Route: /weather
 * Displays comprehensive weather information for Gulf Coast charters
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ComprehensiveWeatherDisplay from '../src/components/ComprehensiveWeatherDisplay';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { MapPin, RefreshCw } from 'lucide-react';

export default function WeatherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<string>('Gulf Coast');
  const [latitude, setLatitude] = useState<number>(30.2672); // Default: Pensacola, FL
  const [longitude, setLongitude] = useState<number>(-87.2015);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        
        // Weather page can be public, but we'll track user for preferences
        if (currentUser) {
          setUser(currentUser);
        }
        
        // Get user's preferred location if logged in
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('location')
            .eq('id', currentUser.id)
            .single();
          
          if (profile?.location) {
            setLocation(profile.location);
          }
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        // Don't block access - weather is public
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    toast.success('Weather data refreshed');
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Weather Dashboard</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        <ComprehensiveWeatherDisplay 
          latitude={latitude}
          longitude={longitude}
          location={location}
        />
      </div>
    </Layout>
  );
}
