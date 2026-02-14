import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TimeSlot {
  time: string;
  capacity: number;
  booked: number;
  available: boolean;
  spotsLeft: number;
}

interface TimeSlotSelectorProps {
  date: Date | undefined;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  captainId: string;
}

export default function TimeSlotSelector({ date, selectedTime, onTimeSelect, captainId }: TimeSlotSelectorProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (date && captainId) {
      fetchAvailability();
    }
  }, [date, captainId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      // Check if date is blocked
      const { data: blockCheck } = await supabase.functions.invoke('availability-manager', {
        body: { 
          action: 'check', 
          captainId, 
          date: date?.toISOString().split('T')[0] 
        }
      });

      if (blockCheck?.blocked?.length > 0) {
        setIsBlocked(true);
        setSlots([]);
        setLoading(false);
        return;
      }

      // Fetch time slot availability with real-time booking data
      const { data } = await supabase.functions.invoke('availability-manager', {
        body: { 
          action: 'get', 
          captainId, 
          date: date?.toISOString() 
        }
      });

      if (data?.slots) {
        const formattedSlots = data.slots.map((slot: any) => ({
          time: slot.time,
          capacity: slot.capacity,
          booked: slot.booked,
          available: slot.booked < slot.capacity,
          spotsLeft: slot.capacity - slot.booked
        }));
        setSlots(formattedSlots);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    }
    setLoading(false);
  };

  if (!date) {
    return <p className="text-gray-500 text-center py-4">Please select a date first</p>;
  }

  if (loading) {
    return <p className="text-center py-4">Loading real-time availability...</p>;
  }

  if (isBlocked) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
        <p className="text-gray-600">This date is not available. Please select another date.</p>
      </div>
    );
  }

  const getSlotColor = (slot: TimeSlot) => {
    if (!slot.available) return 'border-red-300 bg-red-50';
    const percentFull = (slot.booked / slot.capacity) * 100;
    if (percentFull >= 75) return 'border-orange-300 bg-orange-50';
    if (percentFull >= 50) return 'border-yellow-300 bg-yellow-50';
    return 'border-green-300 bg-green-50';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {slots.map(slot => (
        <Card
          key={slot.time}
          className={`p-4 cursor-pointer transition ${
            !slot.available ? 'opacity-50 cursor-not-allowed' : 
            selectedTime === slot.time ? 'border-blue-500 bg-blue-100' : getSlotColor(slot)
          } hover:shadow-md`}
          onClick={() => slot.available && onTimeSelect(slot.time)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{slot.time}</span>
          </div>
          {slot.available ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="w-3 h-3" />
                <span>{slot.spotsLeft} spots left</span>
              </div>
              {slot.spotsLeft <= 2 && (
                <Badge variant="destructive" className="text-xs">Almost Full!</Badge>
              )}
            </div>
          ) : (
            <Badge variant="destructive" className="text-xs">Fully Booked</Badge>
          )}
        </Card>
      ))}
    </div>
  );
}

