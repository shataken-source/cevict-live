import { Heart, MapPin } from 'lucide-react';
import { Destination } from '@/data/destinations';

interface DestinationCardProps {
  destination: Destination;
  onSave: (id: number) => void;
  isSaved: boolean;
  onClick: () => void;
}

export function DestinationCard({ destination, onSave, isSaved, onClick }: DestinationCardProps) {
  return (
    <div className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer">
      <div className="relative h-64 overflow-hidden" onClick={onClick}>
        <img 
          src={destination.image} 
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave(destination.id);
          }}
          className={`absolute top-4 right-4 p-2 rounded-full transition-all ${
            isSaved ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
          }`}
        >
          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-5" onClick={onClick}>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="w-4 h-4" />
          <span>{destination.country}</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{destination.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">Starting from</span>
            <p className="text-2xl font-bold text-blue-600">${destination.price}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="font-semibold">{destination.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
