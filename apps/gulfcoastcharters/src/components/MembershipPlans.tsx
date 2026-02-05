import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MembershipPlansProps {
  userType: 'user' | 'captain';
}

export default function MembershipPlans({ userType }: MembershipPlansProps) {
  const [plans, setPlans] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase.functions.invoke('membership-manager', {
      body: { action: 'getPlans' }
    });
    if (data?.plans) setPlans(data.plans);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to subscribe');
        return;
      }

      const { data } = await supabase.functions.invoke('membership-manager', {
        body: {
          action: 'createCheckout',
          userId: user.id,
          planType: userType,
          subscriptionType: billingCycle
        }
      });

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!plans) return null;

  const plan = plans[userType];
  const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
  const savings = billingCycle === 'yearly' ? ((plan.monthly * 12) - plan.yearly).toFixed(2) : 0;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>
          Unlock premium features and grow your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center gap-2">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge className="ml-2" variant="secondary">Save 15%</Badge>
          </Button>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold">${price}</div>
          <div className="text-muted-foreground">
            per {billingCycle === 'yearly' ? 'year' : 'month'}
          </div>
          {billingCycle === 'yearly' && (
            <div className="text-sm text-green-600 mt-2">
              Save ${savings} per year!
            </div>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Subscribe Now'}
        </Button>
      </CardContent>
    </Card>
  );
}