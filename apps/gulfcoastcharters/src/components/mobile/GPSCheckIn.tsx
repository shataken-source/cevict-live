import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GPSCheckInProps {
  bookingId: string;
  expectedLocation?: { lat: number; lng: number };
}

export default function GPSCheckIn({ bookingId, expectedLocation }: GPSCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handleCheckIn = async () => {
    setLoading(true);
    
    try {
      const position = await getCurrentLocation();
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setLocation(coords);

      // Verify location if expected location provided
      if (expectedLocation) {
        const distance = calculateDistance(
          coords.lat, coords.lng,
          expectedLocation.lat, expectedLocation.lng
        );
        
        if (distance > 500) { // More than 500m away
          toast({
            title: 'Location Warning',
            description: `You are ${Math.round(distance)}m from the expected location`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Submit check-in
      const { error } = await supabase.functions.invoke('booking-manager', {
        body: {
          action: 'check-in',
          bookingId,
          location: coords,
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: 'Check-In Successful',
        description: 'Location verified and recorded',
      });
    } catch (error: any) {
      toast({
        title: 'Check-In Failed',
        description: error.message || 'Could not get location',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">GPS Check-In</h3>
        </div>
        {location && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Located
          </span>
        )}
      </div>
      
      {location && (
        <div className="text-xs text-gray-600 mb-3">
          Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
        </div>
      )}
      
      <Button 
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting Location...</>
        ) : (
          <><MapPin className="w-4 h-4 mr-2" /> Check In at Location</>
        )}
      </Button>
    </Card>
  );
}
