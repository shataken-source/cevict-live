'use client'

import { Coffee, Heart } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface BuyMeACoffeeProps {
  username?: string
  variant?: 'button' | 'card' | 'floating'
  kofiUrl?: string
}

/**
 * Ko-fi / Tip Jar Component
 *
 * Quick monetization - visitors can support the site
 * Uses Ko-fi: https://ko-fi.com/cevict
 */
export default function BuyMeACoffee({
  username = 'cevict',
  variant = 'button',
  kofiUrl = 'https://ko-fi.com/cevict?ref=onboarding_email_founderwelcome'
}: BuyMeACoffeeProps) {
  const [showOptions, setShowOptions] = useState(false)

  const handleSupport = (amount?: number) => {
    const url = amount
      ? `${kofiUrl}&amount=${amount}`
      : kofiUrl

    window.open(url, '_blank')
    toast.success('Thanks for supporting PopThePopcorn! 🍿')
  }

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => handleSupport()}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        >
          <Coffee className="w-5 h-5" />
          <span className="hidden sm:inline">Support Us</span>
        </button>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-xl p-6 text-center">
        <Coffee className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Support the Drama</h3>
        <p className="text-slate-400 text-sm mb-4">
          Help us keep the popcorn popping. Your support keeps the news flowing!
        </p>

        {showOptions ? (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleSupport(3)}
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              $3
            </button>
            <button
              onClick={() => handleSupport(5)}
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              $5
            </button>
            <button
              onClick={() => handleSupport(10)}
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              $10
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowOptions(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <Heart className="w-4 h-4" />
            Support Us
          </button>
        )}
      </div>
    )
  }

  // Default button variant
  return (
    <button
      onClick={() => handleSupport()}
      className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 hover:text-amber-300 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
    >
      <Coffee className="w-4 h-4" />
      Support Us
    </button>
  )
}
