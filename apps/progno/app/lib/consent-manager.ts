/**
 * Consent Manager
 * Tracks user legal acknowledgments for Alabama compliance
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface ConsentRecord {
  userId: string;
  apiKey?: string;
  consentTimestamp: string; // ISO timestamp
  ipAddress?: string;
  userAgent?: string;
  consentText: string; // Full text user agreed to
  version: string; // Legal text version for tracking changes
}

export interface ConsentValidation {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  requiresRenewal: boolean;
}

const CONSENT_EXPIRY_DAYS = 30;
const CONSENT_VERSION = '1.0.0-2025-AL';

/**
 * Record user consent acknowledgment
 */
export async function recordConsent(
  userId: string,
  consentText: string,
  metadata?: {
    apiKey?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<ConsentRecord> {
  const consentRecord: ConsentRecord = {
    userId,
    apiKey: metadata?.apiKey,
    consentTimestamp: new Date().toISOString(),
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    consentText,
    version: CONSENT_VERSION,
  };

  if (supabase) {
    try {
      const { error } = await supabase
        .from('user_consents')
        .upsert({
          user_id: userId,
          api_key: metadata?.apiKey,
          consent_timestamp: consentRecord.consentTimestamp,
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          consent_text: consentText,
          version: CONSENT_VERSION,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('[Consent] Failed to record consent:', error);
        // Continue anyway - consent is still valid in memory
      }
    } catch (error) {
      console.error('[Consent] Database error:', error);
    }
  }

  return consentRecord;
}

/**
 * Validate consent from header or database
 */
export async function validateConsent(
  userId: string,
  consentHeader?: string
): Promise<ConsentValidation> {
  // Check header first (most recent)
  if (consentHeader) {
    try {
      const headerTimestamp = new Date(consentHeader);
      if (!isNaN(headerTimestamp.getTime())) {
        const daysSince = (Date.now() - headerTimestamp.getTime()) / (1000 * 60 * 60 * 24);
        const isValid = daysSince < CONSENT_EXPIRY_DAYS;

        return {
          isValid,
          isExpired: !isValid,
          daysRemaining: Math.max(0, CONSENT_EXPIRY_DAYS - daysSince),
          requiresRenewal: daysSince > (CONSENT_EXPIRY_DAYS * 0.8), // Warn at 80% expiry
        };
      }
    } catch (error) {
      console.warn('[Consent] Invalid header format:', error);
    }
  }

  // Fallback to database lookup
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('consent_timestamp, version')
        .eq('user_id', userId)
        .single();

      if (!error && data?.consent_timestamp) {
        const consentTimestamp = new Date(data.consent_timestamp);
        const daysSince = (Date.now() - consentTimestamp.getTime()) / (1000 * 60 * 60 * 24);
        const isValid = daysSince < CONSENT_EXPIRY_DAYS;

        return {
          isValid,
          isExpired: !isValid,
          daysRemaining: Math.max(0, CONSENT_EXPIRY_DAYS - daysSince),
          requiresRenewal: daysSince > (CONSENT_EXPIRY_DAYS * 0.8),
        };
      }
    } catch (error) {
      console.error('[Consent] Database lookup failed:', error);
    }
  }

  // No consent found
  return {
    isValid: false,
    isExpired: true,
    daysRemaining: 0,
    requiresRenewal: true,
  };
}

/**
 * Get consent text for display
 */
export function getConsentText(): string {
  return `PROGNO ULTIMATE ANALYTICS: USER ACKNOWLEDGMENT

NOT A SPORTSBOOK: I understand that Progno is a data analytics suite and does not facilitate wagering.

NO GUARANTEES: I acknowledge that Monte Carlo simulations and Arbitrage alerts are based on historical 2025 SportsBlaze data and real-time market feeds which can be delayed or inaccurate.

ALABAMA COMPLIANCE: I certify that I am complying with all local, state, and federal laws. I understand that using this data for illegal gambling in the State of Alabama is strictly prohibited.

LIMITATION OF LIABILITY: I agree that Progno and its developers are not liable for any financial losses incurred. I am using this "Skill-Based Tool" for informational purposes only.

By typing "I AGREE" below, I acknowledge that I have read, understood, and agree to all terms above.`;
}

/**
 * Extract user ID from API key (if using key-based auth)
 */
export function getUserIdFromApiKey(apiKey?: string): string | null {
  if (!apiKey) return null;
  // In a real system, you'd look up the API key in your database
  // For now, return a hash of the key as a user identifier
  return `user_${Buffer.from(apiKey).toString('base64').substring(0, 16)}`;
}

