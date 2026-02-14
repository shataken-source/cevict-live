'use client'

import Link from 'next/link'
import { MapPin, Users, Bed, Bath, Star } from 'lucide-react'

export interface PropertyCardRental {
  id: string
  name: string
  type?: string
  address?: string
  city?: string
  state?: string
  bedrooms?: number
  bathrooms?: number
  max_guests?: number
  nightly_rate?: number
  photos?: string[]
  featured?: boolean
  /** Optional rating 0–5; shown when present */
  rating?: number
}

interface PropertyCardProps {
  property: PropertyCardRental
  saved?: boolean
  onToggleSave?: (id: string) => void
}

export function PropertyCard({ property, saved, onToggleSave }: PropertyCardProps) {
  const imageUrl = property.photos?.[0] || null
  const city = property.city ?? (property.address ? property.address.split(',').slice(-2, -1)[0]?.trim() : null)
  const state = property.state ?? (property.address ? property.address.split(',').slice(-1)[0]?.trim() : null)
  const location = [city, state].filter(Boolean).join(', ') || property.address

  return (
    <Link href={`/rentals/${property.id}`} className="block group">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleSave(property.id)
              }}
              className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 text-gray-700 hover:bg-white shadow-sm"
              aria-label={saved ? 'Remove from trip plan' : 'Save to trip plan'}
            >
              <HeartIcon filled={!!saved} />
            </button>
          )}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={property.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl">
              🏠
            </div>
          )}
          {property.featured && (
            <span className="absolute top-2 right-2 rounded-full border-0 bg-amber-400 text-amber-900 text-xs font-semibold px-2.5 py-0.5">
              Featured
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1 flex-1 pr-2">{property.name}</h3>
            {property.rating != null && (
              <div className="flex items-center gap-1 text-sm shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{Number(property.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          {location && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{location}</span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {property.max_guests != null && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{property.max_guests}</span>
              </div>
            )}
            {property.bedrooms != null && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              {property.nightly_rate != null && (
                <>
                  <span className="text-2xl font-bold text-gray-900">
                    ${property.nightly_rate.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500"> /night</span>
                </>
              )}
            </div>
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              View Details
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        className="w-5 h-5 text-red-500 fill-red-500"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    )
  }
  return (
    <svg
      className="w-5 h-5 text-red-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

