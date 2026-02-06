'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'

interface BookingButtonProps {
  rentalId: string
  rentalName: string
}

export default function BookingButton({ rentalId, rentalName }: BookingButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  const handleBooking = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/rentals/' + rentalId)
      return
    }

    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates')
      return
    }

    setLoading(true)

    try {
      // Create booking session
      const response = await fetch('/api/bookings/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalId,
          rentalName,
          checkIn,
          checkOut,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create booking session')
      }
    } catch (error) {
      alert('Failed to start booking. Please try again.')
      console.error('Booking error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Check-in
        </label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Check-out
        </label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          min={checkIn || new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <button
        onClick={handleBooking}
        disabled={loading || !checkIn || !checkOut}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            Book Now
          </>
        )}
      </button>
      {!user && (
        <p className="text-sm text-gray-600 text-center">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </a>{' '}
          to book
        </p>
      )}
    </div>
  )
}
