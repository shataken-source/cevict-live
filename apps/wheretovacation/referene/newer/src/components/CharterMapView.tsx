import { MapPin, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CharterMapViewProps {
  charters: any[];
  onCharterClick: (charter: any) => void;
}

export default function CharterMapView({ charters, onCharterClick }: CharterMapViewProps) {
  const locations = ['Texas', 'Louisiana', 'Mississippi', 'Alabama', 'Florida'];
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 md:p-8 rounded-xl">
      <div className="flex items-center gap-2 mb-6">
        <Anchor className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl md:text-2xl font-bold">Gulf Coast Map View</h3>
      </div>

      <div className="bg-white rounded-lg p-4 md:p-8 min-h-[400px] md:min-h-[500px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {locations.map((location) => {
            const locationCharters = charters.filter(c => 
              c.location.toLowerCase().includes(location.toLowerCase())
            );
            
            return (
              <div key={location} className="border-2 border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <h4 className="font-bold text-lg">{location}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{locationCharters.length} charters</p>
                <div className="space-y-2">
                  {locationCharters.slice(0, 3).map(charter => (
                    <Button
                      key={charter.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => onCharterClick(charter)}
                    >
                      <span className="truncate">{charter.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
