import { useState } from 'react';
import { Search, MapPin, DollarSign, Users, Map, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface EnhancedFilterBarProps {
  onFilterChange: (filters: any) => void;
  onViewChange: (view: 'grid' | 'map') => void;
  currentView: 'grid' | 'map';
}

export default function EnhancedFilterBar({ onFilterChange, onViewChange, currentView }: EnhancedFilterBarProps) {
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [guests, setGuests] = useState(4);
  const [type, setType] = useState('all');

  const handleApplyFilters = () => {
    onFilterChange({ location, priceRange, guests, type });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="City or State"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={2000}
            step={50}
            className="mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Guests: {guests}</label>
          <Slider
            value={[guests]}
            onValueChange={(val) => setGuests(val[0])}
            max={12}
            min={1}
            className="mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="inshore">Inshore</option>
            <option value="offshore">Offshore</option>
            <option value="deep-sea">Deep Sea</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleApplyFilters} className="bg-gradient-to-r from-blue-600 to-cyan-600">
          <Search className="w-4 h-4 mr-2" />
          Apply Filters
        </Button>
        
        <div className="flex gap-2 ml-auto">
          <Button
            variant={currentView === 'grid' ? 'default' : 'outline'}
            onClick={() => onViewChange('grid')}
            size="sm"
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={currentView === 'map' ? 'default' : 'outline'}
            onClick={() => onViewChange('map')}
            size="sm"
          >
            <Map className="w-4 h-4 mr-2" />
            Map
          </Button>
        </div>
      </div>
    </div>
  );
}
