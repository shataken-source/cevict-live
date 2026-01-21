/**
 * Monetization System - 2026 Hybrid Model
 * Gamified micro-transactions + high-intent native partnerships
 */

import { supabase } from './supabase'
import { trackTransaction } from './transaction-tracking'

export interface KernelPack {
  id: string
  name: string
  kernels: number
  price: number // in cents (USD)
  bonus?: number // bonus kernels
  popular?: boolean
}

export interface SeasonPass {
  id: string
  name: string
  price: number // in cents (USD)
  duration: number // days
  benefits: string[]
}

/**
 * Available Kernel Packs (Gen Z-friendly pricing)
 */
export const KERNEL_PACKS: KernelPack[] = [
  { id: 'pack_1', name: 'Snack Pack', kernels: 10, price: 99, bonus: 0 }, // $0.99
  { id: 'pack_2', name: 'Movie Night', kernels: 25, price: 199, bonus: 5 }, // $1.99 (30 total)
  { id: 'pack_3', name: 'Binge Bundle', kernels: 50, price: 399, bonus: 15, popular: true }, // $3.99 (65 total)
  { id: 'pack_4', name: 'Theater Box', kernels: 100, price: 699, bonus: 40 }, // $6.99 (140 total)
  { id: 'pack_5', name: 'Festival Pass', kernels: 250, price: 1499, bonus: 125 }, // $14.99 (375 total)
]

/**
 * Season Pass (Battle Pass for Drama)
 */
export const SEASON_PASS: SeasonPass = {
  id: 'season_pass_2026',
  name: 'Drama Season Pass',
  price: 299, // $2.99/month
  duration: 30,
  benefits: [
    'Exclusive badges and UI skins',
    'Early access to Probability Reports',
    'Daily check-in rewards (bonus Kernels)',
    'Ad-free experience',
    'Priority support',
    'Custom "Squishy" button themes',
  ],
}

/**
 * Purchase Kernel Pack
 */
export async function purchaseKernelPack(
  userIdentifier: string,
  packId: string,
  paymentIntentId?: string
): Promise<{ success: boolean; kernels: number; error?: string }> {
  const pack = KERNEL_PACKS.find(p => p.id === packId)
  if (!pack) {
    return { success: false, kernels: 0, error: 'Invalid pack ID' }
  }

  const totalKernels = pack.kernels + (pack.bonus || 0)

  await trackTransaction(
    userIdentifier,
    'earn',
    totalKernels,
    'kernels',
    `Purchased ${pack.name} pack`
  )

  if (typeof window !== 'undefined') {
    const purchases = JSON.parse(localStorage.getItem('kernel_purchases') || '[]')
    purchases.push({
      packId,
      packName: pack.name,
      kernels: totalKernels,
      price: pack.price,
      paymentIntentId,
      purchasedAt: new Date().toISOString(),
    })
    localStorage.setItem('kernel_purchases', JSON.stringify(purchases))
  }

  return { success: true, kernels: totalKernels }
}

/**
 * Boost a Story (Salt the Story)
 */
export async function boostStory(
  userIdentifier: string,
  headlineId: string,
  kernelsSpent: number
): Promise<{ success: boolean; boostMultiplier: number; error?: string }> {
  const userBalance = JSON.parse(localStorage.getItem(`balance_${userIdentifier}`) || '{"kernels": 0}')
  
  if (userBalance.kernels < kernelsSpent) {
    return { success: false, boostMultiplier: 1, error: 'Insufficient kernels' }
  }

  const boostMultiplier = Math.min(1 + (kernelsSpent * 0.1), 2.0)
  const duration = 24 // hours

  userBalance.kernels -= kernelsSpent
  localStorage.setItem(`balance_${userIdentifier}`, JSON.stringify(userBalance))

  await trackTransaction(
    userIdentifier,
    'spend',
    kernelsSpent,
    'kernels',
    `Boosted story ${headlineId}`
  )

  try {
    await supabase
      .from('story_boosts')
      .insert({
        headline_id: headlineId,
        user_identifier: userIdentifier,
        kernels_spent: kernelsSpent,
        boost_multiplier: boostMultiplier,
        expires_at: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
      })
  } catch (error) {
    console.error('[Monetization] Error storing boost:', error)
  }

  return { success: true, boostMultiplier }
}

/**
 * Subscribe to Season Pass
 */
export async function subscribeToSeasonPass(
  userIdentifier: string,
  paymentIntentId?: string
): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SEASON_PASS.duration)

  if (typeof window !== 'undefined') {
    localStorage.setItem(`season_pass_${userIdentifier}`, JSON.stringify({
      subscribedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      paymentIntentId,
    }))
  }

  return { success: true, expiresAt: expiresAt.toISOString() }
}

/**
 * Check if user has active Season Pass
 */
export function hasActiveSeasonPass(userIdentifier: string): boolean {
  if (typeof window === 'undefined') return false

  const subscription = localStorage.getItem(`season_pass_${userIdentifier}`)
  if (!subscription) return false

  const { expiresAt } = JSON.parse(subscription)
  return new Date(expiresAt) > new Date()
}

/**
 * Get active boosts for a headline
 */
export async function getHeadlineBoosts(headlineId: string): Promise<{
  totalBoost: number
  boostMultiplier: number
  activeBoosts: number
}> {
  try {
    const { data } = await supabase
      .from('story_boosts')
      .select('*')
      .eq('headline_id', headlineId)
      .gt('expires_at', new Date().toISOString())

    if (!data || data.length === 0) {
      return { totalBoost: 0, boostMultiplier: 1, activeBoosts: 0 }
    }

    const boostMultiplier = data.reduce((acc, boost) => acc * boost.boost_multiplier, 1)
    const totalBoost = data.reduce((acc, boost) => acc + boost.kernels_spent, 0)

    return {
      totalBoost,
      boostMultiplier: Math.min(boostMultiplier, 3.0),
      activeBoosts: data.length,
    }
  } catch (error) {
    console.error('[Monetization] Error fetching boosts:', error)
    return { totalBoost: 0, boostMultiplier: 1, activeBoosts: 0 }
  }
}
