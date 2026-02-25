import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CreditCard, Lock } from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  listing: any;
  amount: number;
  buyerId: string;
  onSuccess: () => void;
}

export default function PaymentModal({ open, onClose, listing, amount, buyerId, onSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: ''
  });

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Create Stripe Checkout session — server validates amount and handles payment
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'marketplace_purchase',
          listingId: listing.id,
          buyerId,
          sellerId: listing.seller_id,
          shippingAddress,
          successUrl: `${window.location.origin}/marketplace/purchase-success?listing=${listing.id}`,
          cancelUrl: window.location.href,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Purchase</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{listing.title}</h3>
            <p className="text-2xl font-bold text-blue-600">${amount}</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Shipping Address</h3>

            <div>
              <Label>Full Name</Label>
              <Input
                value={shippingAddress.name}
                onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Input
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={shippingAddress.phone}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Lock className="w-4 h-4" />
              <span>Secure payment powered by Stripe</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={loading || !shippingAddress.name || !shippingAddress.address}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : `Pay $${amount}`}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By completing this purchase, you agree to our terms of service and refund policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
