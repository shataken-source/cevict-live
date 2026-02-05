import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CustomerBookingCalendarProps {
  captainId: string;
  onDateSelect: (date: Date | undefined) => void;
  selectedDate?: Date;
}

export default function CustomerBookingCalendar({ 
  captainId, 
  onDateSelect,
  selectedDate 
}: CustomerBookingCalendarProps) {
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [captainId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'get', captainId }
      });

      if (error) throw error;

      // Combine booked dates and unavailable dates
      const bookedDates = data.bookings
        .filter((b: any) => ['confirmed', 'pending'].includes(b.status))
        .map((b: any) => new Date(b.booking_date));
      
      const unavailDates = data.availability
        .filter((a: any) => ['unavailable', 'blocked', 'booked'].includes(a.status))
        .map((a: any) => new Date(a.date));

      setDisabledDates([...bookedDates, ...unavailDates]);
    } catch (error: any) {
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable booked/unavailable dates
    return disabledDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Booking Date</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading availability...</div>
        ) : (
          <>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              className="rounded-md border"
              disabled={isDateDisabled}
            />

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">Available dates are selectable</Badge>
              <Badge variant="secondary">Grayed dates are unavailable</Badge>
            </div>

            {selectedDate && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Selected: {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
