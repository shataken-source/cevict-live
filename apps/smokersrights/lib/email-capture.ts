/**
 * Email Capture System
 * Handles free PDF downloads and premium subscription emails
 */

import { supabase } from './supabase'

export interface EmailCapture {
  email: string
  source: 'pdf_download' | 'premium_signup' | 'newsletter'
  metadata?: Record<string, any>
}

/**
 * Capture email for PDF download
 */
export async function captureEmailForPDF(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, this would:
    // 1. Save to database
    // 2. Send email with PDF link
    // 3. Track conversion
    
    // For now, store in localStorage for development
    if (typeof window !== 'undefined') {
      const captures = JSON.parse(localStorage.getItem('email_captures') || '[]')
      captures.push({
        email,
        source: 'pdf_download',
        capturedAt: new Date().toISOString(),
      })
      localStorage.setItem('email_captures', JSON.stringify(captures.slice(-1000)))
    }

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // TODO: Generate and send PDF download link
    // TODO: Save to database for analytics

    return { success: true }
  } catch (error) {
    console.error('[Email Capture] Error:', error)
    return { success: false, error: 'Failed to process request' }
  }
}

/**
 * Subscribe to premium updates
 */
export async function subscribeToPremium(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, this would:
    // 1. Create Stripe customer
    // 2. Create subscription
    // 3. Send welcome email
    // 4. Save to database

    if (typeof window !== 'undefined') {
      const subscriptions = JSON.parse(localStorage.getItem('premium_subscriptions') || '[]')
      subscriptions.push({
        email,
        subscribedAt: new Date().toISOString(),
        status: 'active',
      })
      localStorage.setItem('premium_subscriptions', JSON.stringify(subscriptions.slice(-1000)))
    }

    return { success: true }
  } catch (error) {
    console.error('[Premium Subscription] Error:', error)
    return { success: false, error: 'Failed to process subscription' }
  }
}

/**
 * Get email capture stats (for admin)
 */
export async function getEmailStats(): Promise<{
  totalCaptures: number
  pdfDownloads: number
  premiumSignups: number
}> {
  if (typeof window === 'undefined') {
    return { totalCaptures: 0, pdfDownloads: 0, premiumSignups: 0 }
  }

  const captures = JSON.parse(localStorage.getItem('email_captures') || '[]')
  const subscriptions = JSON.parse(localStorage.getItem('premium_subscriptions') || '[]')

  return {
    totalCaptures: captures.length,
    pdfDownloads: captures.filter((c: EmailCapture) => c.source === 'pdf_download').length,
    premiumSignups: subscriptions.length,
  }
}
