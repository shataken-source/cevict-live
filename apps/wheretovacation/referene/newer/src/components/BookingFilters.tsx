import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface BookingFiltersProps {
  onFilterChange: (filters: any) => void;
  captains: { id: string; name: string }[];
  locations: string[];
}

export default function BookingFilters({ onFilterChange, captains, locations }: BookingFiltersProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedCaptain, setSelectedCaptain] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const applyFilters = () => {
    onFilterChange({
      startDate,
      endDate,
      captain: selectedCaptain,
      location: selectedLocation,
      status: selectedStatus
    });
  };

  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCaptain('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    onFilterChange({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5" />
        <h3 className="font-semibold text-lg">Filter Bookings</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'PP') : 'Start Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'PP') : 'End Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
          </PopoverContent>
        </Popover>

        <Select value={selectedCaptain} onValueChange={setSelectedCaptain}>
          <SelectTrigger>
            <SelectValue placeholder="All Captains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Captains</SelectItem>
            {captains.map(captain => (
              <SelectItem key={captain.id} value={captain.id}>{captain.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(location => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={applyFilters}>Apply Filters</Button>
        <Button variant="outline" onClick={resetFilters}>Reset</Button>
      </div>
    </div>
  );
}

