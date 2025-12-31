import { createClient } from '@/lib/supabase/server'

async function getFreePicks() {
  const supabase = createClient()
  
  const { data: picks, error } = await supabase
    .from('picks')
    .select('*')
    .eq('is_premium', false)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching picks:', error)
    return []
  }
  
  return picks || []
}

export default async function FreePicksPage() {
  const picks = await getFreePicks()
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-4">Free Picks</h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          Check out our free predictions to see what we offer
        </p>

        {picks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-3">No free picks available right now</h2>
            <p className="text-gray-600 mb-6">
              Free picks are posted regularly. Check back soon or upgrade to Premium for daily picks!
            </p>
            <a 
              href="/premium-picks"
              className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition inline-block"
            >
              Get Premium Access
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            {picks.map((pick: any) => (
              <div key={pick.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{pick.game || 'Game'}</h3>
                    <p className="text-gray-600">{pick.league || 'League'}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                    FREE
                  </span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-lg mb-2"><strong>Pick:</strong> {pick.pick_text || 'TBD'}</p>
                  <p className="text-lg mb-2"><strong>Confidence:</strong> {pick.confidence || 'Medium'}</p>
                  {pick.analysis && (
                    <p className="text-gray-700 mt-3">{pick.analysis}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ad Space */}
        <div className="mt-12 bg-gray-200 rounded-lg p-8 text-center">
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client="ca-pub-0940073536675562"
               data-ad-slot="1234567890"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      </div>
    </div>
  )
}
