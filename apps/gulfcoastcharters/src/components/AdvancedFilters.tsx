import { useState } from 'react';
import { Calendar, DollarSign, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AdvancedFiltersProps {
  onFilterChange: (filters: any) => void;
}

export default function AdvancedFilters({ onFilterChange }: AdvancedFiltersProps) {
  const [budget, setBudget] = useState([1000, 5000]);
  const [travelers, setTravelers] = useState(2);
  const [travelerType, setTravelerType] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<any>(null);

  const activities = ['Beach', 'Adventure', 'Culture', 'Food', 'Wildlife', 'Luxury'];
  const types = ['Solo', 'Couple', 'Family', 'Group'];

  const handleApply = () => {
    onFilterChange({ budget, travelers, travelerType, selectedActivities, dateRange });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      <div>
        <label className="flex items-center gap-2 font-semibold mb-3">
          <DollarSign className="w-5 h-5" /> Budget Range
        </label>
        <Slider value={budget} onValueChange={setBudget} min={500} max={10000} step={100} />
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>${budget[0]}</span><span>${budget[1]}</span>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 font-semibold mb-3">
          <Users className="w-5 h-5" /> Travelers: {travelers}
        </label>
        <Slider
          value={[travelers]}
          onValueChange={(values: number[]) => {
            const v = values[0] ?? travelers;
            setTravelers(v);
          }}
          min={1}
          max={10}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 font-semibold mb-3">
          <Tag className="w-5 h-5" /> Traveler Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {types.map(type => (
            <Button key={type} variant={travelerType === type ? 'default' : 'outline'} 
              onClick={() => setTravelerType(type)}>{type}</Button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-semibold mb-3 block">Activities</label>
        <div className="flex flex-wrap gap-2">
          {activities.map(act => (
            <Button key={act} size="sm" variant={selectedActivities.includes(act) ? 'default' : 'outline'}
              onClick={() => setSelectedActivities(prev => 
                prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
              )}>{act}</Button>
          ))}
        </div>
      </div>

      <Button onClick={handleApply} className="w-full">Apply Filters</Button>
    </div>
  );
}