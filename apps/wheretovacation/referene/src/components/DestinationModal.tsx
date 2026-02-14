import { X, MapPin, Calendar, DollarSign, Star } from 'lucide-react';
import { Destination } from '@/data/destinations';

interface DestinationModalProps {
  destination: Destination | null;
  onClose: () => void;
}

export function DestinationModal({ destination, onClose }: DestinationModalProps) {
  if (!destination) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-80">
          <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="text-lg">{destination.country}</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{destination.name}</h2>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span className="font-semibold">{destination.rating} Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Best: {destination.season}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-bold text-2xl">${destination.price}</span>
            </div>
          </div>
          <p className="text-gray-700 text-lg mb-6">{destination.description}</p>
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-3">Activities</h3>
            <div className="flex flex-wrap gap-2">
              {destination.activities.map((activity) => (
                <span key={activity} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full capitalize">
                  {activity}
                </span>
              ))}
            </div>
          </div>
          <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
