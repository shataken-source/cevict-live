import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Zap, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const featuredOptions = [
  {
    id: 'featured-day',
    name: '24 Hour Featured',
    price: 19,
    duration: '1 day',
    icon: Zap,
    benefits: ['Top of search results', '3x more views', 'Featured badge']
  },
  {
    id: 'featured-week',
    name: 'Weekly Featured',
    price: 79,
    duration: '7 days',
    icon: Star,
    popular: true,
    savings: 'Save $54',
    benefits: ['Top of search results', '3x more views', 'Featured badge', 'Homepage placement']
  },
  {
    id: 'featured-month',
    name: 'Monthly Featured',
    price: 249,
    duration: '30 days',
    icon: TrendingUp,
    savings: 'Save $321',
    benefits: ['Top of search results', '5x more views', 'Featured badge', 'Homepage placement', 'Social media promotion']
  }
];

export function FeaturedListingPurchase({ charterId }: { charterId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePurchase = async (optionId: string, price: number) => {
    setLoading(optionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create Stripe checkout session — listing activated via webhook after payment
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'featured_listing',
          planId: optionId,
          charterId,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout');

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to purchase featured listing.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const getDuration = (optionId: string) => {
    if (optionId === 'featured-day') return 24 * 60 * 60 * 1000;
    if (optionId === 'featured-week') return 7 * 24 * 60 * 60 * 1000;
    return 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {featuredOptions.map((option) => {
        const Icon = option.icon;

        return (
          <Card key={option.id} className={option.popular ? 'border-yellow-500 border-2' : ''}>
            {option.popular && (
              <div className="bg-yellow-500 text-white text-center py-1 text-sm font-medium">
                Best Value
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <Icon className="h-8 w-8 text-yellow-600" />
                {option.savings && <Badge variant="secondary">{option.savings}</Badge>}
              </div>
              <CardTitle>{option.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">${option.price}</span>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{option.duration}</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {option.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-600" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                disabled={loading === option.id}
                onClick={() => handlePurchase(option.id, option.price)}
              >
                {loading === option.id ? 'Processing...' : 'Purchase Now'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
