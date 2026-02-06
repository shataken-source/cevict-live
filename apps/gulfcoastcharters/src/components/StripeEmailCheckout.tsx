import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StripeEmailCheckoutProps {
  open: boolean;
  onClose: () => void;
  emailAddress: string;
  amount: number;
  userType: 'captain' | 'customer';
  onSuccess: () => void;
}

export default function StripeEmailCheckout({ 
  open, 
  onClose, 
  emailAddress, 
  amount,
  userType,
  onSuccess 
}: StripeEmailCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'custom_email',
          email: emailAddress,
          amount,
          user_id: user.id,
          user_type: userType,
          successUrl: `${window.location.origin}/payment-success?type=email`,
          cancelUrl: window.location.href
        }
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={emailAddress} disabled />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={`$${amount.toFixed(2)} USD`} disabled />
          </div>
          <Button 
            onClick={handleCheckout} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><CreditCard className="mr-2 h-4 w-4" /> Pay with Stripe</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}