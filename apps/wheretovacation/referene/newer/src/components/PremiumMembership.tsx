import { Check, Crown, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const tiers = [
  { name: 'Free', price: 0, icon: Star, features: ['Basic search', 'Limited destinations', 'Ads included', 'Community access'], color: 'gray' },
  { name: 'Explorer', price: 9.99, icon: Zap, features: ['Advanced filters', 'Unlimited destinations', 'Ad-free experience', 'Price alerts', 'Priority support'], color: 'blue', popular: true },
  { name: 'VIP', price: 19.99, icon: Crown, features: ['Everything in Explorer', 'Exclusive deals', 'Personal concierge', 'Trip planning service', 'VIP lounge access'], color: 'purple' },
];

export default function PremiumMembership() {
  return (
    <div className="py-16 bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3">Upgrade Your Travel Experience</h2>
          <p className="text-purple-200">Choose the perfect plan for your adventures</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map(tier => {
            const Icon = tier.icon;
            return (
              <Card key={tier.name} className={`p-8 relative ${tier.popular ? 'ring-4 ring-yellow-400 scale-105' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <Icon className={`w-12 h-12 mx-auto mb-3 text-${tier.color}-600`} />
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="text-4xl font-bold mb-1">
                    ${tier.price}
                    <span className="text-lg font-normal text-gray-500">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className={`w-full ${tier.popular ? 'bg-yellow-400 text-black hover:bg-yellow-500' : ''}`}>
                  {tier.price === 0 ? 'Current Plan' : 'Upgrade Now'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}