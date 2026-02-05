import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Calendar, CreditCard } from 'lucide-react';
import EmailSubscriptionPlans from './EmailSubscriptionPlans';

interface Subscription {
  plan: string;
  billing_cycle: string;
  status: string;
  period_end: string;
  cancel_at_period_end: boolean;
}

export default function SubscriptionManager({ customEmailId }: { customEmailId: string }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscription();
  }, [customEmailId]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_emails')
        .select('metadata')
        .eq('id', customEmailId)
        .single();

      if (error) throw error;
      if (data?.metadata?.subscription) {
        setSubscription(data.metadata.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (planId: string, cycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'email_subscription',
          plan: planId,
          billing_cycle: cycle,
          custom_email_id: customEmailId,
        },
      });

      if (error) throw error;
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel subscription? You\'ll keep access until the end of the billing period.')) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'cancel_subscription',
          custom_email_id: customEmailId,
        },
      });

      if (error) throw error;
      toast({ title: 'Subscription cancelled', description: 'Access continues until period end' });
      loadSubscription();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (showPlans) {
    return (
      <div>
        <Button variant="outline" onClick={() => setShowPlans(false)} className="mb-4">
          Back
        </Button>
        <EmailSubscriptionPlans currentPlan={subscription?.plan} onSelectPlan={handlePlanSelect} />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Subscription Management</h3>
      
      {subscription ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{subscription.plan.toUpperCase()} Plan</p>
              <p className="text-sm text-gray-600">{subscription.billing_cycle} billing</p>
            </div>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
              {subscription.status}
            </Badge>
          </div>

          {subscription.cancel_at_period_end && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Subscription will cancel on {new Date(subscription.period_end).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Renews: {new Date(subscription.period_end).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowPlans(true)}>Change Plan</Button>
            {!subscription.cancel_at_period_end && (
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">No active subscription</p>
          <Button onClick={() => setShowPlans(true)}>View Plans</Button>
        </div>
      )}
    </Card>
  );
}