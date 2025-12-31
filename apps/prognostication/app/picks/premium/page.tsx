'use client'

import BannerPlaceholder from '@/components/BannerPlaceholder';

export default function PremiumPicks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <BannerPlaceholder position="header" adSlot="prognostication-picks-premium-header" />
      <nav className="bg-slate-900 border-b border-purple-500/20 p-4">
        <div className="container mx-auto">
          <a href="/" className="text-2xl font-bold">Prognostication</a>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">??</div>
          <h1 className="text-4xl font-bold mb-4">Premium Picks Access Required</h1>
          <p className="text-xl text-slate-300 mb-8">
            Upgrade to Premium or VIP to unlock high-confidence picks with detailed analysis
          </p>
          <a href="/pricing" className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-lg font-semibold">
            View Pricing Plans
          </a>
        </div>
        <BannerPlaceholder position="in-content" adSlot="prognostication-picks-premium-incontent" className="my-8" />
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-picks-premium-footer" />
    </div>
  )
}
