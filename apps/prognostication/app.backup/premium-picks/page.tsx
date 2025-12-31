import { createClient } from '@/lib/supabase/server'

async function getPremiumPicks() {
  const supabase = createClient()
  
  const { data: picks, error } = await supabase
    .from('picks')
    .select('*')
    .eq('is_premium', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) {
    console.error('Error fetching premium picks:', error)
    return []
  }
  
  return picks || []
}

export default async function PremiumPicksPage() {
  const picks = await getPremiumPicks()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Premium Picks</h1>
          <p className="text-xl text-gray-600 mb-6">
            Unlock our most accurate predictions with Premium access
          </p>
          <div className="bg-yellow-400 text-black inline-block px-8 py-4 rounded-lg">
            <p className="text-2xl font-bold">.99/month</p>
            <p className="text-sm">Cancel anytime</p>
          </div>
        </div>

        {/* Premium Benefits */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Premium Benefits</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-lg">Daily Premium Picks</h3>
                <p className="text-gray-600">Get 5-10 premium picks every day</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-lg">Advanced Analytics</h3>
                <p className="text-gray-600">Detailed breakdown of each pick</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-lg">SMS Alerts</h3>
                <p className="text-gray-600">Get notified instantly of new picks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-lg">Performance Tracking</h3>
                <p className="text-gray-600">See our win rate and ROI stats</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-lg text-xl font-bold hover:opacity-90 transition">
              Subscribe Now
            </button>
          </div>
        </div>

        {/* Sample Picks (Blurred for non-subscribers) */}
        <h2 className="text-3xl font-bold mb-6">Today's Premium Picks</h2>
        
        {picks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600">Premium picks loading...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {picks.slice(0, 3).map((pick: any, index: number) => (
              <div key={pick.id} className="bg-white rounded-lg shadow-lg p-6 relative overflow-hidden">
                {index > 0 && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10">
                    <div className="bg-black text-white px-6 py-3 rounded-lg font-bold">
                      🔒 Subscribe to Unlock
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{pick.game || 'Premium Game'}</h3>
                    <p className="text-gray-600">{pick.league || 'League'}</p>
                  </div>
                  <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full font-semibold">
                    PREMIUM
                  </span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-lg mb-2"><strong>Pick:</strong> {index === 0 ? pick.pick_text : '🔒 Subscribers Only'}</p>
                  <p className="text-lg mb-2"><strong>Confidence:</strong> {index === 0 ? pick.confidence : '🔒'}</p>
                  {index === 0 && pick.analysis && (
                    <p className="text-gray-700 mt-3">{pick.analysis}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
