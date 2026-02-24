import { Heart, Trash2 } from 'lucide-react';
import { Destination } from '@/data/destinations';

interface TripPlannerProps {
  savedDestinations: Destination[];
  onRemove: (id: number) => void;
}

export function TripPlanner({ savedDestinations, onRemove }: TripPlannerProps) {
  if (savedDestinations.length === 0) return null;

  const totalCost = savedDestinations.reduce((sum, dest) => sum + dest.price, 0);

  return (
    <section className="py-16 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          <h2 className="text-4xl font-bold">Your Trip Planner</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {savedDestinations.map((dest) => (
            <div key={dest.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
              <img src={dest.image} alt={dest.name} className="w-full h-40 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{dest.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{dest.country}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-bold">${dest.price}</span>
                  <button
                    onClick={() => onRemove(dest.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-bold">Total Estimated Cost:</span>
            <span className="text-3xl font-bold text-blue-600">${totalCost.toLocaleString()}</span>
          </div>
          <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition">
            Start Planning Your Trip
          </button>
        </div>
      </div>
    </section>
  );
}
