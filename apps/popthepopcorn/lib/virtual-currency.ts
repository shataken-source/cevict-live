/**
 * Virtual Currency System - "Kernels" or "Salt"
 * Gen Z gamification for engagement
 * Users earn Salt by voting, commenting, streaks
 * Can spend to boost stories or unlock premium features
 */

import { supabase } from './supabase'
import { trackTransaction } from './transaction-tracking'
import { isRestrictedNotificationHours } from './age-verification'

export interface UserBalance {
  kernels: number
  salt: number
  streak: number
  lastActiveDate: string
}

/**
 * Get user balance (by IP address for now, upgrade to auth later)
 */
export async function getUserBalance(userIdentifier: string): Promise<UserBalance> {
  // In production, this would use user authentication
  // For now, using IP-based tracking (stored in localStorage)
  
  const stored = localStorage.getItem(`balance_${userIdentifier}`)
  if (stored) {
    return JSON.parse(stored)
  }

  return {
    kernels: 0,
    salt: 0,
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
  }
}

/**
 * Award Salt for actions
 */
export async function awardSalt(
  userIdentifier: string,
  amount: number,
  reason: 'vote' | 'streak' | 'comment' | 'daily_check'
): Promise<number> {
  const balance = await getUserBalance(userIdentifier)
  const newSalt = balance.salt + amount
  
  const updated: UserBalance = {
    ...balance,
    salt: newSalt,
  }
  
  localStorage.setItem(`balance_${userIdentifier}`, JSON.stringify(updated))
  
  return newSalt
}

/**
 * Check and update streak
 */
export async function updateStreak(userIdentifier: string): Promise<number> {
  const balance = await getUserBalance(userIdentifier)
  const today = new Date().toISOString().split('T')[0]
  
  let newStreak = balance.streak
  if (balance.lastActiveDate === today) {
    // Already checked today
    return newStreak
  }
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  if (balance.lastActiveDate === yesterdayStr) {
    // Consecutive day - increment streak
    newStreak = balance.streak + 1
  } else if (balance.lastActiveDate < yesterdayStr) {
    // Streak broken - reset
    newStreak = 1
  } else {
    // First time
    newStreak = 1
  }
  
  // Award Salt for streak
  let saltBonus = 0
  if (newStreak >= 3) {
    saltBonus = Math.min(10, newStreak) // 1-10 Salt per day for streaks
    await awardSalt(userIdentifier, saltBonus, 'streak')
  }
  
  const updated: UserBalance = {
    ...balance,
    streak: newStreak,
    lastActiveDate: today,
    salt: balance.salt + saltBonus,
  }
  
  localStorage.setItem(`balance_${userIdentifier}`, JSON.stringify(updated))
  
  return newStreak
}

/**
 * Spend Salt to boost a story
 * Tracks transaction for 2026 IRS reporting
 */
export async function spendSalt(
  userIdentifier: string,
  amount: number,
  action: 'boost_story' | 'unlock_deep_dive'
): Promise<boolean> {
  const balance = await getUserBalance(userIdentifier)
  
  if (balance.salt < amount) {
    return false // Insufficient funds
  }
  
  const updated: UserBalance = {
    ...balance,
    salt: balance.salt - amount,
  }
  
  localStorage.setItem(`balance_${userIdentifier}`, JSON.stringify(updated))
  
  // Track transaction for tax reporting (2026 IRS compliance)
  await trackTransaction(
    userIdentifier,
    'spend',
    amount,
    'salt',
    `Spent ${amount} Salt for ${action}`
  )
  
  return true
}

/**
 * Get streak badge emoji
 */
export function getStreakBadge(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥'
  if (streak >= 14) return '🔥🔥'
  if (streak >= 7) return '🔥'
  if (streak >= 3) return '⭐'
  return ''
}
