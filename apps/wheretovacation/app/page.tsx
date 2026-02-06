'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { User, LogIn } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Where To Vacation
            </Link>
            <div className="flex items-center gap-4">
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
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Where To Vacation
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plan your perfect vacation with rentals, hotels, activities, and destination guides
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link
            href="/search"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Search Destinations</h2>
            <p className="text-gray-600">
              Find your perfect vacation destination
            </p>
          </Link>

          <Link
            href="/packages"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Build Package</h2>
            <p className="text-gray-600">
              Create custom vacation packages
            </p>
          </Link>

          <Link
            href="/rentals"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Vacation Rentals</h2>
            <p className="text-gray-600">
              Browse available rentals
            </p>
          </Link>

          <Link
            href="/api/integrated-search"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">API: Integrated Search</h2>
            <p className="text-gray-600">
              Search destinations and boats
            </p>
          </Link>

          <Link
            href="/api/gcc/boats"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">API: GCC Boats</h2>
            <p className="text-gray-600">
              Proxy for Gulf Coast Charters boat listings
            </p>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Integration with{' '}
            <a
              href="https://gulfcoastcharters.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Gulf Coast Charters
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
