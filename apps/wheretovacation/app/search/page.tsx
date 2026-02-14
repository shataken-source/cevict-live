'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, MapPin, Anchor, Loader2, Compass } from 'lucide-react'
import Link from 'next/link'
import { ACTIVITY_IDS, getActivityLabel } from '@/lib/activities'

interface Destination {
  id: string
  name: string
  slug?: string
  region?: string
  country?: string
  attractions?: string[]
  available_activities?: string[]
  last_updated?: string
}

interface Boat {
  id?: string
  name?: string
  title?: string
  url?: string
  image_url?: string
  current_price?: number
  in_stock?: boolean
}

interface SearchResponse {
  ok: boolean
  destinations: Destination[]
  boats: Boat[]
  boatsError?: string | null
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [destinationName, setDestinationName] = useState('')
  const [includeBoats, setIncludeBoats] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Deep-link: ?activities=scuba_diving,eco_tour or ?destination= / ?q=
  useEffect(() => {
    const activitiesParam = searchParams.get('activities')
    if (activitiesParam && selectedActivities.length === 0) {
      setSelectedActivities(activitiesParam.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean))
    }
    const q = searchParams.get('destination') || searchParams.get('q') || ''
    if (q && !destinationName) setDestinationName(q)
  }, [searchParams])

  const performSearch = useCallback(async () => {
    const hasActivities = selectedActivities.length > 0
    const hasName = destinationName.trim().length > 0
    if (!hasActivities && !hasName && !includeBoats) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/integrated-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: hasActivities ? selectedActivities : undefined,
          destinationName: hasName ? destinationName.trim() : undefined,
          limit: 50,
          includeBoats,
        }),
      })
      if (!response.ok) throw new Error('Search failed')
      const data: SearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [selectedActivities, destinationName, includeBoats])

  useEffect(() => {
    const timer = setTimeout(performSearch, 400)
    return () => clearTimeout(timer)
  }, [performSearch])

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find destinations by what you want to do
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Pick your activities — we&apos;ll show you places around the world where you can do them. Then choose your destination from the results.
          </p>
        </div>

        {/* Activity-first: What do you want to do? */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            What do you want to do?
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Select one or more activities. Destinations that offer all or most of these will appear below.
          </p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_IDS.map((id) => {
              const selected = selectedActivities.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleActivity(id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getActivityLabel(id)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Or search by destination name */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Or search by destination name
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="e.g. Orange Beach, Gulf Shores, Bali..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={includeBoats}
                onChange={(e) => setIncludeBoats(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Include boat charters</span>
            </label>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Finding destinations...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && results && (
          <div className="space-y-8">
            {results.destinations && results.destinations.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  Destinations that match
                  {selectedActivities.length > 0 && (
                    <span className="text-base font-normal text-gray-600">
                      (places where you can do {selectedActivities.length > 1 ? 'these activities' : 'this'})
                    </span>
                  )}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.destinations.map((dest) => (
                    <Link
                      key={dest.id}
                      href={`/destination/${dest.id}`}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow block"
                    >
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{dest.name}</h3>
                      {(dest.region || dest.country) && (
                        <p className="text-gray-500 text-sm mb-2">
                          {[dest.region, dest.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {dest.attractions && dest.attractions.length > 0 && (
                        <p className="text-gray-600 text-sm mb-2">
                          {dest.attractions.slice(0, 2).join(', ')}
                          {dest.attractions.length > 2 && '...'}
                        </p>
                      )}
                      {dest.last_updated && (
                        <p className="text-gray-400 text-xs">
                          Updated: {new Date(dest.last_updated).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {includeBoats && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Anchor className="w-6 h-6 text-blue-600" />
                  Boat charters
                  {results.boats && Array.isArray(results.boats) && (
                    <span className="text-lg font-normal text-gray-600">({results.boats.length})</span>
                  )}
                </h2>
                {results.boatsError ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">{results.boatsError}</p>
                  </div>
                ) : results.boats && Array.isArray(results.boats) && results.boats.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.boats.map((boat, index) => (
                      <div
                        key={boat.id || index}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {boat.image_url && (
                          <img
                            src={boat.image_url}
                            alt={boat.name || boat.title || 'Boat'}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {boat.name || boat.title || 'Boat Charter'}
                          </h3>
                          {boat.current_price && (
                            <p className="text-xl font-bold text-blue-600 mb-2">
                              ${boat.current_price.toLocaleString()}
                            </p>
                          )}
                          {boat.url && (
                            <a
                              href={boat.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm inline-block"
                            >
                              View Details →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No boats available at this time.</p>
                )}
              </div>
            )}

            {(!results.destinations || results.destinations.length === 0) &&
              (!includeBoats || !results.boats?.length) && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No destinations found.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Try selecting different activities or a destination name. Destinations need
                    activities data in the database to show up for activity search.
                  </p>
                </div>
              )}
          </div>
        )}

        {!loading && !results && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Select activities or type a destination name</p>
            <p className="text-gray-500 text-sm mt-2">
              We&apos;ll show you places where you can do what you love
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
