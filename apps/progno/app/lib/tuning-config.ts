/**
 * Tuning config: load from Supabase (saved via admin fine-tune page) and optionally apply to process.env.
 * Filters and the probability-analyzer signal read via getTuningConfigSync() so saved config takes effect.
 */

import { createClient } from '@supabase/supabase-js'

const CONFIG_ID = 'default'

let cache: Record<string, unknown> | null = null

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Return current tuning config (from cache). Call loadTuningConfigAndApply() at start of request to populate.
 */
export function getTuningConfigSync(): Record<string, unknown> | null {
  return cache
}

/**
 * Load tuning config from Supabase, set cache, and apply to process.env so existing code (filters, analyzer) sees it.
 * Call at the start of picks/today or any route that runs the pick engine.
 */
export async function loadTuningConfigAndApply(): Promise<Record<string, unknown>> {
  const sb = getSupabase()
  if (!sb) {
    cache = null
    return {}
  }
  try {
    const { data, error } = await sb.from('tuning_config').select('config').eq('id', CONFIG_ID).single()
    if (error || !data?.config) {
      cache = null
      return {}
    }
    const config = (data.config as Record<string, unknown>) || {}
    cache = config
    // Apply to process.env so env-based code (e.g. league floors, HOME_ONLY) sees it
    for (const [k, v] of Object.entries(config)) {
      if (v !== undefined && v !== null) {
        if (typeof v === 'object' && !Array.isArray(v)) {
          // e.g. SPORT_MULTIPLIERS: store as JSON string so env can be parsed elsewhere if needed
          process.env[k] = JSON.stringify(v)
        } else {
          process.env[k] = String(v)
        }
      }
    }
    return config
  } catch {
    cache = null
    return {}
  }
}

/**
 * Save tuning config to Supabase (used by admin POST).
 */
export async function saveTuningConfig(config: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase not configured' }
  try {
    const { error } = await sb.from('tuning_config').upsert(
      { id: CONFIG_ID, config, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) return { ok: false, error: error.message }
    cache = config
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Save failed' }
  }
}

/**
 * Get config for admin (merge Supabase + current env defaults).
 */
export async function getTuningConfigForAdmin(): Promise<Record<string, unknown>> {
  const sb = getSupabase()
  const defaults = getEnvDefaults()
  if (!sb) return defaults
  try {
    const { data, error } = await sb.from('tuning_config').select('config').eq('id', CONFIG_ID).single()
    if (error || !data?.config) return defaults
    return { ...defaults, ...(data.config as Record<string, unknown>) }
  } catch {
    return defaults
  }
}

function getEnvDefaults(): Record<string, unknown> {
  return {
    HOME_ONLY_MODE: process.env.HOME_ONLY_MODE ?? '0',
    PROGNO_FLOOR_NBA: Number(process.env.PROGNO_FLOOR_NBA ?? 58),
    PROGNO_FLOOR_NHL: Number(process.env.PROGNO_FLOOR_NHL ?? 62),
    PROGNO_FLOOR_NFL: Number(process.env.PROGNO_FLOOR_NFL ?? 60),
    PROGNO_FLOOR_MLB: Number(process.env.PROGNO_FLOOR_MLB ?? 57),
    PROGNO_FLOOR_NCAAB: Number(process.env.PROGNO_FLOOR_NCAAB ?? 62),
    PROGNO_FLOOR_NCAAF: Number(process.env.PROGNO_FLOOR_NCAAF ?? 62),
    PROGNO_FLOOR_CBB: Number(process.env.PROGNO_FLOOR_CBB ?? 66),
    PROGNO_FLOOR_NCAA: Number(process.env.PROGNO_FLOOR_NCAA ?? 66),
    PROGNO_MIN_CONFIDENCE: Number(process.env.PROGNO_MIN_CONFIDENCE ?? 58),
    BLEND_WEIGHT: 0.1,
    CONFIDENCE_WEIGHT: 1,
    EDGE_WEIGHT: 0.8,
    SPREAD_WEIGHT: 0.3,
    FLIP_THRESHOLD: 45,
    SPORT_MULTIPLIERS: {
      NBA: 0,
      NHL: 0,
      MLB: 1,
      NCAAB: 0,
      NCAAF: 1,
      NFL: 1,
      NCAA: 0,
      CBB: 0,
    },
  }
}
