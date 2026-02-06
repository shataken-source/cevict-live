import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Buoy {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
}

interface BuoyMapProps {
  onBuoySelect?: (buoyId: string) => void;
}

export default function BuoyMap({ onBuoySelect }: BuoyMapProps) {
  const [buoys, setBuoys] = useState<Record<string, Buoy>>({});
  const [selectedBuoy, setSelectedBuoy] = useState<string | null>(null);

  useEffect(() => {
    fetchBuoys();
  }, []);

  const fetchBuoys = async () => {
    try {
      // Prefer Next.js API (works without Edge Function)
      const apiRes = await fetch('/api/noaa-buoy?action=list');
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.buoys) {
          setBuoys(data.buoys);
          return;
        }
      }
      // Fallback: Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('noaa-buoy-data', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.buoys) setBuoys(data.buoys);
    } catch (err) {
      console.error('Error fetching buoys:', err);
    }
  };

  const handleBuoyClick = (buoyId: string) => {
    setSelectedBuoy(buoyId);
    if (onBuoySelect) {
      onBuoySelect(buoyId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Gulf Coast NOAA Buoys
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(buoys).map(([id, buoy]) => (
            <div
              key={id}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedBuoy === id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => handleBuoyClick(id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant="outline" className="mb-1">
                    {id}
                  </Badge>
                  <h4 className="font-semibold">{buoy.name}</h4>
                </div>
                <MapPin className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{buoy.location}</p>
              <p className="text-xs text-gray-500">
                {buoy.lat.toFixed(2)}°N, {Math.abs(buoy.lon).toFixed(2)}°W
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.ndbc.noaa.gov/station_page.php?station=${id}`, '_blank');
                }}
              >
                View on NOAA <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}