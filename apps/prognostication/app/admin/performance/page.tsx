import { createClient } from '@supabase/supabase-js'

// Create Supabase client with fallback for build time
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    // Return a mock client during build if env vars aren't available
    return null
  }
  
  return createClient(url, key)
}

async function getPerformanceData() {
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      // Return empty data if Supabase isn't configured (e.g., during build)
      return {
        overall: { wins: 0, losses: 0, pushes: 0, winRate: 0, total: 0 },
        bySport: {},
        byDate: [],
        recent: []
      }
    }
    
    // Get all completed picks
    const { data: picks } = await supabase
      .from('picks')
      .select('*')
      .not('result', 'is', null)
      .order('game_time', { ascending: false })

    if (!picks || picks.length === 0) {
      return {
        overall: { wins: 0, losses: 0, pushes: 0, winRate: 0 },
        bySport: {},
        byDate: [],
        recent: []
      }
    }

    // Calculate overall stats
    const wins = picks.filter(p => p.result === 'win').length
    const losses = picks.filter(p => p.result === 'loss').length
    const pushes = picks.filter(p => p.result === 'push').length
    const total = wins + losses + pushes
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

    // Group by sport
    const bySport: Record<string, { wins: number; losses: number; pushes: number; total: number; winRate: number }> = {}
    picks.forEach(pick => {
      const sport = pick.sport || 'Unknown'
      if (!bySport[sport]) {
        bySport[sport] = { wins: 0, losses: 0, pushes: 0, total: 0, winRate: 0 }
      }
      if (pick.result === 'win') bySport[sport].wins++
      if (pick.result === 'loss') bySport[sport].losses++
      if (pick.result === 'push') bySport[sport].pushes++
      bySport[sport].total = bySport[sport].wins + bySport[sport].losses + bySport[sport].pushes
      bySport[sport].winRate = bySport[sport].total > 0 
        ? Math.round((bySport[sport].wins / bySport[sport].total) * 100) 
        : 0
    })

    // Group by date
    const byDate: Array<{ date: string; wins: number; losses: number; pushes: number; winRate: number }> = []
    const dateMap: Record<string, { wins: number; losses: number; pushes: number }> = {}
    
    picks.forEach(pick => {
      if (pick.game_time) {
        const date = new Date(pick.game_time).toISOString().split('T')[0]
        if (!dateMap[date]) {
          dateMap[date] = { wins: 0, losses: 0, pushes: 0 }
        }
        if (pick.result === 'win') dateMap[date].wins++
        if (pick.result === 'loss') dateMap[date].losses++
        if (pick.result === 'push') dateMap[date].pushes++
      }
    })

    Object.entries(dateMap).forEach(([date, stats]) => {
      const total = stats.wins + stats.losses + stats.pushes
      byDate.push({
        date,
        ...stats,
        winRate: total > 0 ? Math.round((stats.wins / total) * 100) : 0
      })
    })

    byDate.sort((a, b) => b.date.localeCompare(a.date))

    return {
      overall: { wins, losses, pushes, winRate, total },
      bySport,
      byDate: byDate.slice(0, 30), // Last 30 days
      recent: picks.slice(0, 20) // Last 20 picks
    }
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return {
      overall: { wins: 0, losses: 0, pushes: 0, winRate: 0, total: 0 },
      bySport: {},
      byDate: [],
      recent: []
    }
  }
}

export default async function PerformancePage() {
  const data = await getPerformanceData()

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Performance Analytics</h2>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Win Rate</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{data.overall.winRate}%</div>
          <div className="mt-2 text-sm text-gray-500">{data.overall.wins} wins / {data.overall.total} total</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Wins</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{data.overall.wins}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Losses</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{data.overall.losses}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Pushes</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{data.overall.pushes}</div>
        </div>
      </div>

      {/* By Sport */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Performance by Sport</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Losses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pushes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(data.bySport).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No performance data yet
                    </td>
                  </tr>
                ) : (
                  Object.entries(data.bySport).map(([sport, stats]) => (
                    <tr key={sport}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sport}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.wins}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.losses}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.pushes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{stats.winRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Picks</h3>
        </div>
        <div className="p-6">
          {data.recent.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent picks to display</p>
          ) : (
            <div className="space-y-4">
              {data.recent.map((pick: any) => (
                <div key={pick.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {pick.away_team} @ {pick.home_team}
                    </div>
                    <div className="text-sm text-gray-500">{pick.sport} • {pick.pick}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    pick.result === 'win' ? 'bg-green-100 text-green-800' :
                    pick.result === 'loss' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pick.result || 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
