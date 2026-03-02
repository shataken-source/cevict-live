import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' as any })
  return _stripe
}

export const TRAILERVEGAS_PRICE_CENTS = 1000
export const TRAILERVEGAS_PRODUCT_NAME = 'TrailerVegas Pick Grading Report'
