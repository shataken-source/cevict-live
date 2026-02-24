import { useState, useEffect } from 'react';
import { Property, Booking } from '@/types';
import { BlockedDate } from '@/types/host';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';

interface ExternalBooking {
  id: string;
  property_id: string;
  platform: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface UnifiedCalendarProps {
  properties: Property[];
  bookings: Booking[];
  blockedDates: BlockedDate[];
  onMoveBooking: (bookingId: string, newStartDate: Date, newEndDate: Date) => void;
  onBlockDates: (propertyIds: string[], startDate: Date, endDate: Date) => void;
}

export function UnifiedCalendar({ properties, bookings, blockedDates, onMoveBooking, onBlockDates }: UnifiedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [bulkBlockMode, setBulkBlockMode] = useState(false);
  const [bulkBlockStart, setBulkBlockStart] = useState<Date | null>(null);
  const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>([]);

  useEffect(() => {
    loadExternalBookings();
  }, [properties]);

  const loadExternalBookings = async () => {
    if (properties.length === 0) return;
    const { data } = await supabase.from('external_bookings').select('*').in('property_id', properties.map(p => p.id));
    if (data) setExternalBookings(data);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = [];
    for (let d = new Date(year, month, 1); d <= new Date(year, month + 1, 0); d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const days = getDaysInMonth();

  const getBookingForDate = (propertyId: string, date: Date) => {
    const regular = bookings.find(b => b.property_id === propertyId && new Date(b.check_in) <= date && new Date(b.check_out) >= date);
    const external = externalBookings.find(b => b.property_id === propertyId && new Date(b.check_in) <= date && new Date(b.check_out) >= date);
    return regular || external;
  };

  const isDateBlocked = (propertyId: string, date: Date) => {
    return blockedDates.some(bd => bd.property_id === propertyId && new Date(bd.start_date) <= date && new Date(bd.end_date) >= date);
  };

  const getStatusColor = (status: string) => {
    return status === 'confirmed' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-red-500';
  };

  const handleDrop = (propertyId: string, date: Date) => {
    if (draggedBooking && draggedBooking.property_id === propertyId) {
      const duration = Math.ceil((new Date(draggedBooking.check_out).getTime() - new Date(draggedBooking.check_in).getTime()) / (1000 * 60 * 60 * 24));
      const newEndDate = new Date(date);
      newEndDate.setDate(newEndDate.getDate() + duration);
      onMoveBooking(draggedBooking.id, date, newEndDate);
    }
    setDraggedBooking(null);
  };

  const handleDateClick = (propertyId: string, date: Date) => {
    if (bulkBlockMode) {
      if (!bulkBlockStart) setBulkBlockStart(date);
      else {
        onBlockDates(selectedProperties.length > 0 ? selectedProperties : [propertyId], bulkBlockStart, date);
        setBulkBlockStart(null);
        setBulkBlockMode(false);
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant={bulkBlockMode ? "default" : "outline"} onClick={() => setBulkBlockMode(!bulkBlockMode)}>
          <Lock className="h-4 w-4 mr-2" />Bulk Block
        </Button>
      </div>

      {bulkBlockMode && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Select properties:</p>
          <div className="flex flex-wrap gap-4">
            {properties.map(prop => (
              <label key={prop.id} className="flex items-center gap-2">
                <Checkbox checked={selectedProperties.includes(prop.id)} onCheckedChange={(checked) => {
                  setSelectedProperties(checked ? [...selectedProperties, prop.id] : selectedProperties.filter(id => id !== prop.id));
                }} />
                <span className="text-sm">{prop.title}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">Click start date, then end date</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(40px,1fr))] gap-1">
            <div className="font-semibold p-2">Property</div>
            {days.map((day, i) => (
              <div key={i} className="text-center text-xs p-1 font-medium">{day.getDate()}</div>
            ))}

            {properties.map(property => (
              <>
                <div key={property.id} className="p-2 border-t font-medium text-sm truncate">{property.title}</div>
                {days.map((day, i) => {
                  const booking = getBookingForDate(property.id, day);
                  const blocked = isDateBlocked(property.id, day);
                  const isStart = booking && new Date(booking.check_in).toDateString() === day.toDateString();
                  const isExternal = booking && 'platform' in booking;
                  
                  return (
                    <div key={i} className={`border-t p-1 min-h-[40px] cursor-pointer hover:bg-gray-50 ${bulkBlockStart?.toDateString() === day.toDateString() ? 'ring-2 ring-blue-500' : ''}`}
                      onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(property.id, day)} onClick={() => handleDateClick(property.id, day)}>
                      {blocked && <div className="bg-gray-300 h-full flex items-center justify-center"><Lock className="h-3 w-3" /></div>}
                      {booking && isStart && (
                        <div draggable={!isExternal} onDragStart={() => !isExternal && setDraggedBooking(booking as Booking)}
                          className={`${getStatusColor(booking.status)} ${isExternal ? 'bg-blue-500' : ''} text-white text-xs p-1 rounded ${!isExternal ? 'cursor-move' : ''}`}>
                          {isExternal && '🔗'}{booking.guest_name?.substring(0, 6)}
                        </div>
                      )}
                      {booking && !isStart && !blocked && <div className={`${getStatusColor(booking.status)} ${isExternal ? 'bg-blue-500' : ''} h-full`}></div>}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div>Confirmed</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div>Pending</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div>External</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-300 rounded"></div>Blocked</div>
      </div>
    </Card>
  );
}