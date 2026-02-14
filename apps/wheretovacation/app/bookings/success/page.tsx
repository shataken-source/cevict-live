'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home } from 'lucide-react'
import { t } from '@/lib/translations'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<'en' | 'es' | 'fr' | 'pt'>('en')
  const [formattedTotal, setFormattedTotal] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<{ check_in?: string; check_out?: string; nights?: number } | null>(null)

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

    if (sessionId) {
      fetch(`/api/bookings/verify?session_id=${sessionId}`)
        .then(async () => {
          const bySession = await fetch(`/api/bookings/by-session?session_id=${sessionId}`, { credentials: 'include' })
          if (!cancelled && bySession.ok) {
            const data = await bySession.json()
            setFormattedTotal(data.formatted_total ?? null)
            if (data.booking) {
              setBookingDetails({
                check_in: data.booking.check_in,
                check_out: data.booking.check_out,
                nights: data.booking.nights,
              })
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">{t('en', 'common.loading')}</p>
        </div>
      </div>
    )
  }

  const title = t(language, 'booking.confirm')
  const description = t(language, 'booking.description')
  const viewMore = t(language, 'booking.viewMoreRentals')
  const backHome = t(language, 'booking.backToHome')
  const totalLabel = t(language, 'booking.total')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">{description}</p>
        {formattedTotal != null && (
          <p className="text-lg font-semibold text-gray-800 mb-6">
            {totalLabel}: {formattedTotal}
            {bookingDetails?.check_in && bookingDetails?.check_out && (
              <span className="block text-sm font-normal text-gray-600 mt-1">
                {bookingDetails.check_in} → {bookingDetails.check_out}
                {bookingDetails.nights != null && ` (${bookingDetails.nights} ${t(language, 'booking.nights')})`}
              </span>
            )}
          </p>
        )}
        {!formattedTotal && bookingDetails && (
          <p className="text-gray-600 mb-6">
            {bookingDetails.check_in} → {bookingDetails.check_out}
            {bookingDetails.nights != null && ` (${bookingDetails.nights} ${t(language, 'booking.nights')})`}
          </p>
        )}
        {!formattedTotal && !bookingDetails && <div className="mb-6" />}
        <div className="space-y-3">
          <Link
            href="/rentals"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {viewMore}
          </Link>
          <Link
            href="/"
            className="block w-full flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600"
          >
            <Home className="w-4 h-4" />
            {backHome}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
