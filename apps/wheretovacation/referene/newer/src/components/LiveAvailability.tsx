import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface LiveAvailabilityProps {
  captainId: string;
  charterId: string;
  onBook: (date: Date) => void;
}

export default function LiveAvailability({ captainId, charterId, onBook }: LiveAvailabilityProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadAvailability();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('availability-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `captain_id=eq.${captainId}` },
        () => loadAvailability()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [captainId]);

  const loadAvailability = async () => {
    try {
      const { data } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'get', captainId }
      });

      if (data) {
        setBookedDates(data.bookings.map((b: any) => new Date(b.booking_date)));
        setUnavailableDates(
          data.availability
            .filter((a: any) => a.status === 'unavailable')
            .map((a: any) => new Date(a.date))
        );
      }
    } catch (error: any) {
      console.error('Failed to load availability:', error);
    }
  };

  const checkAvailability = async (date: Date) => {
    setChecking(true);
    setAvailable(null);
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'check', captainId, date: dateStr }
      });

      setAvailable(data.available);
      
      if (!data.available) {
        toast.error('This date is not available');
      }
    } catch (error: any) {
      toast.error('Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    checkAvailability(date);
  };

  const handleBook = () => {
    if (selectedDate && available) {
      onBook(selectedDate);
    }
  };

  const isDateDisabled = (date: Date) => {
    return bookedDates.some(d => d.toDateString() === date.toDateString()) ||
           unavailableDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={isDateDisabled}
          className="rounded-md border"
        />

        {selectedDate && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {checking ? (
                <Clock className="h-5 w-5 animate-spin text-blue-500" />
              ) : available === true ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : available === false ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : null}
              
              <span className="font-medium">
                {checking ? 'Checking...' : 
                 available === true ? 'Available' : 
                 available === false ? 'Not Available' : ''}
              </span>
            </div>

            {available && (
              <Button onClick={handleBook} className="w-full">
                Book This Date
              </Button>
            )}
          </div>
        )}

        <div className="text-sm space-y-1 text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Booked/Unavailable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}