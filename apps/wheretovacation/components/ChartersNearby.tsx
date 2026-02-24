'use client'

import { useEffect, useState } from 'react'
import { Anchor, Loader2 } from 'lucide-react'

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
  boats: Boat[]
  boatsError?: string | null
}

interface Props {
  destinationHint?: string
}

export default function ChartersNearby({ destinationHint }: Props) {
  const [boats, setBoats] = useState<Boat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadBoats() {
      setLoading(true)
      setError(null)

      try {
        const body: any = {
          limit: 12,
          includeBoats: true,
        }

        if (destinationHint) {
          body.destinationName = destinationHint
        }

        const res = await fetch('/api/integrated-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          throw new Error('Failed to load nearby charters')
        }

        const data: SearchResponse = await res.json()
        if (!cancelled) {
          setBoats(Array.isArray(data.boats) ? data.boats.slice(0, 4) : [])
          setError(data.boatsError || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load nearby charters')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadBoats()

    return () => {
      cancelled = true
    }
  }, [destinationHint])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Finding boat charters near your stay...</span>
        </div>
      </div>
    )
  }

  if (!boats.length && !error) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Anchor className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Charters near this rental</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Pair your stay with a fishing charter or boat rental from Gulf Coast Charters.
      </p>

      {error && (
        <p className="text-xs text-red-600 mb-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {boats.map((boat, idx) => (
          <a
            key={boat.id || idx}
            href={boat.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-md transition"
          >
            {boat.image_url && (
              <div className="h-32 w-full overflow-hidden">
                <img
                  src={boat.image_url}
                  alt={boat.name || boat.title || 'Charter boat'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {boat.name || boat.title || 'Charter boat'}
              </p>
              {boat.current_price && (
                <p className="text-sm text-green-700 font-medium">
                  From ${boat.current_price.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-blue-600 mt-1 group-hover:underline">
                View details on Gulf Coast Charters →
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

