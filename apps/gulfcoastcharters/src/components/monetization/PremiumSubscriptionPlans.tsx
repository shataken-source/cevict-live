import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    icon: Star,
    color: 'text-gray-600',
    features: [
      'List your charter',
      '12% platform commission',
      'Basic profile',
      'Standard support',
      'Up to 5 photos'
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 49,
    icon: Zap,
    color: 'text-blue-600',
    popular: true,
    features: [
      'Everything in Basic',
      '8% platform commission',
      'Featured in search results',
      'Priority support',
      'Unlimited photos',
      'Custom booking page',
      'Analytics dashboard'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 149,
    icon: Crown,
    color: 'text-purple-600',
    features: [
      'Everything in Pro',
      '5% platform commission',
      'Top placement guarantee',
      'Dedicated account manager',
      'Video listings',
      'Advanced analytics',
      'Marketing tools',
      'API access'
    ]
  }
];

export function PremiumSubscriptionPlans({ currentPlan = 'basic' }: { currentPlan?: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planId: string, price: number) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create checkout session
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId: user.id })
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = currentPlan === plan.id;
        
        return (
          <Card key={plan.id} className={plan.popular ? 'border-blue-600 border-2' : ''}>
            {plan.popular && (
              <div className="bg-blue-600 text-white text-center py-1 text-sm font-medium">
                Most Popular
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <Icon className={`h-8 w-8 ${plan.color}`} />
                {isCurrent && <Badge>Current Plan</Badge>}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                disabled={isCurrent || loading === plan.id}
                onClick={() => handleSubscribe(plan.id, plan.price)}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {isCurrent ? 'Current Plan' : loading === plan.id ? 'Processing...' : 'Upgrade Now'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
