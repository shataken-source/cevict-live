import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface PriceAlertButtonProps {
  charterId: string;
  charterName: string;
  currentPrice: number;
}

export default function PriceAlertButton({ charterId, charterName, currentPrice }: PriceAlertButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSetAlert = async () => {
    const price = parseFloat(targetPrice);
    if (!price || price >= currentPrice) {
      toast({ title: 'Invalid Price', description: 'Target price must be lower than current price.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Sign In Required', description: 'Please sign in to set price alerts.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('price_alerts').insert({
        user_id: user.id,
        charter_id: charterId,
        charter_name: charterName,
        target_price: price,
        current_price: currentPrice,
      });

      if (error) throw error;

      toast({ title: 'Alert Set!', description: `You'll be notified when price drops to $${price}` });
      setIsOpen(false);
      setTargetPrice('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to set price alert.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Bell className="w-4 h-4 mr-2" />
        Set Price Alert
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Get notified when the price for <span className="font-semibold">{charterName}</span> drops below your target.
              </p>
              <p className="text-sm font-semibold mb-2">Current Price: ${currentPrice}</p>
            </div>
            <div>
              <Label>Target Price</Label>
              <Input
                type="number"
                placeholder="Enter target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                max={currentPrice - 1}
              />
              <p className="text-xs text-gray-500 mt-1">Must be lower than current price</p>
            </div>
            <Button onClick={handleSetAlert} disabled={loading} className="w-full">
              {loading ? 'Setting Alert...' : 'Set Alert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
