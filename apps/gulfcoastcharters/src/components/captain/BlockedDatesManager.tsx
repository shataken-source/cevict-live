import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: 'maintenance' | 'personal' | 'other';
}

interface BlockedDatesManagerProps {
  blockedDates: BlockedDate[];
  onAdd: (blocked: Omit<BlockedDate, 'id'>) => void;
  onRemove: (id: string) => void;
}

export default function BlockedDatesManager({ blockedDates, onAdd, onRemove }: BlockedDatesManagerProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'maintenance' | 'personal' | 'other'>('personal');

  const handleAdd = () => {
    if (startDate && endDate) {
      onAdd({ startDate, endDate, reason, type });
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Block Dates</h3>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Boat maintenance, vacation, etc." />
        </div>
        <div>
          <Label>Type</Label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded">
            <option value="maintenance">Maintenance</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Button onClick={handleAdd} className="w-full">Add Blocked Period</Button>
      </div>
      <div className="space-y-2">
        {blockedDates.map((blocked) => (
          <div key={blocked.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <div className="font-medium">{blocked.startDate} to {blocked.endDate}</div>
              <div className="text-sm text-gray-600">{blocked.reason}</div>
              <Badge variant="outline">{blocked.type}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(blocked.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
