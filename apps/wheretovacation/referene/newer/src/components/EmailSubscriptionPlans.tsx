import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  maxAliases: number;
  prioritySupport: boolean;
  customForwarding: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['1 custom email', 'Standard support', 'Basic forwarding'],
    maxAliases: 0,
    prioritySupport: false,
    customForwarding: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    features: ['1 custom email', '3 email aliases', 'Priority support', 'Custom forwarding rules'],
    maxAliases: 3,
    prioritySupport: true,
    customForwarding: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 19.99,
    yearlyPrice: 199,
    features: ['1 custom email', '10 email aliases', 'Priority support', 'Advanced forwarding', 'Email analytics'],
    maxAliases: 10,
    prioritySupport: true,
    customForwarding: true,
  },
];

interface Props {
  currentPlan?: string;
  onSelectPlan: (planId: string, cycle: 'monthly' | 'yearly') => void;
}

export default function EmailSubscriptionPlans({ currentPlan = 'basic', onSelectPlan }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4">
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
          Yearly <Badge className="ml-2">Save 17%</Badge>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const isCurrent = currentPlan === plan.id;

          return (
            <Card key={plan.id} className={`p-6 ${isCurrent ? 'border-blue-500 border-2' : ''}`}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                {isCurrent && <Badge>Current Plan</Badge>}
                <div className="mt-4">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-gray-600">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={isCurrent}
                onClick={() => onSelectPlan(plan.id, billingCycle)}
              >
                {isCurrent ? 'Current Plan' : plan.id === 'basic' ? 'Downgrade' : 'Upgrade'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}