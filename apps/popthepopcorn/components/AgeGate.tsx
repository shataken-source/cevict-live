'use client'

import { useState, useEffect } from 'react'
import { Calendar, AlertTriangle } from 'lucide-react'

interface AgeGateProps {
  onVerified: () => void
  minimumAge?: number
}

/**
 * Age Verification Gate
 * Required for legal compliance (2026 state laws)
 * Uses Age Signal API or simple date verification
 */
export default function AgeGate({ onVerified, minimumAge = 13 }: AgeGateProps) {
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Check if already verified (stored in sessionStorage)
  useEffect(() => {
    const verified = sessionStorage.getItem('age_verified')
    if (verified === 'true') {
      onVerified()
    }
  }, [onVerified])

  const handleVerify = async () => {
    if (!birthDate) {
      setError('Please enter your birth date')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const birth = new Date(birthDate)
      const today = new Date()
      const age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      const dayDiff = today.getDate() - birth.getDate()

      // Calculate exact age
      let exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }

      if (exactAge < minimumAge) {
        setError(`You must be at least ${minimumAge} years old to use this app.`)
        setIsVerifying(false)
        return
      }

      // Store verification (session-based, not permanent)
      sessionStorage.setItem('age_verified', 'true')
      
      // Optional: Use Age Signal API for stricter verification
      // const ageSignalApiKey = process.env.NEXT_PUBLIC_AGE_SIGNAL_API_KEY
      // if (ageSignalApiKey) {
      //   const response = await fetch('https://api.agesignal.com/verify', {
      //     method: 'POST',
      //     headers: { 'Authorization': `Bearer ${ageSignalApiKey}` },
      //     body: JSON.stringify({ birthDate }),
      //   })
      //   if (!response.ok) throw new Error('Age verification failed')
      // }

      onVerified()
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#1A0A2E] to-[#0A0A0A] z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A1A1A] border-2 border-[#FFD700] rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-6xl animate-bounce">🍿</span>
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>🍿</span>
            <span className="text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>🍿</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Welcome to The Kernel</h1>
          <p className="text-gray-400">Grab your popcorn • Age verification required</p>
        </div>

        <div className="mb-6">
          <label className="block text-left text-sm font-semibold text-gray-300 mb-2">
            <Calendar size={16} className="inline mr-2" />
            Date of Birth
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => {
              setBirthDate(e.target.value)
              setError('')
            }}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
          />
          {error && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || !birthDate}
          className="w-full px-6 py-4 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-[#FFC700] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify Age & Enter'}
        </button>

        <p className="mt-4 text-xs text-gray-500">
          You must be {minimumAge}+ to use this app. We don't store your birth date.
        </p>
      </div>
    </div>
  )
}
