import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  type: string;
}

export default function MaintenanceBlockManager({ captainId }: { captainId: string }) {
  const [blocks, setBlocks] = useState<BlockedDate[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [type, setType] = useState('maintenance');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBlocks();
  }, [captainId]);

  const loadBlocks = async () => {
    try {
      // Use availability API endpoint instead of direct table query
      const response = await fetch(`/api/captain/availability?status=blocked`);
      const result = await response.json();
      
      if (result.success && result.availability) {
        // Convert availability records to blocked dates format
        const blocked = result.availability
          .filter((a: any) => a.status === 'blocked')
          .map((a: any) => ({
            id: a.id || Date.now().toString(),
            start_date: a.date || a.start_date,
            end_date: a.end_date || a.date,
            reason: a.notes || a.reason || 'Blocked',
            type: a.type || 'maintenance'
          }));
        setBlocks(blocked);
      } else {
        setBlocks([]);
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
      setBlocks([]);
    }
  };

  const addBlock = async () => {
    if (!startDate || !endDate || !reason) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Use availability API endpoint to block dates
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Block each date in the range
      const datesToBlock: string[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        datesToBlock.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create blocked availability for each date
      const promises = datesToBlock.map(date => 
        fetch('/api/captain/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            data: {
              date,
              status: 'blocked',
              notes: reason,
              type
            }
          })
        })
      );

      await Promise.all(promises);
      
      toast.success('Dates blocked successfully');
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setType('maintenance');
      loadBlocks();
    } catch (error: any) {
      toast.error('Failed to block dates');
    } finally {
      setLoading(false);
    }
  };

  const removeBlock = async (id: string) => {
    try {
      // Use availability API endpoint to unblock dates (id in query string)
      const response = await fetch(`/api/captain/availability?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove block');
      }
      
      toast.success('Block removed');
      loadBlocks();
    } catch (error: any) {
      toast.error('Failed to remove block');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Block Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                className="rounded-md border"
              />
            </div>
          </div>

          <div>
            <Label>Block Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="personal">Personal Time</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g., Boat maintenance, vacation, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button onClick={addBlock} disabled={loading} className="w-full">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Block Dates
          </Button>

          <p className="text-sm text-muted-foreground">
            Note: Cannot block dates with existing confirmed bookings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked dates</p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={block.type === 'maintenance' ? 'destructive' : 'secondary'}>
                        {block.type}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(block.start_date).toLocaleDateString()} - {new Date(block.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {block.reason}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlock(block.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}