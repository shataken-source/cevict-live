'use client'

import { useState } from 'react'
import { Crown, Zap, Theater, Popcorn, Sparkles, Check, X } from 'lucide-react'
import Link from 'next/link'
import BuyMeACoffee from '@/components/ads/BuyMeACoffee'

/**
 * Premium Subscription Page
 * 
 * Monetization through subscriptions:
 * - Free: Basic access
 * - Premium ($4.99/mo): No ads, early access, unlimited binge mode
 * - VIP ($9.99/mo): Everything + exclusive content + Discord access
 */

const plans = [
  {
    id: 'free',
    name: 'Free Popper',
    price: 0,
    period: '',
    description: 'The basic experience',
    icon: Popcorn,
    features: [
      { text: 'Access to all headlines', included: true },
      { text: 'Vote on drama scores', included: true },
      { text: 'Basic reactions', included: true },
      { text: 'Standard refresh rate', included: true },
      { text: 'Ads supported', included: false },
      { text: 'Binge mode limited', included: false },
      { text: 'Early access to stories', included: false },
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 4.99,
    period: '/month',
    description: 'The full drama experience',
    icon: Crown,
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'No ads', included: true },
      { text: 'Unlimited binge mode', included: true },
      { text: 'Early story access (15 min)', included: true },
      { text: 'Custom themes', included: true },
      { text: 'Priority support', included: true },
      { text: 'Export headlines', included: false },
    ],
    cta: 'Go Premium',
    popular: true,
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 9.99,
    period: '/month',
    description: 'For the true drama addict',
    icon: Sparkles,
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'VIP Discord channel', included: true },
      { text: 'Exclusive "Lore" stories', included: true },
      { text: 'Monthly drama report', included: true },
      { text: 'Vote on new features', included: true },
      { text: 'Export headlines', included: true },
      { text: 'Personalized alerts', included: true },
    ],
    cta: 'Become VIP',
    popular: false,
  },
]

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return
    
    setIsLoading(true)
    try {
      // Call Stripe checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Payment system coming soon!')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-amber-500 hover:text-amber-400">
            <Popcorn className="w-8 h-8" />
            <span className="text-xl font-bold">PopThePopcorn</span>
          </Link>
          <BuyMeACoffee variant="button" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Upgrade Your <span className="text-amber-500">Drama</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Get the full PopThePopcorn experience. No ads, early access, and exclusive features 
            for the true news junkies.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isSelected = selectedPlan === plan.id
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-900/10'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                } ${plan.popular ? 'ring-2 ring-amber-500/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-black text-xs font-bold py-1 px-3 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${
                    plan.id === 'free' ? 'bg-slate-800' :
                    plan.id === 'premium' ? 'bg-amber-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.id === 'free' ? 'text-slate-400' :
                      plan.id === 'premium' ? 'text-amber-500' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-slate-500 text-sm">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.id === 'free' || isLoading}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    plan.id === 'free'
                      ? 'bg-slate-800 text-slate-500 cursor-default'
                      : isSelected
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {plan.id === 'free' ? plan.cta : isLoading ? 'Loading...' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* One-time tip */}
        <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Not ready to subscribe?</h2>
          <p className="text-slate-400 mb-6">
            Buy us a bag of popcorn to keep the servers running and the headlines flowing.
          </p>
          <BuyMeACoffee variant="card" />
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! Cancel anytime from your account settings. You keep access until the billing period ends.',
              },
              {
                q: 'What payment methods?',
                a: 'We accept all major credit cards, PayPal, and Apple Pay through Stripe.',
              },
              {
                q: 'Is there a refund policy?',
                a: '7-day money-back guarantee. If you are not happy, we will refund you, no questions asked.',
              },
              {
                q: 'What is "Early Access"?',
                a: 'Premium users see breaking stories 15 minutes before free users. Stay ahead of the curve.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
