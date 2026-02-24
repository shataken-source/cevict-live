/**
 * Currency conversion and formatting for i18n (GCC-style).
 * Backend and future UI: convert USD to display currency, format for locale.
 */

import { fetchUsdToRate, convertUsdToDisplay, formatAmount, type FxSnapshot } from './fx'

export type DisplayCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'MXN' | 'BRL'

/** Get rate snapshot for display currency (cached by caller if needed). */
export async function getRateForCurrency(toCurrency: string): Promise<FxSnapshot | null> {
  return fetchUsdToRate(toCurrency)
}

/** Convert USD amount to display currency and format. */
export async function formatUsdInCurrency(amountUsd: number, currency: string): Promise<string> {
  const c = (currency || 'USD').toUpperCase()
  if (c === 'USD') return formatAmount(amountUsd, 'USD')
  const snapshot = await fetchUsdToRate(c)
  const displayAmount = snapshot ? convertUsdToDisplay(amountUsd, snapshot) : amountUsd
  return formatAmount(displayAmount, c)
}

export { convertUsdToDisplay, formatAmount, fetchUsdToRate }
export type { FxSnapshot, FxCurrency } from './fx'
