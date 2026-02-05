/**
 * Settings utility
 * Gets configuration values from database first, then falls back to environment variables
 */

import { supabase } from './supabase'

let settingsCache: Record<string, string> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute cache

/**
 * Get a setting value from database or environment variable
 * @param key - Setting key (e.g., 'TWITTER_TRENDS_LOCATION')
 * @param defaultValue - Default value if not found
 * @returns Setting value
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  // Check cache first
  const now = Date.now()
  if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
    if (key in settingsCache) {
      return settingsCache[key] || defaultValue
    }
  }

  try {
    // Try to get from database
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (!error && data && data.value) {
      // Update cache
      if (!settingsCache) settingsCache = {}
      settingsCache[key] = data.value
      cacheTimestamp = now
      return data.value
    }
  } catch (error) {
    // Database error, fall through to env var
    console.warn(`[Settings] Error fetching setting ${key} from DB:`, error)
  }

  // Fall back to environment variable
  const envValue = process.env[key]
  if (envValue) {
    // Update cache
    if (!settingsCache) settingsCache = {}
    settingsCache[key] = envValue
    cacheTimestamp = now
    return envValue
  }

  return defaultValue
}

/**
 * Get all settings (for admin display)
 */
export async function getAllSettings(): Promise<Record<string, { value: string; description?: string; category?: string; is_sensitive?: boolean }>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, description, category, is_sensitive')
      .order('category')
      .order('key')

    if (error) {
      console.error('[Settings] Error fetching all settings:', error)
      return {}
    }

    const settings: Record<string, any> = {}
    for (const setting of data || []) {
      settings[setting.key] = {
        value: setting.is_sensitive ? '***' : setting.value,
        description: setting.description,
        category: setting.category,
        is_sensitive: setting.is_sensitive,
      }
    }

    return settings
  } catch (error) {
    console.error('[Settings] Error in getAllSettings:', error)
    return {}
  }
}

/**
 * Update a setting in the database
 */
export async function updateSetting(key: string, value: string, description?: string, category?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        description: description || null,
        category: category || 'general',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      })

    if (error) {
      console.error('[Settings] Error updating setting:', error)
      return false
    }

    // Clear cache
    settingsCache = null
    cacheTimestamp = 0

    return true
  } catch (error) {
    console.error('[Settings] Error in updateSetting:', error)
    return false
  }
}

/**
 * Clear settings cache (call after updating settings)
 */
export function clearSettingsCache() {
  settingsCache = null
  cacheTimestamp = 0
}
