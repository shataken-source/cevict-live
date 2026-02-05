import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import TimeSlotCapacityEditor from './TimeSlotCapacityEditor';
import BlockedDatesManager from './BlockedDatesManager';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface TimeSlot {
  time: string;
  capacity: number;
  booked: number;
}

interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'maintenance' | 'personal' | 'other';
}

export default function CaptainAvailabilityManager({ captainId }: { captainId: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { time: '6:00 AM', capacity: 6, booked: 0 },
    { time: '10:00 AM', capacity: 6, booked: 0 },
    { time: '2:00 PM', capacity: 6, booked: 0 },
    { time: '6:00 PM', capacity: 6, booked: 0 },
  ]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailability();
    loadBlockedDates();
  }, [captainId]);

  const loadAvailability = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/captain/availability?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.slots) {
        setTimeSlots(result.slots);
      } else if (result.success && result.availability) {
        // Convert availability data to time slots format if needed
        setTimeSlots(result.availability);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  };

  const loadBlockedDates = async () => {
    try {
      const response = await fetch('/api/captain/availability?status=blocked');
      const result = await response.json();
      
      if (result.success && result.availability) {
        // Convert availability to blocked dates format
        const blocked = result.availability
          .filter((a: any) => a.status === 'blocked')
          .map((a: any) => ({
            date: a.date,
            reason: a.notes || 'Blocked',
          }));
        setBlockedDates(blocked);
      }
    } catch (err) {
      console.error('Error loading blocked dates:', err);
    }
  };

  const saveCapacities = async (slots: TimeSlot[]) => {
    setLoading(true);
    try {
      if (!selectedDate) {
        toast({ title: 'Please select a date', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Create/update availability for each time slot
      const promises = slots.map(slot => {
        const [hours, minutes] = slot.time.split(':');
        const startTime = `${hours}:${minutes}:00`;
        
        return fetch('/api/captain/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            data: {
              date: selectedDate.toISOString().split('T')[0],
              time_slot: 'custom',
              start_time: startTime,
              max_passengers: slot.capacity,
              status: slot.booked >= slot.capacity ? 'booked' : 'available',
            },
          }),
        });
      });

      await Promise.all(promises);
      setTimeSlots(slots);
      toast({ title: 'Capacities updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const addBlockedDate = async (blocked: Omit<BlockedDate, 'id'>) => {
    try {
      const { data, error } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'blockDates', captainId, ...blocked }
      });
      if (data?.blocked) {
        setBlockedDates([...blockedDates, data.blocked]);
        toast({ title: 'Dates blocked successfully' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const removeBlockedDate = async (id: string) => {
    try {
      await supabase.functions.invoke('availability-manager', {
        body: { action: 'unblockDates', captainId, blockedId: id }
      });
      setBlockedDates(blockedDates.filter(b => b.id !== id));
      toast({ title: 'Block removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const hasCapacityWarning = timeSlots.some(slot => 
    (slot.booked / slot.capacity) >= 0.75
  );

  return (
    <div className="space-y-6">
      {hasCapacityWarning && (
        <Alert className="border-orange-500">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            You're approaching capacity limits on some time slots. Consider increasing capacity or blocking dates.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Select Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </Card>

        {selectedDate && (
          <TimeSlotCapacityEditor
            date={selectedDate}
            slots={timeSlots}
            onSave={saveCapacities}
          />
        )}
      </div>

      <BlockedDatesManager
        blockedDates={blockedDates}
        onAdd={addBlockedDate}
        onRemove={removeBlockedDate}
      />
    </div>
  );
}
