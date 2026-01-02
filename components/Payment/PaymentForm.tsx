'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loadStripe } from '@stripe/stripe-js';
import { Bitcoin, Check, Coins, CreditCard, Lock } from 'lucide-react';
import { useState } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  description: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: ['Access to all state laws', 'Basic search functionality', 'Email support'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 19.99,
    features: ['Everything in Basic', 'Advanced search & filters', 'Law comparison tool', 'Priority support', 'Mobile app access'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    features: ['Everything in Pro', 'API access', 'Custom reports', 'Dedicated support', 'Team collaboration'],
    popular: false,
  },
];

export default function PaymentForm({ amount, description, onSuccess, onError }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto_btc' | 'crypto_eth' | null>(null);
  const [cryptoCharge, setCryptoCharge] = useState<any>(null);

  const handlePayment = async (paymentType: 'one-time' | 'subscription') => {
    setLoading(true);

    try {
      if (paymentType === 'subscription') {
        // Create subscription checkout session
        const response = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: selectedPlan.id,
            customerEmail: email,
            type: 'subscription',
          }),
        });

        const { sessionId, url } = await response.json();

        if (url) {
          window.location.href = url;
        }
      } else {
        // Create one-time payment
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: selectedPlan.price,
            currency: 'usd',
            metadata: {
              plan: selectedPlan.id,
              email: email,
            },
          }),
        });

        const { client_secret } = await response.json();

        const stripe = await stripePromise;

        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error } = await stripe.confirmPayment({
          clientSecret: client_secret,
          confirmParams: {
            return_url: `${window.location.origin}/payment/success`,
            receipt_email: email,
          },
        });

        if (error) {
          onError?.(error.message || 'Payment failed');
        } else {
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError?.('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoPayment = async (currency: 'BTC' | 'ETH') => {
    setLoading(true);
    setPaymentMethod(`crypto_${currency.toLowerCase()}` as any);

    try {
      const response = await fetch('/api/payments/crypto/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPlan.price,
          currency,
          description: `${selectedPlan.name} Plan - ${description}`,
          metadata: {
            plan: selectedPlan.id,
            email: email,
          },
          planId: selectedPlan.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create crypto payment');
      }

      const data = await response.json();
      setCryptoCharge(data.charge);

      // Poll for payment status
      const chargeId = data.charge.id;
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/payments/crypto/status?chargeId=${chargeId}`);
          const statusData = await statusResponse.json();

          if (statusData.status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            onSuccess?.();
          } else if (statusData.status.status === 'EXPIRED' || statusData.status.status === 'FAILED') {
            clearInterval(pollInterval);
            onError?.('Payment expired or failed');
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 10000); // Check every 10 seconds

      // Clear interval after 30 minutes (payment expires)
      setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
    } catch (error: any) {
      console.error('Crypto payment error:', error);
      onError?.(error.message || 'Failed to create crypto payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-slate-600">
          Unlock premium features and support our mission for civil liberties
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative cursor-pointer transition-all ${
              selectedPlan.id === plan.id
                ? 'ring-2 ring-blue-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500">Most Popular</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="text-3xl font-bold text-slate-900">
                ${plan.price}
                <span className="text-sm font-normal text-slate-600">/month</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={selectedPlan.id === plan.id ? 'default' : 'outline'}
              >
                {selectedPlan.id === plan.id ? 'Selected' : 'Select Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Complete Your Subscription
          </CardTitle>
          <CardDescription>
            Secure payment powered by Stripe
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{selectedPlan.name} Plan</span>
              <span className="font-bold">${selectedPlan.price}/month</span>
            </div>
            <div className="text-sm text-slate-600">
              Billed monthly. Cancel anytime.
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCryptoPayment('BTC')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === 'crypto_btc'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Bitcoin className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Bitcoin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCryptoPayment('ETH')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentMethod === 'crypto_eth'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Coins className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Ethereum</span>
                </button>
              </div>
            </div>

            {/* Crypto Payment Display */}
            {cryptoCharge && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                <h4 className="font-bold mb-3">Crypto Payment Instructions</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Send {cryptoCharge.amount.amount} {cryptoCharge.amount.currency} to:</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={cryptoCharge.address}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(cryptoCharge.address);
                          alert('Address copied!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded">
                    ⚠️ Send exactly {cryptoCharge.amount.amount} {cryptoCharge.amount.currency}. Payment expires in 30 minutes.
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => window.open(cryptoCharge.hosted_url, '_blank')}
                  >
                    Open Payment Page
                  </Button>
                </div>
              </div>
            )}

            {/* Stripe Payment Buttons */}
            {paymentMethod === 'stripe' && (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handlePayment('subscription')}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Subscribe Now
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handlePayment('one-time')}
                  disabled={loading || !email}
                >
                  Pay Once
                </Button>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 text-center">
            <p>🔒 Secure payment. Your data is protected.</p>
            <p>30-day money-back guarantee.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
