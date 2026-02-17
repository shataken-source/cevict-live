'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap, Shield } from 'lucide-react';

type BillingCycle = 'monthly' | 'annual';

interface Tier {
  name: string;
  description: string;
  price: number | null;
  period: string;
  savings: string | null;
  cta: string;
  features: string[];
  highlight: boolean;
  fundTier?: boolean;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const tiers: Tier[] = [
    {
      name: 'Pro',
      description: 'For active probability traders',
      price: billingCycle === 'monthly' ? 19 : 15,
      period: billingCycle === 'monthly' ? '/month' : '/month, billed annually',
      savings: billingCycle === 'annual' ? 'Save $48/year' : null,
      cta: 'Start 7-Day Trial',
      features: [
        '5 AI picks per day',
        'All 6 market categories',
        'Edge calculation',
        'AI reasoning summaries',
        'Email alerts',
        'Basic analytics',
      ],
      highlight: false,
    },
    {
      name: 'Elite',
      description: 'For serious edge operators',
      price: billingCycle === 'monthly' ? 49 : 39,
      period: billingCycle === 'monthly' ? '/month' : '/month, billed annually',
      savings: billingCycle === 'annual' ? 'Save $120/year' : null,
      cta: 'Start 7-Day Trial',
      features: [
        'Unlimited daily picks',
        'Full historical patterns',
        'SMS + Email alerts',
        'Discord access',
        'Strategy calls',
        'Entertainment expert',
        'Priority support',
        'Arbitrage detection',
      ],
      highlight: true,
    },
    {
      name: 'Fund',
      description: 'Managed strategy access',
      price: null,
      period: '',
      savings: '2/20 fee structure',
      cta: 'Request Access',
      features: [
        'Everything in Elite',
        'Early signal access',
        'Auto-sizing (Kelly)',
        'Execution layer',
        'Risk engine',
        'Quarterly reports',
        'White-glove onboarding',
        '$100K minimum',
      ],
      highlight: false,
      fundTier: true,
    },
  ];

  const handleCheckout = async (tierName: string) => {
    if (tierName === 'Fund') {
      window.location.href = '/contact';
      return;
    }

    setIsLoading(tierName);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierName.toLowerCase(),
          billingCycle,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Trust Bar */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-8 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Shield size={14} className="text-success" />
            Secure Stripe Checkout
          </span>
          <span>•</span>
          <span>Cancel Anytime</span>
          <span>•</span>
          <span>12,481 Active Traders</span>
          <span>•</span>
          <span>$48M+ Volume Tracked</span>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold text-text-primary mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Choose your edge level. Upgrade or downgrade anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm transition ${billingCycle === 'monthly'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${billingCycle === 'annual'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            Annual
            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 ${tier.highlight
                ? 'bg-panel border-2 border-primary shadow-glow'
                : 'bg-panel border border-border'
                } ${tier.fundTier ? 'bg-gradient-to-b from-panel to-surface' : ''}`}
            >
              {/* Badge */}
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-white text-sm font-medium rounded-full flex items-center gap-1">
                    <Sparkles size={14} />
                    Most Popular
                  </span>
                </div>
              )}
              {tier.fundTier && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-accent text-white text-sm font-medium rounded-full flex items-center gap-1">
                    <Zap size={14} />
                    Institutional
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-text-primary mb-2">
                  {tier.name}
                </h3>
                <p className="text-text-muted">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {tier.price ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-text-primary">
                        ${tier.price}
                      </span>
                      <span className="text-text-muted">{tier.period}</span>
                    </div>
                    {tier.savings && (
                      <p className="text-sm text-success mt-1">{tier.savings}</p>
                    )}
                  </>
                ) : (
                  <div className="text-2xl font-bold text-text-primary">
                    Custom Pricing
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(tier.name)}
                disabled={isLoading === tier.name}
                className={`block w-full py-4 rounded-xl font-medium text-center transition mb-6 ${tier.highlight
                  ? 'bg-primary text-white hover:bg-primary-hover shadow-glow-sm'
                  : tier.fundTier
                    ? 'bg-accent text-white hover:opacity-90'
                    : 'bg-surface border border-border text-text-primary hover:border-primary'
                  } ${isLoading === tier.name ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading === tier.name ? 'Loading...' : tier.cta}
              </button>

              {/* Features */}
              <ul className="space-y-3">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                    <Check size={16} className="text-success mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-text-muted">
            Questions?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact our team
            </Link>
          </p>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-6 text-center text-sm text-text-muted">
            <div>
              <p className="font-medium text-text-primary mb-1">Secure Payments</p>
              <p>Stripe PCI compliant</p>
            </div>
            <div>
              <p className="font-medium text-text-primary mb-1">Cancel Anytime</p>
              <p>No long-term contracts</p>
            </div>
            <div>
              <p className="font-medium text-text-primary mb-1">24/7 Support</p>
              <p>Email & Discord access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
