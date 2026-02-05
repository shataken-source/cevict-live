import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, DollarSign, Lock } from 'lucide-react';

interface TimeSlot {
  time: string;
  capacity: number;
  booked: number;
  price?: number;
  available: boolean;
}

export default function RealTimeAvailabilityCalendar({ captainId, mode = 'manage' }: { 
  captainId: string;
  mode?: 'manage' | 'view';
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) loadAvailability(selectedDate);
    loadBlockedDates();

    // Real-time subscription (only if tables exist)
    const channel = supabase
      .channel('availability-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'calendar_availability', filter: `captain_id=eq.${captainId}` },
        () => selectedDate && loadAvailability(selectedDate)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [captainId, selectedDate]);

  const loadAvailability = async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(`/api/captain/availability?date=${dateStr}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load availability');
      }

      const defaultSlots = ['6:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'];
      const availability = result.availability || result.slots || [];
      
      const slots: TimeSlot[] = defaultSlots.map(time => {
        const slot = availability.find((s: any) => {
          const slotTime = s.time_slot || s.start_time;
          return slotTime && time.includes(slotTime.split(':')[0]);
        });
        return {
          time,
          capacity: slot?.max_passengers || 6,
          booked: slot?.current_passengers || 0,
          price: slot?.price || null,
          available: !slot || (slot.status === 'available' && (slot.current_passengers || 0) < (slot.max_passengers || 6))
        };
      });

      setTimeSlots(slots);
    } catch (error: any) {
      console.error('Failed to load availability:', error);
      // Set default slots if API fails
      const defaultSlots = ['6:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'];
      setTimeSlots(defaultSlots.map(time => ({
        time,
        capacity: 6,
        booked: 0,
        price: undefined,
        available: true
      })));
    }
  };

  const loadBlockedDates = async () => {
    try {
      // Try to get blocked dates from availability API (status='blocked')
      const response = await fetch(`/api/captain/availability?status=blocked`);
      const result = await response.json();

      if (result.success && result.availability) {
        const dates: Date[] = [];
        result.availability.forEach((block: any) => {
          if (block.date) {
            dates.push(new Date(block.date));
          }
        });
        setBlockedDates(dates);
      }
    } catch (error) {
      // blocked_dates table doesn't exist - that's okay, just log and continue
      console.log('Blocked dates not available:', error);
      setBlockedDates([]);
    }
  };

  const updateTimeSlot = async (time: string, capacity: number, price?: number) => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const [hours, minutes] = time.replace(/[APM]/g, '').split(':').map(Number);
      const isPM = time.includes('PM') && hours !== 12;
      const hour24 = isPM ? hours + 12 : (hours === 12 && time.includes('AM') ? 0 : hours);
      const startTime = `${String(hour24).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`;

      const response = await fetch('/api/captain/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            date: selectedDate.toISOString().split('T')[0],
            time_slot: 'custom',
            start_time: startTime,
            max_passengers: capacity,
            price: price || null,
            status: 'available',
          },
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update time slot');
      }
      
      toast.success('Time slot updated');
      loadAvailability(selectedDate);
    } catch (error: any) {
      console.error('Failed to update time slot:', error);
      toast.error('Failed to update time slot');
    } finally {
      setLoading(false);
    }
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {mode === 'manage' ? 'Manage Availability' : 'View Availability'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={mode === 'view' ? isDateBlocked : undefined}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>Blocked/Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Available</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Slots for {selectedDate?.toLocaleDateString()}
            </h3>
            
            {timeSlots.map((slot) => (
              <Card key={slot.time} className={!slot.available ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{slot.time}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.booked}/{slot.capacity} booked
                      </div>
                    </div>
                    <Badge variant={slot.available ? 'default' : 'destructive'}>
                      {slot.available ? 'Available' : 'Full'}
                    </Badge>
                  </div>
                  
                  {mode === 'manage' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <Label className="text-xs">Capacity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={slot.capacity}
                          onChange={(e) => updateTimeSlot(slot.time, parseInt(e.target.value), slot.price)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price</Label>
                        <Input
                          type="number"
                          placeholder="Default"
                          value={slot.price || ''}
                          onChange={(e) => updateTimeSlot(slot.time, slot.capacity, parseFloat(e.target.value))}
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                  
                  {mode === 'view' && slot.price && (
                    <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-green-600">
                      <DollarSign className="h-4 w-4" />
                      {slot.price}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}