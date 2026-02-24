import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { pt } from './pt'

export type Locale = 'en' | 'es' | 'fr' | 'pt'

const translations: Record<Locale, typeof en> = { en, es, fr, pt }

/**
 * Server-side translation: get string by key path and locale.
 * Fallback: en. Key path e.g. 'hero.title' -> hero.title
 */
export function t(locale: string, keyPath: string): string {
  const loc = (locale && translations[locale as Locale]) ? locale as Locale : 'en'
  const keys = keyPath.split('.')
  let node: unknown = translations[loc]
  for (const k of keys) {
    node = node && typeof node === 'object' && k in node ? (node as Record<string, unknown>)[k] : undefined
  }
  if (typeof node === 'string') return node
  node = translations.en
  for (const k of keys) {
    node = node && typeof node === 'object' && k in node ? (node as Record<string, unknown>)[k] : undefined
  }
  return typeof node === 'string' ? node : keyPath
}

export { en, es, fr, pt }
export type { EnKeys } from './en'
