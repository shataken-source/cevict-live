import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

interface BookingCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charter: any;
  onDateRangeSelect: (start: Date, end: Date) => void;
  unavailableDates?: Date[];
  onUnavailableDatesChange?: (dates: Date[]) => void;
  isManagementMode?: boolean;
}

export default function BookingCalendar({
  open,
  onOpenChange,
  charter,
  onDateRangeSelect,
  unavailableDates = [],
  onUnavailableDatesChange,
  isManagementMode = false,
}: BookingCalendarProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedUnavailable, setSelectedUnavailable] = useState<Date[]>(unavailableDates);

  const isDateUnavailable = (date: Date) => {
    return selectedUnavailable.some(d => 
      d.toDateString() === date.toDateString()
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isManagementMode) {
      // Toggle unavailable dates
      const isAlreadyUnavailable = isDateUnavailable(date);
      let newDates;
      if (isAlreadyUnavailable) {
        newDates = selectedUnavailable.filter(d => d.toDateString() !== date.toDateString());
      } else {
        newDates = [...selectedUnavailable, date];
      }
      setSelectedUnavailable(newDates);
    } else {
      // Booking mode
      if (!startDate || (startDate && endDate)) {
        setStartDate(date);
        setEndDate(undefined);
      } else if (date > startDate) {
        setEndDate(date);
      } else {
        setStartDate(date);
        setEndDate(undefined);
      }
    }
  };

  const handleSave = () => {
    if (isManagementMode && onUnavailableDatesChange) {
      onUnavailableDatesChange(selectedUnavailable);
      onOpenChange(false);
    } else if (startDate && endDate) {
      onDateRangeSelect(startDate, endDate);
      setStartDate(undefined);
      setEndDate(undefined);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isManagementMode ? 'Manage Availability' : 'Select Booking Dates'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleDateSelect}
            disabled={(date) => !isManagementMode && isDateUnavailable(date)}
            className="rounded-md border"
            modifiers={{
              unavailable: (date) => isDateUnavailable(date)
            }}
            modifiersStyles={{
              unavailable: { backgroundColor: '#fee', textDecoration: 'line-through' }
            }}
          />
          {!isManagementMode && (
            <div className="space-y-2">
              {startDate && <p className="text-sm">Start: {startDate.toLocaleDateString()}</p>}
              {endDate && <p className="text-sm">End: {endDate.toLocaleDateString()}</p>}
            </div>
          )}
          {isManagementMode && (
            <p className="text-sm text-gray-600">
              Click dates to mark as unavailable (red). Click again to make available.
            </p>
          )}
          <Button onClick={handleSave} disabled={!isManagementMode && (!startDate || !endDate)} className="w-full">
            {isManagementMode ? 'Save Availability' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
