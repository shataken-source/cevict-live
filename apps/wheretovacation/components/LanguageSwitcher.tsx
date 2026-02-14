'use client'

import { useEffect, useState } from 'react'

type Locale = 'en' | 'es' | 'fr' | 'pt'

const LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
}

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<Locale>('en')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
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
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Locale
    setLanguage(next)
    setSaving(true)
    try {
      await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: next }),
      })
    } catch {
      // ignore errors; user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="language" className="sr-only">
        Language
      </label>
      <select
        id="language"
        value={language}
        onChange={handleChange}
        disabled={loading || saving}
        className="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 text-sm hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {(['en', 'es', 'fr', 'pt'] as Locale[]).map((code) => (
          <option key={code} value={code}>
            {LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  )
}

