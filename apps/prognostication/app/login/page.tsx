'use client'
import BannerPlaceholder from '@/components/BannerPlaceholder'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check user tier via Stripe
      const response = await fetch(`/api/user/tier?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (data.tier === 'free' && !data.hasAccess) {
        // User exists but is free tier - redirect to pricing
        setSuccess(true)
        setTimeout(() => {
          window.location.href = `/pricing?email=${encodeURIComponent(email)}`
        }, 1500)
        return
      }

      if (data.hasAccess) {
        // User has paid subscription - log them in
        const sessionToken = btoa(`${email}:${Date.now()}`)
        document.cookie = `auth_email=${encodeURIComponent(email)}; path=/; max-age=604800; SameSite=Strict`
        document.cookie = `auth_tier=${data.tier}; path=/; max-age=604800; SameSite=Strict`
        document.cookie = `auth_token=${sessionToken}; path=/; max-age=604800; SameSite=Strict`
        
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/picks'
        }, 1000)
        return
      }

      // New user - redirect to signup
      window.location.href = `/pricing?email=${encodeURIComponent(email)}`
      
    } catch (err: any) {
      setError('Unable to verify account. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-pink-900 flex flex-col">
      {/* Header Banner */}
      <div className="p-4">
        <BannerPlaceholder position="header" adSlot="prognostication-login-header" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-3xl mb-4 shadow-lg shadow-purple-500/30">
              🎯
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-gray-400 mt-2">Sign in to access your picks</p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-green-400 text-lg">Logged in successfully!</p>
              <p className="text-gray-400 mt-2">Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isValidEmail(email)}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                  loading || !isValidEmail(email)
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:scale-[1.02]'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-900 text-gray-400">or</span>
                </div>
              </div>

              <a
                href="/pricing"
                className="block w-full py-4 rounded-xl font-bold text-center text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                Create Account
              </a>
            </form>
          )}

          <div className="mt-8 text-center">
            <a href="/" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
              ← Back to Home
            </a>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <p className="text-sm text-purple-300 text-center">
              💡 Your email is linked to your Stripe subscription. 
              Use the same email you used to purchase.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="p-4">
        <BannerPlaceholder position="footer" adSlot="prognostication-login-footer" />
      </div>
    </div>
  )
}
