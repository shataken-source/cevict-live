import Link from 'next/link'
import Layout from '../components/Layout'
import { useEffect, useState } from 'react'

export default function Home({ session }) {
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/boats?available=true&limit=6')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setBoats(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setBoats([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Layout session={session}>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 text-center">
        <h1 className="text-6xl font-bold mb-6">Gulf Coast Charters</h1>
        <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
          Browse real captains and boats across the Gulf Coast. Book fast, compare options, and get on the water.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/captains" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold inline-block">
            Find a Captain
          </Link>
          <Link href="/admin" className="bg-blue-500/30 border border-white/20 px-8 py-4 rounded-lg font-semibold inline-block hover:bg-blue-500/40">
            Admin
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured boats</h2>
          <Link href="/captains" className="text-blue-600 font-semibold hover:text-blue-800">
            View all →
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading listings…</p>
        ) : boats.length === 0 ? (
          <p className="text-gray-600">
            No listings yet. Add captains/boats in Supabase.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boats.map((b) => (
              <div key={b.id} className="bg-white rounded-lg shadow p-6 border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{b.name}</h3>
                    <p className="text-sm text-gray-600">
                      {b.type}
                      {b.capacity ? ` • up to ${b.capacity}` : ''}
                    </p>
                    {b.home_port ? <p className="text-sm text-gray-600">{b.home_port}</p> : null}
                    {b.captain ? <p className="text-sm text-gray-600">Captain: {b.captain}</p> : null}
                  </div>
                  <div className="text-right">
                    {b.price ? <p className="text-lg font-bold text-blue-600">${b.price}</p> : <p className="text-gray-500">Contact</p>}
                    {b.rating ? (
                      <p className="text-sm text-gray-600">
                        {Number(b.rating).toFixed(1)} ★ {b.reviews ? `(${b.reviews})` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                {Array.isArray(b.specialties) && b.specialties.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}