/**
 * External API Request Throttle
 * Prevents rate limit errors from third-party APIs (API-Sports, The Odds API, etc.)
 * by queuing outbound requests with per-provider limits and exponential backoff.
 */

interface ThrottleConfig {
  maxPerMinute: number
  maxPerDay: number
  minIntervalMs: number
  backoffMultiplier: number
  maxBackoffMs: number
}

interface RequestRecord {
  timestamps: number[]
  dailyCount: number
  dailyReset: number
  currentBackoff: number
  lastRequest: number
}

const PROVIDER_CONFIGS: Record<string, ThrottleConfig> = {
  'api-sports': {
    maxPerMinute: 10,
    maxPerDay: 100,
    minIntervalMs: 6500,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
  },
  'the-odds-api': {
    maxPerMinute: 15,
    maxPerDay: 500,
    minIntervalMs: 4000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
  },
  'espn': {
    maxPerMinute: 30,
    maxPerDay: 5000,
    minIntervalMs: 2000,
    backoffMultiplier: 1.5,
    maxBackoffMs: 15000,
  },
  'default': {
    maxPerMinute: 20,
    maxPerDay: 1000,
    minIntervalMs: 3000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
  },
}

const records = new Map<string, RequestRecord>()

function getRecord(provider: string): RequestRecord {
  const now = Date.now()
  const dayStart = new Date().setHours(0, 0, 0, 0)

  if (!records.has(provider)) {
    records.set(provider, {
      timestamps: [],
      dailyCount: 0,
      dailyReset: dayStart + 86400000,
      currentBackoff: 0,
      lastRequest: 0,
    })
  }

  const rec = records.get(provider)!
  if (now >= rec.dailyReset) {
    rec.dailyCount = 0
    rec.dailyReset = dayStart + 86400000
  }
  rec.timestamps = rec.timestamps.filter(t => now - t < 60000)
  return rec
}

function getConfig(provider: string): ThrottleConfig {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS['default']
}

export interface ThrottleResult {
  allowed: boolean
  waitMs: number
  reason?: string
  minuteUsed: number
  dailyUsed: number
  dailyLimit: number
}

export function canMakeRequest(provider: string): ThrottleResult {
  const config = getConfig(provider)
  const rec = getRecord(provider)
  const now = Date.now()

  if (rec.dailyCount >= config.maxPerDay) {
    return {
      allowed: false,
      waitMs: rec.dailyReset - now,
      reason: `Daily limit reached (${config.maxPerDay})`,
      minuteUsed: rec.timestamps.length,
      dailyUsed: rec.dailyCount,
      dailyLimit: config.maxPerDay,
    }
  }

  if (rec.timestamps.length >= config.maxPerMinute) {
    const oldest = rec.timestamps[0]
    const waitMs = 60000 - (now - oldest) + 100
    return {
      allowed: false,
      waitMs,
      reason: `Per-minute limit reached (${config.maxPerMinute}/min)`,
      minuteUsed: rec.timestamps.length,
      dailyUsed: rec.dailyCount,
      dailyLimit: config.maxPerDay,
    }
  }

  const timeSinceLast = now - rec.lastRequest
  const effectiveInterval = Math.max(config.minIntervalMs, rec.currentBackoff)
  if (timeSinceLast < effectiveInterval) {
    return {
      allowed: false,
      waitMs: effectiveInterval - timeSinceLast,
      reason: `Min interval not met (${effectiveInterval}ms)`,
      minuteUsed: rec.timestamps.length,
      dailyUsed: rec.dailyCount,
      dailyLimit: config.maxPerDay,
    }
  }

  return {
    allowed: true,
    waitMs: 0,
    minuteUsed: rec.timestamps.length,
    dailyUsed: rec.dailyCount,
    dailyLimit: config.maxPerDay,
  }
}

export function recordRequest(provider: string): void {
  const rec = getRecord(provider)
  const now = Date.now()
  rec.timestamps.push(now)
  rec.dailyCount++
  rec.lastRequest = now
  rec.currentBackoff = 0
}

export function recordRateLimitHit(provider: string): void {
  const config = getConfig(provider)
  const rec = getRecord(provider)
  if (rec.currentBackoff === 0) {
    rec.currentBackoff = config.minIntervalMs * 2
  } else {
    rec.currentBackoff = Math.min(rec.currentBackoff * config.backoffMultiplier, config.maxBackoffMs)
  }
  console.warn(`[Throttle] ${provider} rate limit hit — backoff now ${rec.currentBackoff}ms`)
}

export async function throttledFetch(
  provider: string,
  url: string,
  options?: RequestInit
): Promise<Response> {
  const check = canMakeRequest(provider)
  if (!check.allowed) {
    console.log(`[Throttle] ${provider} waiting ${check.waitMs}ms — ${check.reason}`)
    await new Promise(resolve => setTimeout(resolve, check.waitMs))
  }

  recordRequest(provider)
  const res = await fetch(url, options)

  if (res.status === 429) {
    recordRateLimitHit(provider)
    const retryCheck = canMakeRequest(provider)
    console.log(`[Throttle] ${provider} 429 — retry after ${retryCheck.waitMs}ms`)
    await new Promise(resolve => setTimeout(resolve, retryCheck.waitMs))
    recordRequest(provider)
    return fetch(url, options)
  }

  return res
}

export function getProviderStatus(provider: string): ThrottleResult & { backoffMs: number } {
  const check = canMakeRequest(provider)
  const rec = getRecord(provider)
  return { ...check, backoffMs: rec.currentBackoff }
}

export function getAllProviderStatuses(): Record<string, ThrottleResult & { backoffMs: number }> {
  const providers = Object.keys(PROVIDER_CONFIGS).filter(p => p !== 'default')
  const result: Record<string, ThrottleResult & { backoffMs: number }> = {}
  for (const p of providers) {
    result[p] = getProviderStatus(p)
  }
  return result
}
