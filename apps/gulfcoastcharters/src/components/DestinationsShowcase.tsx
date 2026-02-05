import { MapPin, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export default function DestinationsShowcase() {
  const destinations = [
    {
      name: 'Destin, FL',
      description: 'World-class deep sea fishing',
      charters: 45,
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    },
    {
      name: 'Gulf Shores, AL',
      description: 'Family-friendly inshore trips',
      charters: 32,
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    },
    {
      name: 'Galveston, TX',
      description: 'Diverse fishing opportunities',
      charters: 38,
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Destinations</h2>
          <p className="text-xl text-gray-600">Explore the best fishing spots along the Gulf Coast</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {destinations.map((dest, index) => (
            <div key={index} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${dest.image})` }}></div>
              <div className="p-6">
                <div className="flex items-center text-blue-600 mb-2">
                  <MapPin className="w-5 h-5 mr-2" />
                  <h3 className="text-xl font-bold">{dest.name}</h3>
                </div>
                <p className="text-gray-600 mb-4">{dest.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{dest.charters} charters</span>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    Explore <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
