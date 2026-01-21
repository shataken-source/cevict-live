/**
 * Transaction Tracking for Virtual Currency
 * 2026 IRS Compliance: Form 1099-DA reporting for digital assets
 * Tracks all "Salt" transactions for tax reporting
 */

import { supabase } from './supabase'

interface VirtualCurrencyTransaction {
  id: string
  user_identifier: string
  transaction_type: 'earn' | 'spend' | 'transfer'
  amount: number
  currency: 'salt' | 'kernels'
  description: string
  cost_basis?: number // For tax reporting
  gross_proceeds?: number // For tax reporting
  created_at: string
}

/**
 * Track virtual currency transaction
 * Required for 2026 IRS broker reporting (Form 1099-DA)
 */
export async function trackTransaction(
  userIdentifier: string,
  transactionType: 'earn' | 'spend' | 'transfer',
  amount: number,
  currency: 'salt' | 'kernels',
  description: string
): Promise<void> {
  // In production, this would store in a transactions table
  // For now, we'll log it (upgrade to database table in v1.1)
  
  const transaction: VirtualCurrencyTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_identifier: userIdentifier,
    transaction_type: transactionType,
    amount,
    currency,
    description,
    cost_basis: transactionType === 'spend' ? amount : undefined, // Cost basis for spending
    gross_proceeds: transactionType === 'earn' ? amount : undefined, // Gross proceeds for earning
    created_at: new Date().toISOString(),
  }

  // Store in localStorage for now (upgrade to database)
  if (typeof window !== 'undefined') {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
    transactions.push(transaction)
    // Keep only last 1000 transactions
    const recentTransactions = transactions.slice(-1000)
    localStorage.setItem('transactions', JSON.stringify(recentTransactions))
  }

  console.log('[Transaction]', transaction)
}

/**
 * Get transaction history for a user
 * For 2026 IRS reporting
 */
export async function getTransactionHistory(userIdentifier: string): Promise<VirtualCurrencyTransaction[]> {
  if (typeof window === 'undefined') return []

  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
  return transactions.filter((tx: VirtualCurrencyTransaction) => tx.user_identifier === userIdentifier)
}

/**
 * Calculate tax basis for transactions
 * Required for Form 1099-DA
 */
export function calculateTaxBasis(transactions: VirtualCurrencyTransaction[]): {
  totalEarned: number
  totalSpent: number
  costBasis: number
  grossProceeds: number
} {
  const earned = transactions
    .filter(tx => tx.transaction_type === 'earn')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const spent = transactions
    .filter(tx => tx.transaction_type === 'spend')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const costBasis = transactions
    .filter(tx => tx.cost_basis)
    .reduce((sum, tx) => sum + (tx.cost_basis || 0), 0)

  const grossProceeds = transactions
    .filter(tx => tx.gross_proceeds)
    .reduce((sum, tx) => sum + (tx.gross_proceeds || 0), 0)

  return {
    totalEarned: earned,
    totalSpent: spent,
    costBasis,
    grossProceeds,
  }
}
