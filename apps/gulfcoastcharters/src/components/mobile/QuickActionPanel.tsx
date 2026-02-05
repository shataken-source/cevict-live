import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QuickActionPanelProps {
  bookingId: string;
  onSuccess: () => void;
}

export default function QuickActionPanel({ bookingId, onSuccess }: QuickActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async (action: 'accept' | 'decline') => {
    setLoading(true);
    
    try {
      if (!navigator.onLine) {
        await queueOfflineAction(bookingId, action);
        toast({
          title: 'Action Queued',
          description: 'Will sync when online',
        });
        onSuccess();
        return;
      }

      const { data, error } = await supabase.functions.invoke('booking-manager', {
        body: { action, bookingId }
      });

      if (error) throw error;

      toast({
        title: action === 'accept' ? 'Booking Accepted' : 'Booking Declined',
        description: `Successfully ${action}ed the booking`,
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process action',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const queueOfflineAction = async (id: string, action: string) => {
    const queue = JSON.parse(localStorage.getItem('action_queue') || '[]');
    queue.push({ id, action, timestamp: Date.now() });
    localStorage.setItem('action_queue', JSON.stringify(queue));
  };

  return (
    <div className="flex gap-2 mt-3">
      <Button 
        size="sm" 
        className="flex-1 bg-green-600 hover:bg-green-700"
        onClick={() => handleAction('accept')}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
        Accept
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => handleAction('decline')}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
        Decline
      </Button>
    </div>
  );
}
