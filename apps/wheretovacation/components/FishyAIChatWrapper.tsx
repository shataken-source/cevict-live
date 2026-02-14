'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import FishyAIChat from './FishyAIChat'

export default function FishyAIChatWrapper() {
  const { user } = useAuth()
  const [language, setLanguage] = useState<string>('en')

  useEffect(() => {
    let cancelled = false
    fetch('/api/user/language', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.language && ['en', 'es', 'fr', 'pt'].includes(data.language)) {
          setLanguage(data.language)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FishyAIChat
      userType={user ? 'customer' : 'guest'}
      language={language}
    />
  )
}
