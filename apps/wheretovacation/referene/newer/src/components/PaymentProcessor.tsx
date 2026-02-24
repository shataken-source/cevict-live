import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PaymentProcessorProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export default function PaymentProcessor({ bookingId, amount, onSuccess }: PaymentProcessorProps) {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { bookingId, amount, cardNumber, expiry, cvc, name },
      });

      if (error) throw error;

      await supabase.from("payments").insert({
        booking_id: bookingId,
        amount,
        currency: "usd",
        status: "completed",
        payment_method: "card",
      });

      await supabase.from("bookings").update({ 
        payment_status: "paid",
        status: "confirmed" 
      }).eq("id", bookingId);

      toast.success("Payment processed successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Card Number</label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Expiry</label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">CVC</label>
              <Input
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Cardholder Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between mb-4">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
