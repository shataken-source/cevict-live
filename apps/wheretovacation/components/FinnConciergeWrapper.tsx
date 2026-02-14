'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import FinnConcierge from './FinnConcierge'

export default function FinnConciergeWrapper() {
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

  return <FinnConcierge userId={user?.id} language={language} />
}
