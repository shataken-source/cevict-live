'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, Anchor, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Destination {
  id: string
  name: string
  attractions?: string[]
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
  const [query, setQuery] = useState('')
  const [includeBoats, setIncludeBoats] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const performSearch = async () => {
    if (!query.trim() && !includeBoats) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/integrated-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationName: query.trim() || undefined,
          limit: 50,
          includeBoats,
        }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch()
    }, 500) // Debounce search

    return () => clearTimeout(timer)
  }, [query, includeBoats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Search Destinations & Activities
          </h1>
          <p className="text-gray-600">
            Find your perfect vacation destination and available boat charters
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search destinations (e.g., Orange Beach, Gulf Shores)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Searching...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div className="space-y-8">
            {/* Destinations */}
            {results.destinations && results.destinations.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  Destinations ({results.destinations.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.destinations.map((dest) => (
                    <Link
                      key={dest.id}
                      href={`/destination/${dest.id}`}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {dest.name}
                      </h3>
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

            {/* Boats */}
            {includeBoats && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Anchor className="w-6 h-6 text-blue-600" />
                  Available Boat Charters
                  {results.boats && Array.isArray(results.boats) && (
                    <span className="text-lg font-normal text-gray-600">
                      ({results.boats.length})
                    </span>
                  )}
                </h2>

                {results.boatsError ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      {results.boatsError}
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      Boat listings require GCC_BASE_URL to be configured.
                    </p>
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
                          {boat.in_stock === false && (
                            <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Unavailable
                            </span>
                          )}
                          {boat.url && (
                            <a
                              href={boat.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
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

            {/* No Results */}
            {(!results.destinations || results.destinations.length === 0) &&
              (!includeBoats || !results.boats || !Array.isArray(results.boats) || results.boats.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">
                    No results found. Try adjusting your search.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Initial State */}
        {!loading && !results && !error && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Start typing to search destinations and boat charters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
