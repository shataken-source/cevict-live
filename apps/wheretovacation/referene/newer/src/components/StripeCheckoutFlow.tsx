import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
  bookingData: any;
  onSuccess: () => void;
}

function CheckoutForm({ bookingData, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? 'Processing...' : `Pay $${(bookingData.totalAmount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}

export default function StripeCheckoutFlow({ bookingData, onSuccess }: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const initPayment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: { bookingData, userId: user?.id },
        });

        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    };
    initPayment();
  }, [bookingData, toast]);

  if (!clientSecret) return <div>Loading payment...</div>;

  return (
    <Card className="p-6">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm bookingData={bookingData} onSuccess={onSuccess} />
      </Elements>
    </Card>
  );
}