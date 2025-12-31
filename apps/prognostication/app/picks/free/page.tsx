'use client'

import BannerPlaceholder from '@/components/BannerPlaceholder';

export default function FreePicks() {
  const picks = [
    { id: 1, sport: 'NFL', game: 'Chiefs vs Bills', pick: 'Chiefs -3.5', confidence: 75, tier: 'free' },
    { id: 2, sport: 'NBA', game: 'Lakers vs Celtics', pick: 'Over 224.5', confidence: 68, tier: 'free' },
    { id: 3, sport: 'NHL', game: 'Bruins vs Rangers', pick: 'Bruins ML', confidence: 62, tier: 'free' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <BannerPlaceholder position="header" adSlot="prognostication-picks-free-header" />
      <nav className="bg-slate-900 border-b border-purple-500/20 p-4">
        <div className="container mx-auto">
          <a href="/" className="text-2xl font-bold">Prognostication</a>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Free Picks</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {picks.map(pick => (
            <div key={pick.id} className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">{pick.sport === 'NFL' ? '??' : pick.sport === 'NBA' ? '??' : '??'}</span>
                <span className="text-3xl font-bold text-purple-400">{pick.confidence}%</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{pick.game}</h3>
              <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                <div className="text-2xl font-bold">{pick.pick}</div>
              </div>
              <div className="text-sm text-slate-400">Confidence: {pick.confidence}%</div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Want More Picks?</h3>
          <p className="text-slate-300 mb-6">Premium members get unlimited high-confidence picks</p>
          <a href="/pricing" className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold">
            Upgrade Now
          </a>
        </div>
        <BannerPlaceholder position="in-content" adSlot="prognostication-picks-free-incontent" className="my-8" />
      </div>
      <BannerPlaceholder position="footer" adSlot="prognostication-picks-free-footer" />
    </div>
  )
}
