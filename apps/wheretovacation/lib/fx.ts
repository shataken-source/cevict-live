/**
 * FX snapshot for bookings and display.
 * Uses Frankfurter (free, no key) for rates. Fallback: 1:1 for non-USD.
 */

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

export type FxCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'MXN' | 'BRL'

export interface FxSnapshot {
  from: 'USD'
  to: FxCurrency
  rate: number
  at: string
}

/** Fetch rate 1 USD = X in `toCurrency`. Returns null on failure. */
export async function fetchUsdToRate(toCurrency: string): Promise<FxSnapshot | null> {
  const to = (toCurrency || 'USD').toUpperCase()
  if (to === 'USD') {
    return { from: 'USD', to: 'USD', rate: 1, at: new Date().toISOString() }
  }

  try {
    const url = `${FRANKFURTER_BASE}/latest?from=USD&to=${encodeURIComponent(to)}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const rate = data?.rates?.[to]
    if (typeof rate !== 'number') return null
    return {
      from: 'USD',
      to: to as FxCurrency,
      rate,
      at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Convert amount from USD to display currency using a snapshot rate. */
export function convertUsdToDisplay(amountUsd: number, fx: FxSnapshot | null): number {
  if (!fx || fx.to === 'USD') return amountUsd
  return Math.round(amountUsd * fx.rate * 100) / 100
}

/** Format amount in currency for display (no symbol; backend use). */
export function formatAmount(value: number, currency: string): string {
  const c = (currency || 'USD').toUpperCase()
  if (c === 'USD') return `$${value.toFixed(2)}`
  if (c === 'EUR') return `€${value.toFixed(2)}`
  if (c === 'GBP') return `£${value.toFixed(2)}`
  if (c === 'BRL') return `R$${value.toFixed(2)}`
  if (c === 'MXN') return `$${value.toFixed(2)} MXN`
  return `${value.toFixed(2)} ${c}`
}
