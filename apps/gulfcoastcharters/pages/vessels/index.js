import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../../components/Layout'
import VesselCard from '../../components/VesselCard'

function normalizeCategory(v) {
  if (v?.category) return String(v.category)
  const t = String(v?.type || '').toLowerCase()
  if (t.includes('jet') || t.includes('sea_doo') || t.includes('waverunner')) return 'inland_waterway'
  if (t.includes('pontoon')) return 'inland_waterway'
  if (t.includes('wake') || t.includes('surf') || t.includes('ski')) return 'inland_waterway'
  if (t.includes('kayak') || t.includes('canoe') || t.includes('paddle')) return 'recreation'
  return 'charter_fishing'
}

export default function VesselsPage({ session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/boats?available=true&limit=200')
        const data = res.ok ? await res.json() : []
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set()
    for (const v of items) set.add(normalizeCategory(v))
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((v) => {
      const cat = normalizeCategory(v)
      if (category !== 'all' && cat !== category) return false
      if (!q) return true
      return (
        String(v.name || '').toLowerCase().includes(q) ||
        String(v.type || '').toLowerCase().includes(q) ||
        String(v.home_port || '').toLowerCase().includes(q)
      )
    })
  }, [items, query, category])

  return (
    <Layout session={session}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Vessels</h1>
            <p className="text-gray-600">
              Charter fishing, inland waterway rentals, and recreation boats — pulled from the live listings feed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, type, or location…"
              className="w-full sm:w-80 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading listings…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-700">
            <div className="font-semibold">No vessels yet</div>
            <div className="mt-1 text-sm text-gray-600">
              Once you add verified vessels in Supabase, they’ll appear here automatically (no mock/test data).
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <VesselCard key={v.id} vessel={v} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

