'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Calendar, Ship } from 'lucide-react'

interface BookingRow {
  id: string
  rental_id: string | null
  check_in: string
  check_out: string
  total_amount: number
  status: string
  created_at: string
  is_package?: boolean
}

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/bookings/list', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) return null
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data?.bookings) {
          setBookings(data.bookings)
        }
        if (!cancelled && data?.error) {
          setError(data.error)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load bookings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sign in to view your bookings.</p>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/bookings')}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            My Bookings
          </h1>
          <p className="text-gray-600 mb-8">
            Your vacation rental and charter bookings. Trips that include both a rental and a charter are marked as a bundle.
          </p>

          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}

          {bookings.length === 0 && !error ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You don&apos;t have any bookings yet.</p>
              <Link
                href="/rentals"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Browse Rentals
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookings.map((b) => (
                <li
                  key={b.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {b.check_in} → {b.check_out}
                      </span>
                      {b.is_package && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5"
                          title="Rental + Charter bundle"
                        >
                          <Ship className="w-3.5 h-3.5" />
                          Rental + Charter
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Booked {b.created_at ? new Date(b.created_at).toLocaleDateString() : ''} •{' '}
                      <span className="capitalize">{b.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ${Number(b.total_amount ?? 0).toLocaleString()}
                    </p>
                    <Link
                      href={`/rentals/${b.rental_id || ''}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View property
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
