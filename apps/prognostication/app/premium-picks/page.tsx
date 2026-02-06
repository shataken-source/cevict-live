'use client';

import BannerPlaceholder from '@/components/BannerPlaceholder';
import Link from 'next/link';

export default function PremiumPicksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <BannerPlaceholder position="header" adSlot="prognostication-premium-picks-header" />
      <div className="py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-center mb-6">Premium Picks</h1>
          <div className="text-center mb-12">
            <div className="bg-yellow-400 text-black inline-block px-8 py-4 rounded-lg">
              <p className="text-2xl font-bold">Pro & Elite plans</p>
              <p className="text-sm">Cancel anytime</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Premium Benefits</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div><h3 className="font-bold">Daily Pro Picks</h3><p className="text-gray-600">3 strong picks every day with full analysis</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div><h3 className="font-bold">Elite: All Picks + Tools</h3><p className="text-gray-600">Every pick, fine-tuner, parlays & teasers</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div><h3 className="font-bold">Advanced Analytics</h3><p className="text-gray-600">Key factors, rationale, simulation results</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div><h3 className="font-bold">SMS & More</h3><p className="text-gray-600">Alerts and performance tracking (Elite)</p></div>
              </div>
            </div>
            <div className="text-center mt-8 space-y-3">
              <Link
                href="/pricing"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-lg text-xl font-bold hover:from-purple-500 hover:to-blue-500 transition-all"
              >
                Subscribe Now
              </Link>
              <p className="text-sm text-gray-500">
                Already a subscriber? <Link href="/my-picks" className="text-purple-600 font-medium hover:underline">View your picks</Link>
              </p>
            </div>
          </div>
          <BannerPlaceholder position="in-content" adSlot="prognostication-premium-picks-incontent" className="my-8" />
        </div>
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-premium-picks-footer" />
    </div>
  );
}
