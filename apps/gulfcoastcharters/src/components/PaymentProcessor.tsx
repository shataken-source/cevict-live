import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Shield, Lock } from "lucide-react";

interface PaymentProcessorProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentProcessor({ bookingId, amount, onSuccess }: PaymentProcessorProps) {
  const [loading, setLoading] = useState(false);

  const handleSecurePayment = async () => {
    setLoading(true);

    try {
      // Create Stripe Checkout session — card data is handled entirely by Stripe (PCI compliant)
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          bookingId,
          amount,
          successUrl: `${window.location.origin}/payment-success?booking=${bookingId}`,
          cancelUrl: window.location.href,
          metadata: { bookingId },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Payment Details
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
        <div className="pt-4 border-t">
          <div className="flex justify-between mb-4">
            <span className="font-semibold">Total:</span>
            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          </div>
          <Button onClick={handleSecurePayment} className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? "Processing..." : `Pay $${amount.toFixed(2)} Securely`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
