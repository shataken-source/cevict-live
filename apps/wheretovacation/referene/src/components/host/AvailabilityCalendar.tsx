import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockedDate } from '@/types/host';
import { X } from 'lucide-react';

interface AvailabilityCalendarProps {
  propertyId: string;
  blockedDates: BlockedDate[];
  onBlockDates: (startDate: Date, endDate: Date, reason: string) => void;
  onUnblockDates: (blockedDateId: string) => void;
}

export function AvailabilityCalendar({ propertyId, blockedDates, onBlockDates, onUnblockDates }: AvailabilityCalendarProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [reason, setReason] = useState('');

  const handleBlockDates = () => {
    if (dateRange.from && dateRange.to) {
      onBlockDates(dateRange.from, dateRange.to, reason);
      setDateRange({});
      setReason('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Block Dates</Label>
          <Input 
            placeholder="Reason (optional)" 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button onClick={handleBlockDates} disabled={!dateRange.from || !dateRange.to}>
            Block Selected Dates
          </Button>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Blocked Periods</h4>
          <div className="space-y-2">
            {blockedDates.map((blocked) => (
              <div key={blocked.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(blocked.start_date).toLocaleDateString()} - {new Date(blocked.end_date).toLocaleDateString()}
                  </p>
                  {blocked.reason && <p className="text-xs text-muted-foreground">{blocked.reason}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => onUnblockDates(blocked.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
