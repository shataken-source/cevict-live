import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PayPalCheckoutProps {
  amount: number;
  items: any[];
  onSuccess: () => void;
}

export default function PayPalCheckout({ amount, items, onSuccess }: PayPalCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'}&currency=USD`;
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const createOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('paypal-create-order', {
        body: { amount, items }
      });

      if (error) throw error;
      return data.orderID;
    } catch (error: any) {
      toast.error('Failed to create PayPal order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async (data: any) => {
    try {
      const { error } = await supabase.functions.invoke('paypal-capture-order', {
        body: { orderID: data.orderID }
      });

      if (error) throw error;
      toast.success('Payment successful!');
      onSuccess();
    } catch (error: any) {
      toast.error('Payment failed');
    }
  };

  useEffect(() => {
    if (paypalLoaded && (window as any).paypal) {
      (window as any).paypal.Buttons({
        createOrder,
        onApprove,
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }
      }).render('#paypal-button-container');
    }
  }, [paypalLoaded]);

  return (
    <div>
      <div id="paypal-button-container" className="mt-4"></div>
      {loading && <p className="text-center text-sm text-gray-600">Processing...</p>}
    </div>
  );
}
