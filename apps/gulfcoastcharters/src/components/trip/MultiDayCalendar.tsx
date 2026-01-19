import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addDays, differenceInDays } from 'date-fns';

interface MultiDayCalendarProps {
  onDatesSelected: (startDate: Date, endDate: Date, days: number) => void;
  captainId?: string;
}

export default function MultiDayCalendar({ onDatesSelected }: MultiDayCalendarProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(undefined);
    } else {
      if (date > startDate) {
        setEndDate(date);
      } else {
        setStartDate(date);
        setEndDate(undefined);
      }
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      const days = differenceInDays(endDate, startDate) + 1;
      onDatesSelected(startDate, endDate, days);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Select Trip Dates</h3>
      <Calendar
        mode="single"
        selected={startDate}
        onSelect={handleSelect}
        disabled={(date) => date < new Date()}
        className="rounded-md border"
      />
      <div className="mt-4 space-y-2">
        {startDate && (
          <p className="text-sm">Start: {startDate.toLocaleDateString()}</p>
        )}
        {endDate && (
          <p className="text-sm">End: {endDate.toLocaleDateString()}</p>
        )}
        {startDate && endDate && (
          <p className="text-sm font-semibold">
            Total: {differenceInDays(endDate, startDate) + 1} days
          </p>
        )}
      </div>
      <Button
        onClick={handleConfirm}
        disabled={!startDate || !endDate}
        className="w-full mt-4"
      >
        Confirm Dates
      </Button>
    </Card>
  );
}
