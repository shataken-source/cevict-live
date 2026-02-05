import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Mail, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const presetAmounts = [50, 100, 250, 500];

export default function GiftCardPurchase() {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!recipientEmail || !recipientName || !senderName) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'gift_card',
          amount: customAmount ? parseFloat(customAmount) : amount,
          recipientEmail,
          recipientName,
          senderName,
          message,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process gift card purchase.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-blue-600" />
            Purchase Gift Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Select Amount</Label>
            <div className="grid grid-cols-4 gap-3 mt-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset && !customAmount ? 'default' : 'outline'}
                  onClick={() => { setAmount(preset); setCustomAmount(''); }}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <div className="mt-3">
              <Label>Custom Amount</Label>
              <Input
                type="number"
                placeholder="Enter custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="25"
                max="5000"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Recipient Name *</Label>
              <Input
                placeholder="Who is this gift for?"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div>
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>Your Name *</Label>
              <Input
                placeholder="Your name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>

            <div>
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Delivery Details
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Gift card delivered via email instantly</li>
              <li>• Valid for 1 year from purchase date</li>
              <li>• Can be used for any charter booking</li>
              <li>• Transferable to other users</li>
            </ul>
          </div>

          <Button onClick={handlePurchase} disabled={loading} className="w-full" size="lg">
            <CreditCard className="w-5 h-5 mr-2" />
            {loading ? 'Processing...' : `Purchase $${customAmount || amount} Gift Card`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
