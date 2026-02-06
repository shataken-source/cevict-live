/**
 * Gift Cards Page
 * 
 * Route: /gift-cards
 * Gift card purchase and management
 */

import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { 
  Gift, CreditCard, DollarSign, Calendar, 
  Mail, CheckCircle, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

const giftCardAmounts = [50, 100, 150, 200, 250, 500];

export default function GiftCardsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
  const isValidAmount = finalAmount >= 25 && finalAmount <= 1000;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidAmount) {
      toast.error('Please enter an amount between $25 and $1000');
      return;
    }

    if (!recipientName || !recipientEmail || !senderName || !senderEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          recipientName,
          recipientEmail,
          senderName,
          senderEmail,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process gift card purchase');
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Gift card purchase error:', error);
      toast.error(error.message || 'Failed to process gift card purchase. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gift className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold">Gift Cards</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Give the gift of adventure! Perfect for any fishing enthusiast.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Purchase Form */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase a Gift Card</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePurchase} className="space-y-6">
                {/* Amount Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Amount</Label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {giftCardAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount('');
                        }}
                        className={`p-4 border-2 rounded-lg text-center transition-colors ${
                          selectedAmount === amount && !customAmount
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                        <span className="font-semibold">${amount}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Or enter custom amount:</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="25"
                        max="1000"
                        step="1"
                        placeholder="Custom amount"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          if (e.target.value) setSelectedAmount(0);
                        }}
                      />
                    </div>
                  </div>
                  {customAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Amount must be between $25 and $1000
                    </p>
                  )}
                </div>

                {/* Recipient Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Recipient Information</h3>
                  <div>
                    <Label htmlFor="recipientName">Recipient Name *</Label>
                    <Input
                      id="recipientName"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Enter recipient's name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientEmail">Recipient Email *</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="recipient@email.com"
                    />
                  </div>
                </div>

                {/* Sender Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Information</h3>
                  <div>
                    <Label htmlFor="senderName">Your Name *</Label>
                    <Input
                      id="senderName"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="senderEmail">Your Email *</Label>
                    <Input
                      id="senderEmail"
                      type="email"
                      required
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a personal message to your gift card..."
                  />
                </div>

                {/* Total */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${isValidAmount ? finalAmount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Purchase Button */}
                <Button 
                  type="submit" 
                  disabled={loading || !isValidAmount}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    'Processing...'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Purchase Gift Card
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Information Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Purchase Your Gift Card</h4>
                    <p className="text-sm text-gray-600">
                      Choose an amount and complete your purchase securely.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Gift Card Delivered</h4>
                    <p className="text-sm text-gray-600">
                      The recipient receives their gift card via email instantly.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Redeem & Book</h4>
                    <p className="text-sm text-gray-600">
                      Recipient can use the gift card code when booking any charter.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>• Gift cards never expire</p>
                <p>• Can be used for any charter booking</p>
                <p>• Cannot be redeemed for cash</p>
                <p>• Can be combined with other gift cards</p>
                <p>• Minimum purchase: $25</p>
                <p>• Maximum purchase: $1,000</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6" />
                  <h3 className="font-semibold text-lg">Perfect Gift</h3>
                </div>
                <p className="text-blue-100">
                  Give the gift of adventure! Our gift cards are perfect for birthdays, 
                  holidays, or any special occasion.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
