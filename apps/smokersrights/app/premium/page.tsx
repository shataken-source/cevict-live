import Link from 'next/link'
import { Check, Mail, FileText, Smartphone, Shield, ArrowRight } from 'lucide-react'

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Premium Legal Navigator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get comprehensive legal updates, detailed travel guides, and exclusive resources to navigate smoking and vaping laws with confidence.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 mb-8 border-2 border-blue-500">
          <div className="text-center mb-8">
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Most Popular
            </div>
            <div className="mb-4">
              <span className="text-5xl font-bold text-gray-900">$9.99</span>
              <span className="text-xl text-gray-600">/month</span>
            </div>
            <p className="text-gray-600">Cancel anytime. No long-term commitment.</p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Weekly Legal Update Emails</h3>
                <p className="text-sm text-gray-600">
                  Get a digest of all law changes, new regulations, and important updates delivered to your inbox every week.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Detailed Travel Guides (PDF)</h3>
                <p className="text-sm text-gray-600">
                  Download comprehensive PDF guides for domestic and international travel. Updated monthly with the latest law changes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Exclusive State Law Deep-Dives</h3>
                <p className="text-sm text-gray-600">
                  Access detailed analysis of state laws, including local ordinance overrides, enforcement details, and penalty information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Ad-Free Experience</h3>
                <p className="text-sm text-gray-600">
                  Browse the site without interruptions. Focus on the legal information you need.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Mobile App Access</h3>
                <p className="text-sm text-gray-600">
                  Access all premium features on the go with our mobile app (coming soon).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Priority Support</h3>
                <p className="text-sm text-gray-600">
                  Get faster responses to your legal questions and priority access to new features.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors mb-4">
            Subscribe Now - $9.99/month
          </button>
          <p className="text-center text-sm text-gray-500">
            Secure payment via Stripe. Cancel anytime from your account.
          </p>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards and debit cards through Stripe. Your payment information is secure and never stored on our servers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How often are travel guides updated?</h3>
              <p className="text-gray-600 text-sm">
                Travel guides are updated monthly, or immediately when significant law changes occur. You'll be notified via email when new versions are available.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">
                We offer a 7-day free trial for new subscribers. No credit card required to start your trial.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Free */}
        <div className="text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-2"
          >
            ← Back to Free Resources
          </Link>
        </div>
      </div>
    </div>
  )
}
