import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin } from 'lucide-react';

interface ListingCardProps {
  listing: any;
  onClick: () => void;
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const categoryColors: Record<string, string> = {
    boats: 'bg-blue-500',
    electronics: 'bg-purple-500',
    fishing_gear: 'bg-green-500',
    safety_equipment: 'bg-red-500',
    other: 'bg-gray-500'
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="relative h-48">
        <img
          src={listing.images?.[0] || '/placeholder.svg'}
          alt={listing.title}
          className="w-full h-full object-cover"
        />
        <Badge className={`absolute top-2 left-2 ${categoryColors[listing.category]}`}>
          {listing.category.replace('_', ' ')}
        </Badge>
        {listing.negotiable && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">Negotiable</Badge>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{listing.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-blue-600">${listing.price}</span>
          <Badge variant="outline">{listing.condition}</Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{listing.location || 'Location not specified'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{listing.views || 0}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
