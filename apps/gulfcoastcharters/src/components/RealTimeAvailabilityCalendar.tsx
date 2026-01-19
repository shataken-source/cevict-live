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

    // Real-time subscription
    const channel = supabase
      .channel('availability-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'captain_availability_slots', filter: `captain_id=eq.${captainId}` },
        () => selectedDate && loadAvailability(selectedDate)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_dates', filter: `captain_id=eq.${captainId}` },
        () => loadBlockedDates()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [captainId, selectedDate]);

  const loadAvailability = async (date: Date) => {
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
    }
  };

  const loadBlockedDates = async () => {
    try {
      const { data } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('captain_id', captainId);

      if (data) {
        const dates: Date[] = [];
        data.forEach((block: any) => {
          const start = new Date(block.start_date);
          const end = new Date(block.end_date);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
          }
        });
        setBlockedDates(dates);
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error);
    }
  };

  const updateTimeSlot = async (time: string, capacity: number, price?: number) => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('availability-manager', {
        body: {
          action: 'setTimeSlot',
          captainId,
          date: selectedDate.toISOString().split('T')[0],
          timeSlot: time,
          capacity,
          customPrice: price || null
        }
      });

      if (error) throw error;
      toast.success('Time slot updated');
      loadAvailability(selectedDate);
    } catch (error: any) {
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