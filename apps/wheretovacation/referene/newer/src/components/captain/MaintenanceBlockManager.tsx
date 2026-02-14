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
      const { data } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('captain_id', captainId)
        .order('start_date');

      if (data) setBlocks(data);
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const addBlock = async () => {
    if (!startDate || !endDate || !reason) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('availability-manager', {
        body: {
          action: 'blockDates',
          captainId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          reason,
          type
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        if (data.conflictDates) {
          toast.error(`Conflicts on: ${data.conflictDates.join(', ')}`);
        }
        return;
      }

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
      const { error } = await supabase.functions.invoke('availability-manager', {
        body: { action: 'unblockDates', captainId, blockedId: id }
      });

      if (error) throw error;
      toast.success('Block removed');
      loadBlocks();
    } catch (error) {
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