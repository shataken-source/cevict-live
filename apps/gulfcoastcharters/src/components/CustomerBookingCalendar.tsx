import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    if (!captainId) {
      setLoading(false);
      return;
    }
    loadAvailability();
  }, [captainId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];

      const res = await fetch(
        `/api/calendar/availability?captainId=${encodeURIComponent(captainId)}&startDate=${startStr}&endDate=${endStr}`
      );
      if (!res.ok) throw new Error('Failed to load availability');

      const data = await res.json();
      const slots: Array<{ date: string; status: string }> = data.availability || [];

      // Disable dates that have no available slot (all booked/blocked/hold)
      const dateStatus = new Map<string, boolean>();
      for (const s of slots) {
        const hadAvailable = dateStatus.get(s.date);
        const isAvailable = s.status === 'available';
        dateStatus.set(s.date, hadAvailable === true || isAvailable);
      }
      const disabled: Date[] = [];
      const todayStr = today.toISOString().split('T')[0];
      for (let i = 0; i < 31; i++) {
        const d = new Date(startOfMonth);
        d.setDate(d.getDate() + i);
        if (d > endOfMonth) break;
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr < todayStr) disabled.push(new Date(d));
        else if (dateStatus.get(dateStr) === false) disabled.push(new Date(d));
      }
      setDisabledDates(disabled);
    } catch (error: any) {
      toast.error('Failed to load availability');
      setDisabledDates([]);
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
