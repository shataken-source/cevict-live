import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Loader2, Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface MultiPaymentCheckoutProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSuccess: () => void;
}

export default function MultiPaymentCheckout({ open, onClose, total, onSuccess }: MultiPaymentCheckoutProps) {
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoValidated, setPromoValidated] = useState(false);
  const { toast } = useToast();

  const finalTotal = Math.max(0, total - discount);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    try {
      // Validate promo code server-side
      const { data, error } = await supabase.functions.invoke('validate-promo', {
        body: { code: promoCode, orderTotal: total }
      });
      if (error) throw error;
      if (data?.valid && data?.discount) {
        setDiscount(data.discount);
        setPromoValidated(true);
        toast({ title: "Promo applied!", description: `Saved $${data.discount.toFixed(2)}` });
      } else {
        toast({ title: "Invalid code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not validate code", variant: "destructive" });
    }
  };

  const processPayment = async () => {
    setProcessing(true);
    try {
      // Create Stripe Checkout session — PCI compliant, no raw card data
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'gear_purchase',
          amount: finalTotal,
          promoCode: promoValidated ? promoCode : undefined,
          successUrl: `${window.location.origin}/gear/order-success`,
          cancelUrl: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message || 'Please try again', variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Complete Your Purchase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <Lock className="w-4 h-4" />
              <span className="font-semibold text-sm">PCI-DSS Compliant</span>
            </div>
            <p className="text-sm text-green-700">
              Payment is processed securely through Stripe. We never store your card details.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4" />
              Promo Code
            </Label>
            <div className="flex gap-2">
              <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
              <Button onClick={applyPromoCode} variant="outline">Apply</Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between"><span>Subtotal:</span><span>${total.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount:</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-xl font-bold"><span>Total:</span><span className="text-blue-600">${finalTotal.toFixed(2)}</span></div>
          </div>

          <Button onClick={processPayment} disabled={processing} className="w-full bg-green-600 hover:bg-green-700" size="lg">
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Pay $${finalTotal.toFixed(2)} Securely`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
