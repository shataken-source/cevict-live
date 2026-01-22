'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function ReportFoundPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [form, setForm] = useState({
    petName: '',
    petType: 'dog',
    breed: '',
    color: '',
    size: '',
    age: '',
    gender: '',
    description: '',
    location: '',
    date_found: '',
    finder_name: '',
    finder_email: '',
    finder_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const errors: string[] = []

    if (!form.location || !form.location.trim()) {
      errors.push('Please enter where you found the pet (e.g., "Columbus Indiana" or "Columbus, IN")')
    } else if (form.location.trim().length > 200) {
      errors.push('Location is too long (maximum 200 characters)')
    }

    if (!form.color || !form.color.trim()) {
      errors.push('Please enter the pet\'s color')
    } else if (form.color.trim().length > 50) {
      errors.push('Color is too long (maximum 50 characters)')
    }

    if (!form.date_found) {
      errors.push('Please select the date you found the pet')
    } else {
      const foundDate = new Date(form.date_found)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      if (foundDate > today) {
        errors.push('Date found cannot be in the future')
      }
      
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      if (foundDate < tenYearsAgo) {
        errors.push('Date found cannot be more than 10 years ago')
      }
    }

    if (form.finder_email && form.finder_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.finder_email.trim())) {
        errors.push('Please enter a valid email address')
      }
      if (form.finder_email.trim().length > 255) {
        errors.push('Email is too long (maximum 255 characters)')
      }
    }

    if (form.finder_phone && form.finder_phone.trim()) {
      const phoneDigits = form.finder_phone.replace(/\D/g, '')
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        errors.push('Phone number must be 10-15 digits')
      }
      if (form.finder_phone.trim().length > 20) {
        errors.push('Phone number is too long (maximum 20 characters)')
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/report-found', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          status: 'found',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to submit report')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/search')
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Found Pet</h1>
          <p className="text-gray-600 mb-6">
            Help reunite a found pet with their family. We'll automatically search for matching lost pet reports.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Please fix the following errors:</p>
                  <pre className="whitespace-pre-wrap text-sm">{error}</pre>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Report submitted successfully!</p>
                  <p className="text-sm mt-1">Redirecting to search page...</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pet Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.petType}
                    onChange={(e) => setForm({ ...form, petType: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    required
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Brown, Black, White"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where Found <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                    maxLength={200}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City, State (e.g., Columbus, Indiana)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: "City, State" or "City State"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Found <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_found}
                    onChange={(e) => setForm({ ...form, date_found: e.target.value })}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name (optional)
                  </label>
                  <input
                    type="text"
                    value={form.finder_name}
                    onChange={(e) => setForm({ ...form, finder_name: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.finder_email}
                    onChange={(e) => setForm({ ...form, finder_email: e.target.value })}
                    maxLength={255}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.finder_phone}
                    onChange={(e) => setForm({ ...form, finder_phone: e.target.value })}
                    maxLength={20}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Found Pet Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
