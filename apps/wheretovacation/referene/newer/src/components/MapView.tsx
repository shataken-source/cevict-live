import { useState } from 'react';
import { MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapViewProps {
  destinations: any[];
  onDestinationClick: (dest: any) => void;
}

export default function MapView({ destinations, onDestinationClick }: MapViewProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  
  const regions = ['All', 'Americas', 'Europe', 'Asia', 'Africa', 'Oceania'];

  const filteredDests = selectedRegion === 'all' 
    ? destinations 
    : destinations.filter(d => d.region?.toLowerCase() === selectedRegion.toLowerCase());

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-600" />
          Interactive Map View
        </h3>
        <div className="flex gap-2">
          {regions.map(region => (
            <Button key={region} size="sm" 
              variant={selectedRegion === region.toLowerCase() ? 'default' : 'outline'}
              onClick={() => setSelectedRegion(region.toLowerCase())}>
              {region}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative bg-white rounded-lg p-8 min-h-[500px] border-2 border-blue-200">
        <div className="grid grid-cols-3 gap-6">
          {filteredDests.map((dest, idx) => (
            <div key={idx} 
              className="flex flex-col items-center p-4 hover:bg-blue-50 rounded-lg cursor-pointer transition"
              onClick={() => onDestinationClick(dest)}>
              <MapPin className="w-8 h-8 text-red-500 mb-2" />
              <span className="font-semibold text-center">{dest.name}</span>
              <span className="text-sm text-gray-500">{dest.country}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}