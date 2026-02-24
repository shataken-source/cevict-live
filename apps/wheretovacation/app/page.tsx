'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { User, LogIn } from 'lucide-react'
import { Hero } from '@/components/Hero'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SearchFilters } from '@/components/SearchFilters'
import { PropertyCard } from '@/components/PropertyCard'
import { Footer } from '@/components/Footer'
import type { PropertyCardRental } from '@/components/PropertyCard'
import { TripPlanner } from '@/components/TripPlanner'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [properties, setProperties] = useState<PropertyCardRental[]>([])
  const [loadingRentals, setLoadingRentals] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [propertyType, setPropertyType] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [bedrooms, setBedrooms] = useState('all')
  const [saved, setSaved] = useState<PropertyCardRental[]>([])
  const [language, setLanguage] = useState<'en' | 'es' | 'fr' | 'pt'>('en')

  const handleExplore = () => {
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadRentals = async () => {
    setLoadingRentals(true)
    try {
      const res = await fetch('/api/rentals')
      const data = await res.json()
      const list = data.rentals ?? []
      setProperties(Array.isArray(list) ? list : [])
    } catch {
      setProperties([])
    } finally {
      setLoadingRentals(false)
    }
  }

  useEffect(() => {
    loadRentals()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadLanguage = async () => {
      try {
        const res = await fetch('/api/user/language', { credentials: 'include' })
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.language && ['en', 'es', 'fr', 'pt'].includes(data.language)) {
            setLanguage(data.language)
          }
        }
      } catch {
        // ignore
      }
    }
    loadLanguage()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = () => {
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredProperties = properties.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchName = p.name?.toLowerCase().includes(term)
      const matchAddress = p.address?.toLowerCase().includes(term)
      if (!matchName && !matchAddress) return false
    }
    if (propertyType !== 'all' && (p.type || '') !== propertyType) return false
    if (minPrice && (p.nightly_rate ?? 0) < parseFloat(minPrice)) return false
    if (maxPrice && (p.nightly_rate ?? 0) > parseFloat(maxPrice)) return false
    if (bedrooms !== 'all' && (p.bedrooms ?? 0) < parseInt(bedrooms, 10)) return false
    return true
  })

  const toggleSave = (property: PropertyCardRental) => {
    setSaved((prev) => {
      const exists = prev.some((p) => p.id === property.id)
      if (exists) {
        return prev.filter((p) => p.id !== property.id)
      }
      return [...prev, property]
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Where To Vacation
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link href="/search" className="text-gray-700 hover:text-blue-600">
                Search
              </Link>
              <Link href="/packages" className="text-gray-700 hover:text-blue-600">
                Packages
              </Link>
              {user && (
                <Link href="/bookings" className="text-gray-700 hover:text-blue-600">
                  My Bookings
                </Link>
              )}
              {!loading && (
                <>
                  {user ? (
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                    >
                      <User className="w-5 h-5" />
                      Profile
                    </Link>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                    >
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <Hero onExplore={handleExplore} language={language} />

      <section id="properties" className="py-16 scroll-mt-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Find Your Perfect Stay
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Luxury waterfront rentals at the world&apos;s most beautiful vacation destinations
          </p>

          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            propertyType={propertyType}
            setPropertyType={setPropertyType}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            bedrooms={bedrooms}
            setBedrooms={setBedrooms}
            onSearch={handleSearch}
          />

          {loadingRentals ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  saved={saved.some((p) => p.id === property.id)}
                  onToggleSave={() => toggleSave(property)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 text-lg mb-4">
                No properties match your filters. Try adjusting your search or browse all rentals.
              </p>
              <Link
                href="/rentals"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Browse Rentals
              </Link>
            </div>
          )}
        </div>
      </section>

      <TripPlanner
        savedProperties={saved}
        onRemove={(id) =>
          setSaved((prev) => prev.filter((p) => p.id !== id))
        }
        onLoadTrip={(rentals) => setSaved(rentals)}
      />

      <Footer />
    </div>
  )
}
