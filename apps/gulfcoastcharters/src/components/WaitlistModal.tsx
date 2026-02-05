import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  charterId: string;
  charterName: string;
  userId?: string;
}

export function WaitlistModal({ isOpen, onClose, charterId, charterName, userId }: WaitlistModalProps) {
  const [date, setDate] = useState<Date>();
  const [partySize, setPartySize] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to join the waitlist',
        variant: 'destructive'
      });
      return;
    }

    if (!date || !partySize || !email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('waitlist-manager', {
        body: {
          action: 'join',
          userId,
          charterId,
          requestedDate: date.toISOString().split('T')[0],
          partySize: parseInt(partySize),
          email,
          phone
        }
      });

      if (error) throw error;

      toast({
        title: 'Added to Waitlist!',
        description: "We'll notify you if a spot opens up for your requested date."
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join waitlist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Join Waitlist - {charterName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Requested Date *</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          <div>
            <Label htmlFor="partySize">Party Size *</Label>
            <Input
              id="partySize"
              type="number"
              min="1"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Joining...' : 'Join Waitlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
