import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Anchor } from 'lucide-react';

interface FavoriteCaptain {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  totalTrips: number;
  location: string;
  boatTypes: string[];
}

interface FavoriteCaptainsSectionProps {
  captains: FavoriteCaptain[];
  onBookCaptain: (captainId: string) => void;
}

export default function FavoriteCaptainsSection({ captains, onBookCaptain }: FavoriteCaptainsSectionProps) {
  if (captains.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
          Your Favorite Captains
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {captains.map(captain => (
            <Card key={captain.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 p-4">
                <img 
                  src={captain.imageUrl} 
                  alt={captain.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{captain.name}</h4>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    <span>{captain.rating.toFixed(1)}</span>
                    <span className="text-gray-400">•</span>
                    <span>{captain.totalTrips} trips</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{captain.location}</span>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-1 mb-3">
                  {captain.boatTypes.slice(0, 2).map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => onBookCaptain(captain.id)}
                >
                  <Anchor className="w-4 h-4 mr-1" />
                  Book Again
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
