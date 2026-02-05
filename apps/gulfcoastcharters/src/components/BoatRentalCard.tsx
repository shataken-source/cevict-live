import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign } from 'lucide-react';

interface BoatRentalCardProps {
  rental: {
    id: string;
    name: string;
    type: string;
    description: string;
    image: string;
    capacity: number;
    priceHourly: number;
    priceHalfDay: number;
    priceFullDay: number;
    location: string;
    features: string[];
    rating: number;
    reviewCount: number;
  };
  onClick: () => void;
}

export default function BoatRentalCard({ rental, onClick }: BoatRentalCardProps) {
  return (
    <div 
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        <img 
          src={rental.image} 
          alt={rental.name} 
          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-blue-600">
          {rental.type}
        </div>
        <div className="absolute bottom-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
          ★ {rental.rating} ({rental.reviewCount})
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-2xl font-bold mb-2 text-gray-900">{rental.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{rental.location}</p>
        <p className="text-gray-700 text-sm mb-4 line-clamp-2">{rental.description}</p>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{rental.capacity} {rental.capacity === 1 ? 'Person' : 'People'}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>Hourly: ${rental.priceHourly}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Half Day: ${rental.priceHalfDay}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
            <DollarSign className="w-4 h-4" />
            <span>Full Day: ${rental.priceFullDay}</span>
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Reserve Now
        </Button>
      </div>
    </div>
  );
}
