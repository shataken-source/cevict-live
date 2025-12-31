import { createClient } from '@supabase/supabase-js'

// Create Supabase client with fallback for build time
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    return null
  }
  
  return createClient(url, key)
}

async function getPicks() {
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return []
    }
    
    const { data, error } = await supabase
      .from('picks')
      .select('*')
      .order('game_time', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching picks:', error)
    return []
  }
}

export default async function PicksPage() {
  const picks = await getPicks()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Picks Management</h2>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
          + Create Pick
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-4 gap-4">
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option>All Sports</option>
            <option>NBA</option>
            <option>NFL</option>
            <option>NHL</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option>All Status</option>
            <option>Pending</option>
            <option>Won</option>
            <option>Lost</option>
            <option>Push</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option>All Types</option>
            <option>Free</option>
            <option>Premium</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Picks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pick</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {picks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No picks yet. Trigger picks generation at progno API.
                </td>
              </tr>
            ) : (
              picks.map((pick) => (
                <tr key={pick.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {pick.away_team} @ {pick.home_team}
                    </div>
                    <div className="text-sm text-gray-500">{pick.sport}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pick.pick}</div>
                    <div className="text-sm text-gray-500">{pick.pick_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pick.odds > 0 ? '+' : ''}{pick.odds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {pick.confidence || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pick.tier === 'free' ? 'bg-gray-100 text-gray-800' :
                      pick.tier === 'pro' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pick.tier || 'free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pick.result === 'won' ? 'bg-green-100 text-green-800' :
                      pick.result === 'lost' ? 'bg-red-100 text-red-800' :
                      pick.result === 'push' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pick.result || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 mr-4">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}