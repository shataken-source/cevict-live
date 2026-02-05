import { X, MapPin, DollarSign, Star, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Destination } from '../data/mockDestinations';

interface ComparisonToolProps {
  destinations: Destination[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ComparisonTool({ destinations, onRemove, onClose }: ComparisonToolProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Compare Destinations</h2>
        
        {destinations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No destinations to compare. Add some from the listings!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinations.map((dest) => (
              <div key={dest.id} className="border rounded-lg p-4 relative">
                <button
                  onClick={() => onRemove(dest.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <img src={dest.image} alt={dest.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                <h3 className="font-bold text-lg mb-2">{dest.name}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {dest.country}, {dest.region}
                  </div>
                  
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{dest.rating}</span>
                    <span className="text-gray-500 ml-1">({dest.reviews} reviews)</span>
                  </div>
                  
                  <div className="flex items-center text-green-600 font-semibold">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ${dest.avgCost}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Best: {dest.bestTime}
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-xs font-semibold mb-1">Activities:</p>
                    <div className="flex flex-wrap gap-1">
                      {dest.activities.slice(0, 4).map((activity) => (
                        <Badge key={activity} variant="secondary" className="text-xs">
                          {activity}
                        </Badge>
                      ))}
                      {dest.activities.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{dest.activities.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
