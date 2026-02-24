import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CharterGrid from '@/components/CharterGrid';
import { MapPin, Star, Ship, DollarSign } from 'lucide-react';

export default function LocationLanding() {
  const { location } = useParams<{ location: string }>();
  
  const locationData: any = {
    'florida': { name: 'Florida', description: 'Experience world-class fishing in the Sunshine State', charters: 156, avgPrice: 450 },
    'texas': { name: 'Texas', description: 'Gulf Coast fishing adventures in the Lone Star State', charters: 89, avgPrice: 380 },
    'alabama': { name: 'Alabama', description: 'Discover pristine waters and abundant marine life', charters: 45, avgPrice: 350 },
    'mississippi': { name: 'Mississippi', description: 'Southern hospitality meets exceptional fishing', charters: 32, avgPrice: 320 },
    'louisiana': { name: 'Louisiana', description: 'Bayou fishing and offshore adventures', charters: 67, avgPrice: 400 }
  };

  const loc = locationData[location || 'florida'] || locationData.florida;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Charter Fishing in {loc.name}</h1>
          <p className="text-xl text-blue-100 mb-8">{loc.description}</p>
          <div className="flex justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2"><Ship className="w-6 h-6" /><span>{loc.charters} Charters</span></div>
            <div className="flex items-center gap-2"><Star className="w-6 h-6" /><span>4.8 Avg Rating</span></div>
            <div className="flex items-center gap-2"><DollarSign className="w-6 h-6" /><span>From ${loc.avgPrice}</span></div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Available Charters in {loc.name}</h2>
          <CharterGrid />
        </div>

        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Why Book a Charter in {loc.name}?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div><h3 className="font-bold mb-2">Expert Captains</h3><p className="text-gray-600">USCG licensed professionals</p></div>
            <div><h3 className="font-bold mb-2">Top Equipment</h3><p className="text-gray-600">Premium gear included</p></div>
            <div><h3 className="font-bold mb-2">Best Spots</h3><p className="text-gray-600">Local knowledge guaranteed</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
