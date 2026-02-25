/**
 * Post-Trip Tipping Component
 * Allows customers to tip captains and crew after trips
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign, Users, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PostTripTippingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    booking_id: string;
    total_price?: number;
    price?: number;
    trip_type?: string;
  };
  crew?: Array<{ id: string; name: string; type: 'captain' | 'crew' }>;
  onSuccess?: () => void;
}

export default function PostTripTipping({
  open,
  onOpenChange,
  booking,
  crew = [],
  onSuccess
}: PostTripTippingProps) {
  const [loading, setLoading] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'captain_majority' | 'custom'>('equal');

  const tripCost = booking.total_price || booking.price || 0;
  const suggestedAmounts = [
    { label: '10%', value: tripCost * 0.10 },
    { label: '15%', value: tripCost * 0.15 },
    { label: '20%', value: tripCost * 0.20 },
    { label: '25%', value: tripCost * 0.25 }
  ];

  const calculateTip = (percentage: number) => {
    const amount = tripCost * (percentage / 100);
    setTipAmount(amount.toFixed(2));
    setTipPercentage(percentage);
    setCustomAmount('');
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : parseFloat(tipAmount || '0');
  const finalPercentage = tipPercentage || (tripCost > 0 ? (finalAmount / tripCost) * 100 : 0);

  const handleSubmit = async () => {
    if (finalAmount <= 0) {
      toast.error('Please enter a tip amount');
      return;
    }

    setLoading(true);

    try {
      // Calculate crew split
      let crewSplit: any[] = [];
      if (crew.length > 0) {
        if (splitMethod === 'equal') {
          const perPerson = finalAmount / crew.length;
          crewSplit = crew.map(member => ({
            recipientId: member.id,
            recipientType: member.type,
            amount: perPerson,
            percentage: 100 / crew.length
          }));
        } else if (splitMethod === 'captain_majority') {
          const captain = crew.find(c => c.type === 'captain');
          const crewMembers = crew.filter(c => c.type === 'crew');
          if (captain) {
            crewSplit.push({
              recipientId: captain.id,
              recipientType: 'captain',
              amount: finalAmount * 0.7,
              percentage: 70
            });
            if (crewMembers.length > 0) {
              const crewAmount = finalAmount * 0.3 / crewMembers.length;
              crewMembers.forEach(member => {
                crewSplit.push({
                  recipientId: member.id,
                  recipientType: 'crew',
                  amount: crewAmount,
                  percentage: 30 / crewMembers.length
                });
              });
            }
          }
        }
      }

      const response = await fetch('/api/tips/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Enable test mode if on test page (dev only)
          ...(import.meta.env.DEV && window.location.pathname === '/test-tip' ? { 'x-test-mode': 'true' } : {})
        },
        body: JSON.stringify({
          bookingId: booking.booking_id,
          amount: finalAmount,
          percentage: finalPercentage,
          customerMessage: message,
          crewSplit: crewSplit.length > 0 ? crewSplit : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit tip');
      }

      // If payment is required, create Stripe Checkout Session
      if (data.requiresPayment) {
        try {
          // Get user email for checkout
          const { data: { user: authUser } } = await supabase.auth.getUser();

          // Call Next.js API route instead of Edge Function directly (avoids CORS)
          const checkoutResponse = await fetch('/api/tips/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tipId: data.tip.tip_id,
              amount: finalAmount,
              bookingId: booking.booking_id,
              customerEmail: authUser?.email || 'customer@example.com',
              successUrl: `${window.location.origin}/payment-success?type=tip&tipId=${data.tip.tip_id}`,
              cancelUrl: `${window.location.origin}?tipCancelled=true&tipId=${data.tip.tip_id}`,
              metadata: {
                tip_id: data.tip.tip_id,
                booking_id: booking.booking_id,
                type: 'tip',
              },
            }),
          });

          const checkoutData = await checkoutResponse.json();

          if (!checkoutResponse.ok) {
            throw new Error(checkoutData.error || 'Failed to create checkout session');
          }

          if (checkoutData.url) {
            // Redirect to Stripe Checkout
            window.location.href = checkoutData.url;
            return;
          } else {
            throw new Error('No checkout URL returned');
          }
        } catch (checkoutErr: any) {
          console.error('Checkout error:', checkoutErr);
          toast.error('Payment setup failed. Please try again.');
          // Don't close dialog so user can retry
          return;
        }
      }

      // If no payment required (Stripe not configured or payment already processed)
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success('Tip submitted successfully!');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit tip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Add a Tip
          </DialogTitle>
          <DialogDescription>
            Show your appreciation for an amazing trip! Tips are greatly appreciated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Trip Cost:</span>
                <span className="font-semibold text-lg">${tripCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Suggested Tip Amount</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {suggestedAmounts.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  variant="outline"
                  onClick={() => calculateTip(parseFloat(suggestion.label.replace('%', '')))}
                  className={tipPercentage === parseFloat(suggestion.label.replace('%', '')) ? 'border-blue-600 bg-blue-50' : ''}
                >
                  {suggestion.label}
                  <br />
                  <span className="text-xs">${suggestion.value.toFixed(0)}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="customAmount">Or Enter Custom Amount</Label>
            <div className="flex items-center gap-2 mt-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <Input
                id="customAmount"
                type="number"
                min="0"
                step="0.01"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  if (e.target.value) {
                    setTipAmount(e.target.value);
                    setTipPercentage(null);
                  }
                }}
                placeholder="Enter amount"
              />
            </div>
          </div>

          {crew.length > 1 && (
            <div>
              <Label>Tip Distribution</Label>
              <div className="space-y-2 mt-2">
                <Button
                  variant={splitMethod === 'equal' ? 'default' : 'outline'}
                  onClick={() => setSplitMethod('equal')}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Equal Split ({crew.length} people)
                </Button>
                <Button
                  variant={splitMethod === 'captain_majority' ? 'default' : 'outline'}
                  onClick={() => setSplitMethod('captain_majority')}
                  className="w-full"
                >
                  Captain 70% / Crew 30%
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Thanks for an amazing day!"
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Tip Amount:</span>
              <span className="text-xl font-bold text-blue-600">
                ${finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold">
                ${(tripCost + finalAmount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || finalAmount <= 0}>
              {loading ? 'Processing...' : 'Submit Tip'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
