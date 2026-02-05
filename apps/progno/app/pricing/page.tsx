import Link from 'next/link'
import { Check, X, Zap, Crown, Gift } from 'lucide-react'

export default function PricingPage() {
  const tiers = [
    {
      name: 'FREE',
      icon: Gift,
      price: 0,
      period: 'forever',
      description: 'Perfect for casual fans',
      features: [
        { text: 'Daily sports predictions', included: true },
        { text: 'Basic win probability', included: true },
        { text: '3 picks per day', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Community forum', included: true },
        { text: 'Advanced analytics', included: false },
        { text: 'PROGNO AI insights', included: false },
        { text: 'Arbitrage detection', included: false },
      ],
      cta: 'Get Started',
      ctaLink: '/signup',
      highlighted: false,
    },
    {
      name: 'PRO',
      icon: Zap,
      price: 29,
      period: 'month',
      yearlyPrice: 290,
      yearlyDiscount: 'Save $58/year',
      description: 'For serious bettors',
      features: [
        { text: 'Everything in FREE', included: true, bold: true },
        { text: 'Unlimited daily picks', included: true },
        { text: 'Advanced PROGNO AI analysis', included: true },
        { text: 'Arbitrage opportunity alerts', included: true },
        { text: 'Historical performance data', included: true },
        { text: 'Betting edge calculator', included: true },
        { text: 'SMS alerts for high-value picks', included: true },
        { text: 'Custom filters', included: true },
        { text: 'Export to CSV', included: true },
        { text: 'API access (100 calls/day)', included: true },
        { text: 'Priority support', included: true },
      ],
      cta: 'Start Free Trial',
      ctaLink: '/signup?tier=pro',
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'ELITE',
      icon: Crown,
      price: 99,
      period: 'month',
      yearlyPrice: 990,
      yearlyDiscount: 'Save $198/year',
      description: 'Maximum edge for professionals',
      features: [
        { text: 'Everything in PRO', included: true, bold: true },
        { text: 'Real-time odds monitoring', included: true },
        { text: 'Kalshi prediction markets', included: true },
        { text: 'PROGNO Massager access', included: true },
        { text: 'Sentiment analysis', included: true },
        { text: 'Injury impact modeling', included: true },
        { text: 'Weather impact analysis', included: true },
        { text: 'Line movement tracking', included: true },
        { text: 'Sharp vs public indicators', included: true },
        { text: 'White-label API (unlimited)', included: true },
        { text: '1-on-1 strategy consultation', included: true },
        { text: 'Early access to features', included: true },
      ],
      cta: 'Start Free Trial',
      ctaLink: '/signup?tier=elite',
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-black text-white mb-4">
          Choose Your <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Winning</span> Plan
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Get the edge you need. Start with 30 days free, cancel anytime.
        </p>
        
        {/* ROI Guarantee Badge */}
        <div className="inline-block bg-green-500/10 border border-green-500/30 rounded-full px-6 py-3 mb-12">
          <span className="text-green-400 font-semibold">💰 ROI Guarantee: Profit or 100% refund in first 30 days</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier, index) => {
            const Icon = tier.icon
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-gradient-to-b from-blue-900/50 to-purple-900/50 border-2 border-blue-500 shadow-2xl shadow-blue-500/20 scale-105'
                    : 'bg-gray-900/50 border border-gray-800'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    {tier.badge}
                  </div>
                )}

                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${tier.highlighted ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                    <Icon className={`w-6 h-6 ${tier.highlighted ? 'text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                </div>

                <p className="text-gray-400 mb-6">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">${tier.price}</span>
                    <span className="text-gray-400">/{tier.period}</span>
                  </div>
                  {tier.yearlyPrice && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">or ${tier.yearlyPrice}/year</span>
                      <span className="ml-2 text-green-400">({tier.yearlyDiscount})</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={tier.ctaLink}
                  className={`block w-full py-3 rounded-lg text-center font-bold mb-6 transition-all ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/50'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {tier.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'} ${feature.bold ? 'font-bold' : ''}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">How does the ROI guarantee work?</h3>
            <p className="text-gray-400">
              If you don't profit enough to cover your subscription cost in the first 30 days (following our picks with proper bankroll management), we'll refund you 100%. No questions asked.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">Can I change plans later?</h3>
            <p className="text-gray-400">
              Yes! Upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades take effect at the end of your billing period.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-400">
              We accept all major credit cards, debit cards, and cryptocurrency through Stripe.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">Is my data secure?</h3>
            <p className="text-gray-400">
              Absolutely. We use bank-level encryption and never store your payment information. All transactions are processed securely through Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to gain an edge?
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join thousands of winning bettors today
        </p>
        <Link
          href="/signup"
          className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          Start Your Free Trial
        </Link>
      </div>
    </div>
  )
}

