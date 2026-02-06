'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, MapPin, Users, DollarSign, Search, Filter } from 'lucide-react'

interface Rental {
  id: string
  name: string
  type: string
  description?: string
  bedrooms?: number
  bathrooms?: number
  max_guests?: number
  nightly_rate?: number
  weekly_rate?: number
  address?: string
  distance_to_beach_miles?: number
  photos?: string[]
  amenities?: string[]
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    minBedrooms: '',
    maxPrice: '',
    type: '',
  })

  useEffect(() => {
    // Fetch rentals from API
    fetch('/api/rentals')
      .then((res) => res.json())
      .then((data) => {
        if (data.rentals) {
          setRentals(data.rentals)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const filteredRentals = rentals.filter((rental) => {
    if (searchQuery && !rental.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filters.minBedrooms && (rental.bedrooms || 0) < parseInt(filters.minBedrooms)) {
      return false
    }
    if (filters.maxPrice && (rental.nightly_rate || 0) > parseFloat(filters.maxPrice)) {
      return false
    }
    if (filters.type && rental.type !== filters.type) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Vacation Rentals</h1>
          <p className="text-gray-600">Find your perfect vacation rental</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rentals..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Bedrooms
              </label>
              <select
                value={filters.minBedrooms}
                onChange={(e) => setFilters({ ...filters, minBedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price/Night
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="$500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Types</option>
                <option value="vacation_rental">Vacation Rental</option>
                <option value="hotel">Hotel</option>
                <option value="condo">Condo</option>
                <option value="resort">Resort</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading rentals...</p>
          </div>
        ) : filteredRentals.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRentals.map((rental) => (
              <Link
                key={rental.id}
                href={`/rentals/${rental.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {rental.photos && rental.photos.length > 0 && (
                  <img
                    src={rental.photos[0]}
                    alt={rental.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{rental.name}</h3>
                    {rental.type && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {rental.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {rental.address && (
                    <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {rental.address}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    {rental.bedrooms && (
                      <span className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        {rental.bedrooms} BR
                      </span>
                    )}
                    {rental.max_guests && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {rental.max_guests} guests
                      </span>
                    )}
                  </div>
                  {rental.nightly_rate && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-gray-900">
                        ${rental.nightly_rate.toLocaleString()}
                      </span>
                      <span className="text-gray-600">/night</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg">No rentals found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
