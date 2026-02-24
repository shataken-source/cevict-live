import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LocalBusinessMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: string;
}

export default function LocalBusinessMap({ open, onOpenChange, location = 'Gulf Coast' }: LocalBusinessMapProps) {
  const [loading, setLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (open && location) {
      generateMapUrl();
    }
  }, [open, location]);

  const generateMapUrl = () => {
    setLoading(true);
    
    // Create Google Maps embed URL with multiple markers for different business types
    const searchQuery = encodeURIComponent(`${location} marinas bait shops hotels`);
    const embedUrl = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dN7YcVvC8VVVVV&q=${searchQuery}&zoom=12`;
    
    setMapUrl(embedUrl);
    setLoading(false);
  };

  const businessTypes = [
    { name: 'Marinas', icon: '⚓', color: 'bg-blue-500' },
    { name: 'Bait Shops', icon: '🎣', color: 'bg-green-500' },
    { name: 'Hotels', icon: '🏨', color: 'bg-purple-500' },
    { name: 'Restaurants', icon: '🍽️', color: 'bg-orange-500' },
    { name: 'ATMs', icon: '💰', color: 'bg-yellow-500' },
    { name: 'Car Rentals', icon: '🚗', color: 'bg-red-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Local Businesses Near {location}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {businessTypes.map((type) => (
              <span key={type.name} className={`${type.color} text-white px-3 py-1 rounded-full text-sm`}>
                {type.icon} {type.name}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Nearby Business Types:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Marinas & Boat Launches</li>
              <li>Bait & Tackle Shops</li>
              <li>Hotels & Accommodations</li>
              <li>Restaurants & Dining</li>
              <li>ATMs & Banking</li>
              <li>Car Rental Services</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
