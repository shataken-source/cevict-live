import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DealAlertSubscription() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save to localStorage for now
      const existingSubscribers = JSON.parse(localStorage.getItem('dealAlertSubscribers') || '[]');
      if (!existingSubscribers.includes(email)) {
        existingSubscribers.push(email);
        localStorage.setItem('dealAlertSubscribers', JSON.stringify(existingSubscribers));
      }

      // Save user preference
      localStorage.setItem('dealAlertPreferences', JSON.stringify({
        emailEnabled: true,
        email: email,
        subscribedAt: new Date().toISOString()
      }));

      setSubscribed(true);
      toast({
        title: 'Subscribed!',
        description: "You'll receive alerts when new last-minute deals are posted."
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to subscribe. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">You're subscribed!</p>
            <p className="text-sm text-green-700">We'll notify you about new deals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Never Miss a Deal!
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Get instant alerts when captains post last-minute deals in your area
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}