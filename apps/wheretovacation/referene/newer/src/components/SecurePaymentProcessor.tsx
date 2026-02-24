import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { rateLimiter, RATE_LIMITS } from "@/lib/rateLimiter";
import { optimisticBooking } from "@/lib/transactionManager";
import { Shield, Lock } from "lucide-react";

interface SecurePaymentProcessorProps {
  bookingData: any;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SecurePaymentProcessor({ 
  bookingData, 
  amount, 
  onSuccess,
  onCancel 
}: SecurePaymentProcessorProps) {
  const [loading, setLoading] = useState(false);

  const handleSecurePayment = async () => {
    // Rate limiting
    const userKey = `payment_${bookingData.customerEmail}`;
    if (!rateLimiter.limit(userKey, RATE_LIMITS.PAYMENT)) {
      toast.error('Too many payment attempts. Please wait a minute.');
      return;
    }

    setLoading(true);

    try {
      // Create Stripe checkout with optimistic booking
      const booking = await optimisticBooking(
        bookingData.captainId,
        bookingData.date,
        bookingData
      );

      // Create secure Stripe session
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          bookingId: booking.id,
          amount,
          customerEmail: bookingData.customerEmail,
          successUrl: `${window.location.origin}/payment-success?booking=${booking.id}`,
          cancelUrl: window.location.href,
          metadata: {
            bookingId: booking.id,
            captainId: bookingData.captainId,
            date: bookingData.date
          }
        }
      });

      if (error) throw error;

      // Redirect to Stripe (PCI compliant - no card data stored)
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <Lock className="w-4 h-4" />
            <span className="font-semibold">PCI-DSS Compliant</span>
          </div>
          <p className="text-sm text-green-700">
            Your payment is processed securely through Stripe. 
            We never store your card details.
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between mb-4">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSecurePayment} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Processing..." : "Pay Securely"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
