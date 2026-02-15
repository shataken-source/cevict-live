'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Building2, Rocket } from 'lucide-react';

const TIERS = [
  {
    name: 'Hobby',
    price: '$29',
    period: '/month',
    description: 'Perfect for individual bettors and researchers',
    icon: Rocket,
    features: [
      '100 API requests/day',
      '30 days max date range',
      '100 records per request',
      'JSON & CSV formats',
      '8 sports leagues',
      'Email support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For serious model builders and quants',
    icon: Zap,
    features: [
      '1,000 API requests/day',
      '90 days max date range',
      '1,000 records per request',
      'JSON & CSV formats',
      '8 sports leagues',
      'Priority email support',
      'Bulk export jobs',
      'Usage analytics',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/month',
    description: 'For funds and professional trading firms',
    icon: Building2,
    features: [
      '10,000 API requests/day',
      '365 days max date range',
      '10,000 records per request',
      'JSON & CSV formats',
      '8 sports leagues',
      'Priority phone support',
      'Bulk export jobs',
      'Custom data formats',
      'SLA guarantee',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const SPORTS = [
  { name: 'NBA', icon: '🏀' },
  { name: 'NFL', icon: '🏈' },
  { name: 'NHL', icon: '🏒' },
  { name: 'MLB', icon: '⚾' },
  { name: 'NCAAB', icon: '🏀' },
  { name: 'NCAAF', icon: '🏈' },
  { name: 'NASCAR', icon: '🏎️' },
  { name: 'College Baseball', icon: '⚾' },
];

export default function ApiPricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Historical Odds API
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Enterprise-grade sports odds data for backtesting, model development, and algorithmic trading. 
            Start building your edge today.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-800/50 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly (20% off)
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const price = billingCycle === 'yearly' 
              ? `$${Math.round(parseInt(tier.price.slice(1)) * 0.8 * 12)}`
              : tier.price;
            
            return (
              <Card
                key={tier.name}
                className={`relative bg-slate-800/50 border-slate-700 ${
                  tier.popular ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-xl ${
                      tier.popular ? 'bg-emerald-500/20' : 'bg-slate-700/50'
                    }`}>
                      <Icon className={`w-8 h-8 ${tier.popular ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">{tier.name}</CardTitle>
                  <p className="text-slate-400 text-sm mt-2">{tier.description}</p>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    <span className="text-slate-400">{billingCycle === 'yearly' ? '/year' : tier.period}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 mt-0.5 ${tier.popular ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sports Coverage */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Sports Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SPORTS.map((sport) => (
              <div
                key={sport.name}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center hover:border-emerald-500/50 transition-colors"
              >
                <span className="text-3xl mb-2 block">{sport.icon}</span>
                <span className="text-white font-medium">{sport.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sample */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Sample Data</h2>
          <div className="bg-slate-900 rounded-lg p-6 overflow-x-auto">
            <pre className="text-sm text-slate-300">
{`{
  "meta": {
    "sport": "nba",
    "dateRange": { "startDate": "2024-01-01", "endDate": "2024-01-31" },
    "gamesReturned": 247,
    "tier": 2
  },
  "data": [
    {
      "external_id": "game123",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "game_date": "2024-01-15",
      "home_moneyline": -150,
      "away_moneyline": 130,
      "spread_line": -3.5,
      "total_line": 225.5
    }
  ]
}`}
            </pre>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'How far back does the data go?',
                a: 'We started collecting odds data in February 2024. The database grows daily as we capture opening and closing lines for all major sports.'
              },
              {
                q: 'Can I export data to CSV?',
                a: 'Yes! All tiers support both JSON and CSV formats. Simply add &format=csv to your API request.'
              },
              {
                q: 'What time zone are the timestamps in?',
                a: 'All timestamps are in UTC (Coordinated Universal Time) format (ISO 8601).'
              },
              {
                q: 'Can I upgrade or downgrade my tier?',
                a: 'Yes, you can change your tier at any time. Changes take effect immediately.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 7-day money-back guarantee for all new subscriptions.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Contact us for trial access. We occasionally offer free trials for qualified researchers and developers.'
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Building?</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Join hundreds of sports bettors, quants, and developers using PROGNO data to build their edge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              Get API Key
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600">
              View Documentation
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-700 text-center text-slate-500 text-sm">
          <p>© 2024 PROGNO. All rights reserved.</p>
          <p className="mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:api@progno.app" className="text-emerald-400 hover:underline">
              api@progno.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
