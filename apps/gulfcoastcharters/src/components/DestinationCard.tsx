import { MapPin, Star, DollarSign, GitCompare } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Destination } from '../data/mockDestinations';

interface DestinationCardProps {
  destination: Destination;
  onClick: () => void;
  onAddToCompare?: (destination: Destination) => void;
}

export function DestinationCard({ destination, onClick, onAddToCompare }: DestinationCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-gray-100">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-100 to-violet-100" onClick={onClick}>
        <img
          src={destination.image}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
        />
        {destination.featured && (
          <Badge className="absolute top-3 right-3 gradient-primary text-white border-0">Featured</Badge>
        )}
        {onAddToCompare && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-3 left-3"
            onClick={(e) => { e.stopPropagation(); onAddToCompare(destination); }}
          >
            <GitCompare className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{destination.name}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1 text-purple-600" />
              {destination.country}
            </div>
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
            <span className="font-bold text-gray-900">{destination.rating}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{destination.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {destination.activities.slice(0, 3).map(activity => (
            <Badge key={activity} variant="secondary" className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100">
              {activity}
            </Badge>
          ))}
          {destination.activities.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700">
              +{destination.activities.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-bold text-gray-900">${destination.avgCost}</span>
            <span className="text-gray-500 ml-1">avg</span>
          </div>
          <Button size="sm" variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50" onClick={onClick}>View Details</Button>
        </div>
      </div>
    </Card>
  );
}

