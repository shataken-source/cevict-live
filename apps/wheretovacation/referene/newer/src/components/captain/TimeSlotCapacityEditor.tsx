import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimeSlot {
  time: string;
  capacity: number;
  booked: number;
}

interface TimeSlotCapacityEditorProps {
  date: Date;
  slots: TimeSlot[];
  onSave: (slots: TimeSlot[]) => void;
}

export default function TimeSlotCapacityEditor({ date, slots, onSave }: TimeSlotCapacityEditorProps) {
  const [editedSlots, setEditedSlots] = useState<TimeSlot[]>(slots);

  const updateCapacity = (index: number, capacity: number) => {
    const updated = [...editedSlots];
    updated[index].capacity = Math.max(1, capacity);
    setEditedSlots(updated);
  };

  const getAvailabilityColor = (slot: TimeSlot) => {
    const percent = (slot.booked / slot.capacity) * 100;
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 75) return 'bg-orange-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">
        Capacity for {date.toLocaleDateString()}
      </h3>
      <div className="space-y-3">
        {editedSlots.map((slot, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-24 font-medium">{slot.time}</span>
            <div className="flex-1">
              <Label className="text-xs">Max Capacity</Label>
              <Input
                type="number"
                min="1"
                value={slot.capacity}
                onChange={(e) => updateCapacity(idx, parseInt(e.target.value))}
                className="w-20"
              />
            </div>
            <Badge className={getAvailabilityColor(slot)}>
              {slot.booked}/{slot.capacity} booked
            </Badge>
          </div>
        ))}
      </div>
      <Button onClick={() => onSave(editedSlots)} className="mt-4 w-full">
        Save Capacities
      </Button>
    </Card>
  );
}
