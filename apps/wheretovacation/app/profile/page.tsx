'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, Mail, Calendar, LogOut, ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<any[] | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    async function loadBookings() {
      try {
        setBookingsError(null)
        const res = await fetch('/api/bookings/list')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load bookings')
        }
        const body = await res.json()
        if (!cancelled) {
          setBookings(body.bookings || [])
        }
      } catch (err) {
        if (!cancelled) {
          setBookingsError(err instanceof Error ? err.message : 'Failed to load bookings')
        }
      }
    }

    loadBookings()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.user_metadata?.full_name || 'User'}
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Member since</p>
                      <p className="text-gray-900">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link
                    href="/search"
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    Search Destinations
                  </Link>
                  <Link
                    href="/rentals"
                    className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                  >
                    View Rentals
                  </Link>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
                {bookingsError && (
                  <p className="text-sm text-red-600 mb-2">{bookingsError}</p>
                )}
                {bookings === null && !bookingsError && (
                  <p className="text-sm text-gray-500">Loading bookings…</p>
                )}
                {bookings && bookings.length === 0 && !bookingsError && (
                  <p className="text-sm text-gray-500">
                    No bookings yet. When you book a rental, it will appear here.
                  </p>
                )}
                {bookings && bookings.length > 0 && (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {b.check_in && b.check_out
                              ? `${new Date(b.check_in).toLocaleDateString()} → ${new Date(
                                  b.check_out
                                ).toLocaleDateString()}`
                              : 'Booking'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status: {b.status || 'pending'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-lg font-bold text-blue-600">
                            ${Number(b.total_amount ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
