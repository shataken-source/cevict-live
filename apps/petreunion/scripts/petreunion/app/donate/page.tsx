'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CreditCard, DollarSign, Gift, Heart, Shield, TrendingUp, Users } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function DonateNotices() {
  const searchParams = useSearchParams();

  return (
    <>
      {searchParams?.get('success') === '1' && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Thank you for supporting PetReunion!</p>
          <p className="mt-1">Your donation was received successfully.</p>
        </div>
      )}
      {searchParams?.get('canceled') === '1' && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
          <p className="font-semibold">Donation canceled</p>
          <p className="mt-1">No payment was made. You can try again anytime.</p>
        </div>
      )}
    </>
  );
}

export default function DonatePage() {
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUnavailable, setCheckoutUnavailable] = useState(false);

  const presetAmounts = [25, 50, 100, 250, 500];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount && !customAmount) {
      alert('Please select or enter an amount');
      return;
    }

    const donationAmount = customAmount || amount;

    setIsProcessing(true);

    // In a real implementation, you would integrate with a payment processor
    // like Stripe, PayPal, or similar
    try {
      setCheckoutUnavailable(false);

      const res = await fetch('/api/petreunion/donate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: donationAmount,
          donorName,
          donorEmail,
          donorMessage,
          label: 'PetReunion Donation',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.configured === false) {
        setCheckoutUnavailable(true);
        return;
      }

      if (res.ok && data?.configured && typeof data?.url === 'string' && data.url) {
        window.location.href = data.url;
        return;
      }

      alert(data?.error || 'Payment processing failed. Please try again.');
    } catch (error) {
      alert('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Suspense fallback={null}>
          <DonateNotices />
        </Suspense>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full">
              <Heart className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900">Support PetReunion</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your donation helps us reunite lost pets with their families. Every dollar makes a difference.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Impact Stats */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-3xl font-bold text-blue-700">—</div>
                  <div className="text-sm text-blue-600">Pets in Database</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-3xl font-bold text-green-700">—</div>
                  <div className="text-sm text-green-600">Reunited Pets</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-3xl font-bold text-purple-700">100%</div>
                  <div className="text-sm text-purple-600">Free Service</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Donation Form */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                Make a Donation
              </CardTitle>
              <CardDescription>
                Help us keep PetReunion free for everyone
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkoutUnavailable && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Checkout isn’t configured yet.</p>
                  <p className="mt-1">
                    Email{' '}
                    <a className="underline" href="mailto:donate@petreunion.org?subject=Donation%20to%20PetReunion">
                      donate@petreunion.org
                    </a>{' '}
                    and we’ll send you a donation link.
                  </p>
                </div>
              )}
              <form onSubmit={handleDonate} className="space-y-6">
                {/* Preset Amounts */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Amount</Label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {presetAmounts.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={amount === preset.toString() ? 'default' : 'outline'}
                        onClick={() => {
                          setAmount(preset.toString());
                          setCustomAmount('');
                        }}
                        className="h-12"
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="mt-3">
                    <Label htmlFor="customAmount" className="text-sm text-gray-600">
                      Or enter custom amount
                    </Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="customAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setAmount('');
                        }}
                        className="pl-10"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Donor Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="donorName">Your Name (Optional)</Label>
                    <Input
                      id="donorName"
                      type="text"
                      placeholder="John Doe"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="donorEmail">Email (Optional)</Label>
                    <Input
                      id="donorEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="donorMessage">Message (Optional)</Label>
                    <textarea
                      id="donorMessage"
                      placeholder="Leave a message of support..."
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isProcessing || (!amount && !customAmount)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-lg py-6"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Donate Now
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  🔒 Secure payment processing. Your information is safe and encrypted.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Why Donate & Other Ways to Help */}
          <div className="space-y-6">
            {/* Why Donate */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-blue-600" />
                  Why Donate?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Keep it Free:</strong> Your donation ensures PetReunion remains 100% free for pet owners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Expand Coverage:</strong> Help us add more shelters and expand to new areas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Improve Technology:</strong> Fund better matching algorithms and faster searches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>100% to Operations:</strong> 100% of donations go directly to maintaining and improving the website</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Other Ways to Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Other Ways to Help
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/sponsor">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Become a Sponsor
                  </Button>
                </Link>
                <Link href="/report">
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="w-4 h-4 mr-2" />
                    Report a Lost Pet
                  </Button>
                </Link>
                <Link href="/search">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Search for Lost Pets
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Volunteer
                </Button>
              </CardContent>
            </Card>

            {/* Tax Deductible Notice */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tax Deductible:</strong> PetReunion is a registered 501(c)(3) nonprofit organization.
                  Your donations are tax-deductible to the full extent allowed by law.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-lg mb-2">
            <strong>Thank you for supporting PetReunion!</strong>
          </p>
          <p>
            Every donation, no matter the size, helps us reunite more pets with their families.
          </p>
        </div>
      </div>
    </div>
  );
}

