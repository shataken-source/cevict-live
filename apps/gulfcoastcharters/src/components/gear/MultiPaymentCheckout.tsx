import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MultiPaymentCheckoutProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSuccess: () => void;
}

export default function MultiPaymentCheckout({ open, onClose, total, onSuccess }: MultiPaymentCheckoutProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const finalTotal = total - discount;

  const applyPromoCode = () => {
    const codes: Record<string, number> = {
      'SAVE10': total * 0.1,
      'SAVE20': total * 0.2,
      'FREESHIP': 15,
      'WELCOME': 25
    };
    
    if (codes[promoCode.toUpperCase()]) {
      setDiscount(codes[promoCode.toUpperCase()]);
      toast({ title: "Promo applied!", description: `Saved $${codes[promoCode.toUpperCase()].toFixed(2)}` });
    } else {
      toast({ title: "Invalid code", variant: "destructive" });
    }
  };

  const processPayment = async () => {
    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    toast({ title: "Payment successful!", description: "Order confirmed" });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <Label className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4" />
              Promo Code
            </Label>
            <div className="flex gap-2">
              <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
              <Button onClick={applyPromoCode} variant="outline">Apply</Button>
            </div>
          </div>

          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="credit-card">Card</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
              <TabsTrigger value="venmo">Venmo</TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
              <TabsTrigger value="gift-card">Gift</TabsTrigger>
            </TabsList>

            <TabsContent value="credit-card" className="space-y-4">
              <div><Label>Card Number</Label><Input placeholder="1234 5678 9012 3456" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Expiry</Label><Input placeholder="MM/YY" /></div>
                <div><Label>CVV</Label><Input placeholder="123" /></div>
              </div>
            </TabsContent>

            <TabsContent value="paypal" className="text-center py-8">
              <div className="text-blue-600 font-bold text-2xl mb-4">PayPal</div>
              <p className="text-gray-600 mb-4">Redirecting to PayPal</p>
              <Button className="bg-blue-600">Continue with PayPal</Button>
            </TabsContent>

            <TabsContent value="venmo" className="text-center py-8">
              <div className="text-cyan-600 font-bold text-2xl mb-4">Venmo</div>
              <p className="text-gray-600 mb-4">Redirecting to Venmo</p>
              <Button className="bg-cyan-600">Continue with Venmo</Button>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div><Label>Account Number</Label><Input placeholder="Enter account" /></div>
              <div><Label>Routing Number</Label><Input placeholder="Enter routing" /></div>
              <div><Label>Type</Label><select className="w-full p-2 border rounded"><option>Checking</option><option>Savings</option></select></div>
            </TabsContent>

            <TabsContent value="gift-card" className="space-y-4">
              <div><Label className="flex items-center gap-2"><Gift className="w-4 h-4" />Gift Card</Label><Input placeholder="Card number" /></div>
              <div><Label>PIN</Label><Input placeholder="PIN" type="password" /></div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between"><span>Subtotal:</span><span>${total.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount:</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-xl font-bold"><span>Total:</span><span className="text-blue-600">${finalTotal.toFixed(2)}</span></div>
          </div>

          <Button onClick={processPayment} disabled={processing} className="w-full" size="lg">
            {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Pay $${finalTotal.toFixed(2)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
