'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShareCardProps {
  headline: {
    title: string
    url: string
    drama_score: number
    probability?: number
  }
}

/**
 * Share Card Generator
 * Creates shareable content for Gen Z platforms
 * Includes drama score, probability, and "The Kernel" branding
 */
export default function ShareCard({ headline }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  const shareText = `🍿 ${headline.title}\n\nDrama: ${headline.drama_score}/10${headline.probability ? ` • Probability: ${headline.probability}%` : ''}\n\n${headline.url}\n\n— The Kernel 🍿`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: headline.title,
          text: shareText,
          url: headline.url,
        })
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast.success('Copied to clipboard! 🍿')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    toast.success('Copied to clipboard! 🍿')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-lg hover:from-[#FFC700] hover:to-[#FF5B25] font-bold text-sm transition-all shadow-lg shadow-[#FFD700]/30"
      >
        <Share2 size={16} />
        Share
      </button>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
          copied
            ? 'bg-green-600 text-white'
            : 'bg-[#1A1A1A] border-2 border-[#333] text-gray-300 hover:border-[#FFD700] hover:text-[#FFD700]'
        }`}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
