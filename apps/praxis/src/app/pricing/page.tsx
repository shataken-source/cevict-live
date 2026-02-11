'use client';

import { useState } from 'react';
import {
  Check,
  X,
  Zap,
  TrendingUp,
  Shield,
  BarChart3,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useSubscription } from '@/lib/use-subscription';

interface PlanFeature {
  name: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const features: PlanFeature[] = [
  { name: 'Free tier duration', free: '1 month full', starter: '—', pro: '—', enterprise: '—' },
  { name: 'CSV Import/Export', free: true, starter: true, pro: true, enterprise: true },
  { name: 'Basic P&L Analytics', free: true, starter: true, pro: true, enterprise: true },
  { name: 'Trade History', free: '30 days', starter: '90 days', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Win Rate & Stats', free: true, starter: true, pro: true, enterprise: true },
  { name: 'Real-time Market Data', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Kalshi API Integration', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Polymarket Integration', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Advanced Risk Metrics', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Kelly Criterion Calculator', free: false, starter: false, pro: true, enterprise: true },
  { name: 'AI Trading Insights', free: false, starter: false, pro: '50/month', enterprise: 'Unlimited' },
  { name: 'Arbitrage Scanner', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Arbitrage Alerts', free: false, starter: false, pro: true, enterprise: true },
  { name: 'SMS/Email Alerts', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Arbitrage Execution', free: false, starter: false, pro: false, enterprise: true },
  { name: 'Multi-Account Support', free: false, starter: false, pro: false, enterprise: true },
  { name: 'Team Members', free: '1', starter: '2', pro: '5', enterprise: '10+' },
  { name: 'API Access', free: false, starter: false, pro: false, enterprise: true },
  { name: 'Priority Support', free: false, starter: false, pro: false, enterprise: true },
];

const plans = [
  {
    name: 'Free',
    price: 0,
    plan: null as string | null,
    description: 'Free for 1 month, then limited (CSV only) or upgrade',
    icon: BarChart3,
    popular: false,
  },
  {
    name: 'Starter',
    price: 9,
    plan: 'starter',
    description: '2 users · First step up from free',
    icon: Zap,
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    plan: 'pro',
    description: '5 users · For serious traders',
    icon: TrendingUp,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    plan: 'enterprise',
    description: '10+ users · Trading teams',
    icon: Shield,
    popular: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { userId } = useAuth();
  const { postTrialDiscountEligible } = useSubscription();

  const handleSubscribe = async (plan: string | null, planName: string) => {
    if (!plan) {
      window.location.href = '/';
      return;
    }

    setLoading(planName);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: userId ?? undefined,
          postTrialDiscount: postTrialDiscountEligible,
        }),
      });

      const data = await response.json();
      const { url, error } = data;

      if (error) {
        if (response.status === 401) {
          window.location.href = '/sign-in?redirect_url=/pricing';
          return;
        }
        throw new Error(error);
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">PRAXIS</h1>
              <p className="text-xs text-zinc-500">cevict.ai</p>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/sign-in" className="btn-primary">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <section className="py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Free for 1 month. Then Starter, Pro, or Enterprise — or stay on limited free (CSV only). No hidden fees, cancel anytime.
        </p>
        {postTrialDiscountEligible && (
          <p className="mt-4 text-amber-400 font-medium">
            Your trial ended — get <strong>15% off</strong> Pro when you upgrade below.
          </p>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${plan.popular
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-zinc-800 bg-zinc-900/50'
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${plan.popular ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                  <plan.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-zinc-400">/month</span>
              </div>

              <p className="text-zinc-400 mb-6">{plan.description}</p>

              <button
                onClick={() => handleSubscribe(plan.plan, plan.name)}
                disabled={loading === plan.name}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
              >
                {loading === plan.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {plan.plan ? 'Subscribe' : 'Get Started Free'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 font-medium">Feature</th>
                <th className="text-center py-4 px-4 font-medium">Free</th>
                <th className="text-center py-4 px-4 font-medium">Starter</th>
                <th className="text-center py-4 px-4 font-medium text-indigo-400">Pro</th>
                <th className="text-center py-4 px-4 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={feature.name} className={i % 2 === 0 ? 'bg-zinc-900/30' : ''}>
                  <td className="py-3 px-4 text-zinc-300">{feature.name}</td>
                  <td className="py-3 px-4 text-center">{renderFeatureValue(feature.free)}</td>
                  <td className="py-3 px-4 text-center">{renderFeatureValue(feature.starter)}</td>
                  <td className="py-3 px-4 text-center bg-indigo-500/5">{renderFeatureValue(feature.pro)}</td>
                  <td className="py-3 px-4 text-center">{renderFeatureValue(feature.enterprise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <FaqItem question="What does 'Free for 1 month' mean?" answer="You get full free access for your first month (CSV import, P&L, 30-day history, win rate). After that, you can upgrade to Pro for live data and arbitrage, or continue on a limited free tier (CSV only). No credit card required to start." />
          <FaqItem question="Can I cancel anytime?" answer="Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period." />
          <FaqItem question="Do you offer refunds?" answer="We offer a 7-day money-back guarantee for Pro subscriptions. Enterprise plans have custom terms." />
          <FaqItem question="What payment methods do you accept?" answer="We accept all major credit cards through Stripe. Enterprise customers can also pay via invoice." />
          <FaqItem question="Is my trading data secure?" answer="Absolutely. We use bank-level encryption and never share your trading data. Your API keys are encrypted at rest." />
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>© 2026 PRAXIS by cevict.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (value === true) return <Check className="w-5 h-5 text-green-500 mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-zinc-600 mx-auto" />;
  return <span className="text-sm text-zinc-300">{value}</span>;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="font-medium">{question}</span>
        <span className="text-zinc-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-3 text-zinc-400">{answer}</div>}
    </div>
  );
}
