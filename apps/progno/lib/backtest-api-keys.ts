/**
 * Backtesting API Key Management
 *
 * Handles validation and management of API keys for users
 * who purchase access to PROGNO backtesting data.
 */

import { getSupabase } from './supabase-client';

export interface BacktestApiKeyValidation {
  valid: boolean;
  keyId?: string;
  userEmail?: string;
  tier?: 'basic' | 'pro' | 'enterprise';
  requestsRemaining?: number;
  allowedSports?: string[];
  historicalYears?: number;
  message: string;
}

export interface BacktestApiKeyRecord {
  id: string;
  apiKey: string;
  userEmail: string;
  userName?: string;
  tier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  requestsPerDay: number;
  requestsUsedToday: number;
  totalRequests: number;
  allowedSports: string[];
  historicalYears: number;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  purchaseReference?: string;
  notes?: string;
}

/**
 * Validate an API key for backtesting data access
 * Calls the database function that checks key validity and updates usage stats
 */
export async function validateBacktestApiKey(
  apiKey: string
): Promise<BacktestApiKeyValidation> {
  try {
    const supabase = getSupabase();

    const { data, error } = await (supabase as any)
      .rpc('validate_backtest_api_key', {
        p_api_key: apiKey
      }) as { data: any; error: any };

    if (error) {
      console.error('[BacktestAPIKey] Validation error:', error);
      return {
        valid: false,
        message: 'Validation system error'
      };
    }

    if (!data || data.length === 0) {
      return {
        valid: false,
        message: 'Invalid API key'
      };
    }

    const result = data[0];

    return {
      valid: result.valid,
      keyId: result.key_id,
      userEmail: result.user_email,
      tier: result.tier as 'basic' | 'pro' | 'enterprise',
      requestsRemaining: result.requests_remaining,
      allowedSports: result.allowed_sports,
      historicalYears: result.historical_years,
      message: result.message
    };

  } catch (error) {
    console.error('[BacktestAPIKey] Unexpected error:', error);
    return {
      valid: false,
      message: 'System error during validation'
    };
  }
}

/**
 * Check if a user has access to a specific sport
 */
export function hasSportAccess(
  validation: BacktestApiKeyValidation,
  sport: string
): boolean {
  if (!validation.valid || !validation.allowedSports) {
    return false;
  }

  return validation.allowedSports.includes(sport.toLowerCase());
}

/**
 * Check if a user has access to historical data for a given year
 */
export function hasHistoricalAccess(
  validation: BacktestApiKeyValidation,
  year: number
): boolean {
  if (!validation.valid || !validation.historicalYears) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  const yearsBack = currentYear - year;

  return yearsBack <= validation.historicalYears;
}

/**
 * Get key details by API key (admin only)
 */
export async function getBacktestKeyDetails(
  apiKey: string
): Promise<BacktestApiKeyRecord | null> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('backtest_api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .single() as { data: any; error: any };

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      apiKey: data.api_key,
      userEmail: data.user_email,
      userName: data.user_name,
      tier: data.tier,
      status: data.status,
      requestsPerDay: data.requests_per_day,
      requestsUsedToday: data.requests_used_today,
      totalRequests: data.total_requests,
      allowedSports: data.allowed_sports,
      historicalYears: data.historical_years,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      lastUsedAt: data.last_used_at,
      purchaseReference: data.purchase_reference,
      notes: data.notes
    };

  } catch (error) {
    console.error('[BacktestAPIKey] Error fetching key details:', error);
    return null;
  }
}

/**
 * Middleware helper to validate API key from request headers
 * Usage: const validation = await validateRequestApiKey(request);
 */
export async function validateRequestApiKey(
  request: Request
): Promise<BacktestApiKeyValidation> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      valid: false,
      message: 'Authorization header required'
    };
  }

  // Support "Bearer KEY" or just "KEY"
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey) {
    return {
      valid: false,
      message: 'API key required'
    };
  }

  return validateBacktestApiKey(apiKey);
}

/**
 * Get usage statistics for a key
 */
export async function getKeyUsageStats(apiKey: string): Promise<{
  dailyUsed: number;
  dailyLimit: number;
  totalUsed: number;
  remainingToday: number;
} | null> {
  const details = await getBacktestKeyDetails(apiKey);

  if (!details) {
    return null;
  }

  return {
    dailyUsed: details.requestsUsedToday,
    dailyLimit: details.requestsPerDay,
    totalUsed: details.totalRequests,
    remainingToday: details.requestsPerDay - details.requestsUsedToday
  };
}

/**
 * Create a new API key (admin only)
 * Note: This should only be callable from admin endpoints, not public API
 */
export async function createBacktestApiKey(
  userEmail: string,
  userName: string,
  tier: 'basic' | 'pro' | 'enterprise',
  historicalYears: number = 1,
  purchaseReference?: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();

    const { data, error } = await (supabase as any)
      .rpc('create_backtest_api_key', {
        p_user_email: userEmail,
        p_user_name: userName,
        p_tier: tier,
        p_historical_years: historicalYears,
        p_purchase_reference: purchaseReference
      }) as { data: any; error: any };

    if (error) {
      console.error('[BacktestAPIKey] Error creating key:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('[BacktestAPIKey] Unexpected error creating key:', error);
    return null;
  }
}

/**
 * Revoke an API key (admin only)
 */
export async function revokeBacktestApiKey(
  apiKey: string,
  reason?: string
): Promise<boolean> {
  try {
    const supabase = getSupabase();

    const { error } = await (supabase
      .from('backtest_api_keys') as any)
      .update({
        status: 'revoked',
        notes: reason || 'Revoked by admin'
      })
      .eq('api_key', apiKey);

    if (error) {
      console.error('[BacktestAPIKey] Error revoking key:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[BacktestAPIKey] Unexpected error revoking key:', error);
    return false;
  }
}

/**
 * List all active keys (admin only)
 */
export async function listActiveBacktestKeys(): Promise<BacktestApiKeyRecord[]> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('backtest_api_keys')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }) as { data: any[]; error: any };

    if (error || !data) {
      return [];
    }

    return data.map((record: any) => ({
      id: record.id,
      apiKey: record.api_key,
      userEmail: record.user_email,
      userName: record.user_name,
      tier: record.tier,
      status: record.status,
      requestsPerDay: record.requests_per_day,
      requestsUsedToday: record.requests_used_today,
      totalRequests: record.total_requests,
      allowedSports: record.allowed_sports,
      historicalYears: record.historical_years,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
      lastUsedAt: record.last_used_at,
      purchaseReference: record.purchase_reference,
      notes: record.notes
    }));

  } catch (error) {
    console.error('[BacktestAPIKey] Error listing keys:', error);
    return [];
  }
}
