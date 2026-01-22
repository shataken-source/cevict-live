'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function ReportLostPage() {
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
    location: '', // Single location field - accepts "Columbus Indiana"
    date_lost: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Client-side validation with better error messages
    const errors: string[] = []

    if (!form.location || !form.location.trim()) {
      errors.push('Please enter the location where your pet was last seen (e.g., "Columbus Indiana" or "Columbus, IN")')
    } else if (form.location.trim().length > 200) {
      errors.push('Location is too long (maximum 200 characters)')
    }

    if (!form.color || !form.color.trim()) {
      errors.push('Please enter your pet\'s color')
    } else if (form.color.trim().length > 50) {
      errors.push('Color is too long (maximum 50 characters)')
    }

    if (!form.date_lost) {
      errors.push('Please select the date your pet was lost')
    } else {
      const date = new Date(form.date_lost)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (date > today) {
        errors.push('Date cannot be in the future')
      }
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      if (date < tenYearsAgo) {
        errors.push('Date cannot be more than 10 years ago')
      }
    }

    if (form.petName && form.petName.trim().length > 100) {
      errors.push('Pet name is too long (maximum 100 characters)')
    }

    if (form.breed && form.breed.trim().length > 100) {
      errors.push('Breed is too long (maximum 100 characters)')
    }

    if (form.description && form.description.trim().length > 2000) {
      errors.push('Description is too long (maximum 2000 characters)')
    }

    if (form.owner_email && form.owner_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.owner_email.trim())) {
        errors.push('Please enter a valid email address')
      }
    }

    if (form.owner_phone && form.owner_phone.trim()) {
      const cleaned = form.owner_phone.replace(/[\s\-\(\)\+]/g, '')
      if (!/^\d{10,15}$/.test(cleaned)) {
        errors.push('Please enter a valid phone number (10-15 digits)')
      }
    }

    if (errors.length > 0) {
      setError(errors.join('. '))
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/report-lost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petName: form.petName.trim() || null,
          petType: form.petType,
          breed: form.breed.trim() || null,
          color: form.color.trim(),
          size: form.size || null,
          age: form.age.trim() || null,
          gender: form.gender || null,
          description: form.description.trim() || null,
          location: form.location.trim(),
          date_lost: form.date_lost,
          owner_name: form.owner_name.trim() || null,
          owner_email: form.owner_email.trim() || null,
          owner_phone: form.owner_phone.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors from API
        if (data.errors && typeof data.errors === 'object') {
          const apiErrors = Object.values(data.errors) as string[]
          throw new Error(apiErrors.join('. '))
        }
        const errorMsg = data.error || data.details || 'Failed to submit report'
        throw new Error(errorMsg)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/search')
      }, 2000)
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your lost pet report has been submitted successfully. Our AI bots are now searching for your pet.
          </p>
          <Link
            href="/search"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search for Pets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Lost Pet</h1>
          <p className="text-gray-600 mb-6">
            Help us find your pet by providing as much information as possible.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pet Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pet Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Name
                  </label>
                  <input
                    type="text"
                    value={form.petName}
                    onChange={(e) => setForm({ ...form, petName: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Buddy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pet Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.petType}
                    onChange={(e) => setForm({ ...form, petType: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Breed
                  </label>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Labrador"
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Brown, Black, White"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size
                  </label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="text"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2 years old"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any distinctive markings, collar, microchip info, etc."
                />
                {form.description.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {form.description.length} / {2000} characters
                  </p>
                )}
              </div>
            </div>

            {/* When & Where */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">When & Where</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Lost <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_lost}
                    onChange={(e) => setForm({ ...form, date_lost: e.target.value })}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Seen Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                    maxLength={200}
                    placeholder="e.g., Columbus Indiana or Columbus, Indiana"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Enter city and state (e.g., "Columbus Indiana" or "Columbus, IN")
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.owner_email}
                    onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                    maxLength={255}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.owner_phone}
                    onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                    maxLength={20}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
