import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Bed, Bath, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="relative h-48 overflow-hidden" onClick={() => navigate(`/property/${property.id}`)}>

        <img
          src={property.images[0] || '/placeholder.svg'}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {property.featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500">Featured</Badge>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{property.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4" />
          <span>{property.city}, {property.state}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{property.max_guests}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.bathrooms}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">${property.price_per_night}</span>
            <span className="text-sm text-muted-foreground"> /night</span>
          </div>
          <Button onClick={() => navigate(`/property/${property.id}`)}>View Details</Button>

        </div>
      </div>
    </Card>
  );
}
