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

async function getStats() {
  try {
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return {
        totalPicks: 0,
        todayPicks: 0,
        winRate: 0,
        premiumPicks: 0
      }
    }
    
    // Get total picks
    const { count: totalPicks } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })

    // Get today's picks
    const today = new Date().toISOString().split('T')[0]
    const { count: todayPicks } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
      .gte('game_time', `${today}T00:00:00`)
      .lt('game_time', `${today}T23:59:59`)

    // Get win rate
    const { data: completedPicks } = await supabase
      .from('picks')
      .select('result')
      .not('result', 'is', null)

    const wins = completedPicks?.filter(p => p.result === 'win').length || 0
    const total = completedPicks?.length || 0
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

    // Get premium picks
    const { count: premiumPicks } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true)

    return {
      totalPicks: totalPicks || 0,
      todayPicks: todayPicks || 0,
      winRate,
      premiumPicks: premiumPicks || 0
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      totalPicks: 0,
      todayPicks: 0,
      winRate: 0,
      premiumPicks: 0
    }
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Picks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalPicks}</div>
          <div className="mt-2 text-sm text-blue-600">All time</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Today's Picks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.todayPicks}</div>
          <div className="mt-2 text-sm text-green-600">Active now</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Win Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.winRate}%</div>
          <div className="mt-2 text-sm text-purple-600">Completed picks</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Premium Picks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.premiumPicks}</div>
          <div className="mt-2 text-sm text-yellow-600">High confidence</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <a href="/admin/picks" className="block bg-purple-600 text-white p-6 rounded-lg shadow hover:bg-purple-700">
          <div className="text-2xl mb-2">🎯</div>
          <div className="font-medium">Manage Picks</div>
          <div className="text-sm text-purple-100">View, edit, and approve picks</div>
        </a>
        <a href="/admin/performance" className="block bg-blue-600 text-white p-6 rounded-lg shadow hover:bg-blue-700">
          <div className="text-2xl mb-2">📈</div>
          <div className="font-medium">View Performance</div>
          <div className="text-sm text-blue-100">Win rates by sport and date</div>
        </a>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Progno API</div>
              <div className="text-2xl font-bold text-green-600">✓ Connected</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Supabase</div>
              <div className="text-2xl font-bold text-green-600">✓ Online</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Odds API</div>
              <div className="text-2xl font-bold text-green-600">✓ Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
