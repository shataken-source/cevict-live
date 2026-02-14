'use client'

import { useState, useEffect } from 'react'
import { Heart, Trash2, Save, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import type { PropertyCardRental } from '@/components/PropertyCard'

interface ItinerarySummary {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  total_estimated_cost: number
  updated_at: string
}

interface TripPlannerProps {
  savedProperties: PropertyCardRental[]
  onRemove: (id: string) => void
  onLoadTrip?: (rentals: PropertyCardRental[]) => void
}

export function TripPlanner({ savedProperties, onRemove, onLoadTrip }: TripPlannerProps) {
  const { user } = useAuth()
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<'idle' | 'saved' | 'error'>('idle')
  const [loadingTrip, setLoadingTrip] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/itineraries', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.itineraries) {
          setItineraries(
            data.itineraries.map((i: any) => ({
              id: i.id,
              name: i.name || 'My Trip',
              start_date: i.start_date ?? null,
              end_date: i.end_date ?? null,
              total_estimated_cost: Number(i.total_estimated_cost) || 0,
              updated_at: i.updated_at,
            }))
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  const handleSaveTrip = async () => {
    if (!user || !savedProperties.length) return
    setSaving(true)
    setSaveMessage('idle')
    try {
      const res = await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'My Trip',
          items: savedProperties.map((p) => ({
            type: 'rental',
            refId: p.id,
            name: p.name,
            price: p.nightly_rate ?? 0,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.itinerary) {
          setItineraries((prev) => [
            {
              id: data.itinerary.id,
              name: data.itinerary.name || 'My Trip',
              start_date: data.itinerary.start_date ?? null,
              end_date: data.itinerary.end_date ?? null,
              total_estimated_cost: Number(data.itinerary.total_estimated_cost) || 0,
              updated_at: data.itinerary.updated_at,
            },
            ...prev,
          ])
        }
        setSaveMessage('saved')
        setTimeout(() => setSaveMessage('idle'), 3000)
      } else {
        setSaveMessage('error')
      }
    } catch {
      setSaveMessage('error')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadTrip = async (itineraryId: string) => {
    if (!onLoadTrip) return
    setLoadingTrip(true)
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const items = data.itinerary?.items ?? []
      const refIds = items.map((i: { refId?: string }) => i.refId).filter(Boolean)
      if (refIds.length === 0) {
        onLoadTrip([])
        return
      }
      const rentalsRes = await fetch('/api/rentals', { credentials: 'include' })
      const rentalsData = await rentalsRes.json()
      const allRentals: PropertyCardRental[] = rentalsData.rentals ?? []
      const loaded = allRentals.filter((r: PropertyCardRental) => refIds.includes(r.id))
      onLoadTrip(loaded)
    } catch {
      // ignore
    } finally {
      setLoadingTrip(false)
    }
  }

  if (!savedProperties.length && !user) return null
  if (!savedProperties.length && itineraries.length === 0) return null

  const totalCost = savedProperties.reduce((sum, p) => sum + (p.nightly_rate ?? 0), 0)

  return (
    <section className="py-16 bg-gradient-to-br from-pink-50 to-purple-50 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Your Trip Planner
            </h2>
          </div>
          {user && itineraries.length > 0 && onLoadTrip && (
            <div className="flex items-center gap-2">
              <label htmlFor="load-trip" className="text-sm text-gray-600">
                Load trip:
              </label>
              <select
                id="load-trip"
                disabled={loadingTrip}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 text-sm"
                value=""
                onChange={(e) => {
                  const id = e.target.value
                  if (id) handleLoadTrip(id)
                }}
              >
                <option value="">Select...</option>
                {itineraries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (${i.total_estimated_cost?.toLocaleString() ?? 0})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {savedProperties.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {savedProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg overflow-hidden shadow-lg"
                >
                  {property.photos?.[0] && (
                    <img
                      src={property.photos[0]}
                      alt={property.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">
                      {property.name}
                    </h3>
                    {(property.city || property.state || property.address) && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-1">
                        {property.city && property.state
                          ? `${property.city}, ${property.state}`
                          : property.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 font-bold">
                        {property.nightly_rate != null
                          ? `$${property.nightly_rate.toLocaleString()}/night`
                          : 'Rate TBD'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(property.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                        aria-label={`Remove ${property.name} from trip`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-bold text-gray-900">
                  Total Estimated Nightly Cost:
                </span>
                <span className="text-3xl font-bold text-blue-600">
                  ${totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {user && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveTrip}
                    className="flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-70"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saving ? 'Saving...' : 'Save this trip'}
                  </button>
                )}
                {!user && (
                  <p className="text-gray-600 py-2">
                    Sign in to save this trip and load it later.
                  </p>
                )}
                {saveMessage === 'saved' && (
                  <span className="text-green-600 font-medium py-2">Saved!</span>
                )}
                {saveMessage === 'error' && (
                  <span className="text-red-600 font-medium py-2">Save failed. Try again.</span>
                )}
                <a
                  href="/rentals"
                  className="flex items-center justify-center py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition"
                >
                  Browse more rentals
                </a>
              </div>
            </div>
          </>
        )}

        {savedProperties.length === 0 && user && itineraries.length > 0 && onLoadTrip && (
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <p className="text-gray-600 mb-4">You have saved trips. Load one to continue planning.</p>
            <select
              aria-label="Load a saved trip"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700"
              value=""
              onChange={(e) => {
                const id = e.target.value
                if (id) handleLoadTrip(id)
              }}
            >
              <option value="">Select a trip...</option>
              {itineraries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (${i.total_estimated_cost?.toLocaleString() ?? 0})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  )
}

