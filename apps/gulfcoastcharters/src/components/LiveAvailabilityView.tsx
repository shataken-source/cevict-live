import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Clock, Users, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TimeSlot {
  time: string;
  capacity: number;
  booked: number;
  price?: number;
  available: boolean;
}

export default function LiveAvailabilityView({ 
  captainId, 
  onSelectSlot 
}: { 
  captainId: string;
  onSelectSlot?: (date: Date, timeSlot: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate) loadAvailability(selectedDate);
    loadBlockedDates();

    // Real-time updates
    const channel = supabase
      .channel('live-availability')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'captain_availability_slots', filter: `captain_id=eq.${captainId}` },
        () => selectedDate && loadAvailability(selectedDate)
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `captain_id=eq.${captainId}` },
        () => selectedDate && loadAvailability(selectedDate)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [captainId, selectedDate]);

  const loadAvailability = async (date: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'getAvailability', captainId, date: date.toISOString().split('T')[0] }
      });

      if (error) throw error;

      const defaultSlots = ['6:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'];
      const slots: TimeSlot[] = defaultSlots.map(time => {
        const slot = data.slots?.find((s: any) => s.time_slot === time);
        return {
          time,
          capacity: slot?.capacity || 6,
          booked: slot?.booked_count || 0,
          price: slot?.custom_price || null,
          available: !slot || slot.booked_count < slot.capacity
        };
      });

      setTimeSlots(slots);
    } catch (error: any) {
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedDates = async () => {
    try {
      // Use availability API endpoint instead of direct table query
      const response = await fetch(`/api/captain/availability?status=blocked`);
      const result = await response.json();
      
      if (result.success && result.availability) {
        const dates: Date[] = [];
        result.availability.forEach((block: any) => {
          if (block.date) {
            dates.push(new Date(block.date));
          } else if (block.start_date && block.end_date) {
            const start = new Date(block.start_date);
            const end = new Date(block.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              dates.push(new Date(d));
            }
          }
        });
        setBlockedDates(dates);
      } else {
        setBlockedDates([]);
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error);
      setBlockedDates([]);
    }
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(d => d.toDateString() === date.toDateString());
  };

  const handleSelectSlot = (timeSlot: string) => {
    if (!selectedDate) return;
    setSelectedSlot(timeSlot);
    if (onSelectSlot) {
      onSelectSlot(selectedDate, timeSlot);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Availability</CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time availability updates • Select a date and time slot
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || isDateBlocked(date)}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                <span>Available</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date'}
            </h3>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No availability for this date
              </div>
            ) : (
              timeSlots.map((slot) => (
                <Card 
                  key={slot.time}
                  className={`cursor-pointer transition-all ${
                    selectedSlot === slot.time ? 'ring-2 ring-purple-500' : ''
                  } ${!slot.available ? 'opacity-60' : 'hover:shadow-md'}`}
                  onClick={() => slot.available && handleSelectSlot(slot.time)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">{slot.time}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {slot.capacity - slot.booked} spots left
                          </div>
                          {slot.price && (
                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                              <DollarSign className="h-3 w-3" />
                              {slot.price}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={slot.available ? 'default' : 'destructive'} className="flex items-center gap-1">
                        {slot.available ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Available
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Full
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {selectedSlot && (
              <Button className="w-full" size="lg">
                Book {selectedSlot}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}