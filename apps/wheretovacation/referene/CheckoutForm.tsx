import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface CheckoutFormProps {
  bookingId: string;
  amount: number;
  propertyName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CheckoutForm({ bookingId, amount, propertyName, onSuccess, onCancel }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create payment intent
      const { data: intentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount, currency: 'usd', bookingId, propertyName },
      });

      if (intentError) throw intentError;

      // Simulate payment processing (in production, use Stripe Elements)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm payment
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId: intentData.paymentIntentId, bookingId },
      });

      if (confirmError) throw confirmError;

      if (confirmData.success) {
        onSuccess();
      } else {
        throw new Error('Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="cardNumber">Card Number</Label>
        <Input
          id="cardNumber"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expiry">Expiry</Label>
          <Input
            id="expiry"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="cvc">CVC</Label>
          <Input
            id="cvc"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : `Pay $${amount}`}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
