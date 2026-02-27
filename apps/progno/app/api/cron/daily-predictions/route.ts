/**
 * Cron: Generate daily predictions (Cevict Flex) and write to predictions-YYYY-MM-DD.json
 * Schedule: 8 AM daily. Call with Authorization: Bearer CRON_SECRET.
 *
 * Uses /api/picks/today (same engine as your manual run). Writes to app root so
 * you get predictions-YYYY-MM-DD.json for grading later.
 */

import { NextResponse } from 'next/server'
import { ElitePicksEnhancer } from '@/app/lib/elite-picks-enhancer'
import { TierAssignmentService } from '@/app/lib/tier-assignment-service'

// Initialize enhancer for Elite tier
const eliteEnhancer = new ElitePicksEnhancer()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function getBaseUrl(): string {
  if (process.env.CRON_APP_URL) return process.env.CRON_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3008'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  const bypass = process.env.NODE_ENV !== 'production' || process.env.BYPASS_CONSENT === 'true'
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}` && !bypass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use America/Chicago timezone for date calculation (handles CST/CDT automatically)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const baseUrl = getBaseUrl()
  const urlObj = request.url ? new URL(request.url) : null
  const earlyLines = urlObj?.searchParams?.get('earlyLines') === '1' || urlObj?.searchParams?.get('earlyLines') === 'true'
  const paramDate = urlObj?.searchParams?.get('date')
  const runDate = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : today

  try {
    const url = earlyLines ? `${baseUrl}/api/picks/today?earlyLines=1&date=${runDate}` : `${baseUrl}/api/picks/today?date=${runDate}`
    const controller = new AbortController()
    const timeoutMs = process.env.NODE_ENV !== 'production' ? 45000 : 15000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal }).finally(() => clearTimeout(timeout))
    if (!res.ok) {
      const text = await res.text()
      console.error('[CRON daily-predictions] picks/today failed:', res.status, text)
      return NextResponse.json(
        { success: false, error: `picks/today failed: ${res.status}`, detail: text.slice(0, 200) },
        { status: 502 }
      )
    }

    let data: any
    try {
      data = await res.json()
    } catch {
      const text = await res.text()
      return NextResponse.json(
        { success: false, error: 'Invalid JSON from picks/today', detail: text.slice(0, 200) },
        { status: 502 }
      )
    }
    const rawPicks = data.picks ?? []
    const r2 = (n: number | null | undefined) => (n == null ? n : Math.round((n as number) * 100) / 100)
    const r4 = (n: number | null | undefined) => (n == null ? n : Math.round((n as number) * 10000) / 10000)
    const picks = rawPicks.map((p: any) => ({
      ...p,
      confidence: typeof p.confidence === 'number' ? Math.round(p.confidence) : p.confidence,
      expected_value: r2(p.expected_value),
      value_bet_edge: r2(p.value_bet_edge),
      value_bet_ev: r2(p.value_bet_ev),
      value_bet_kelly: r4(p.value_bet_kelly),
      composite_score: r2(p.composite_score),
      claude_effect: r4(p.claude_effect),
      sentiment_field: r4(p.sentiment_field),
      narrative_momentum: r4(p.narrative_momentum),
      information_asymmetry: r4(p.information_asymmetry),
      chaos_sensitivity: r4(p.chaos_sensitivity),
      news_impact: r4(p.news_impact),
      temporal_decay: r4(p.temporal_decay),
      external_pressure: r4(p.external_pressure),
      mc_win_probability: r4(p.mc_win_probability),
      mc_spread_probability: r4(p.mc_spread_probability),
      mc_total_probability: r4(p.mc_total_probability),
      ...(p.experimental_factors && {
        experimental_factors: {
          ...p.experimental_factors,
          ...(typeof p.experimental_factors.confidence_delta === 'number' && { confidence_delta: r2(p.experimental_factors.confidence_delta) }),
        },
      }),
    }))
    const payload = {
      date: runDate,
      generatedAt: new Date().toISOString(),
      count: picks.length,
      message: data.message ?? (earlyLines ? 'Cevict Flex early lines (2-5 days ahead)' : 'Cevict Flex daily picks'),
      earlyLines: earlyLines ?? false,
      picks,
    }

    const fileName = earlyLines ? `predictions-early-${runDate}.json` : `predictions-${runDate}.json`

    // Persist picks to Supabase for queryable history, backtest API, and admin panel
    const _supUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const _supKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!_supKey) {
      console.error('[CRON daily-predictions] Missing SUPABASE_SERVICE_ROLE_KEY — skipping persistence')
    }
    if (_supUrl && _supKey && picks.length > 0) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const _sb = createClient(_supUrl, _supKey)
        // Derive game_date from each pick's commence_time using CT timezone
        // This prevents tomorrow's games from being filed under today's date
        const gameDate = (p: any): string => {
          const ct = p.commence_time || p.game_time
          if (ct) {
            try {
              const d = new Date(ct)
              if (!isNaN(d.getTime())) {
                // Use CT timezone (America/Chicago) — a game at 2026-02-28T02:00Z = Feb 27 evening CT
                return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
              }
            } catch { }
          }
          return runDate
        }
        const pickRows = picks.map((p: any) => ({
          game_id: p.game_id || p.id || null,
          game_date: gameDate(p),
          game_time: p.commence_time || null,   // verify-results cron reads this
          game_matchup: p.game_matchup || `${p.away_team} @ ${p.home_team}`,
          home_team: p.home_team,
          away_team: p.away_team,
          sport: (p.sport || 'unknown').toLowerCase(),
          league: (p.league || p.sport || 'unknown').toUpperCase(),
          pick: p.pick,
          confidence: typeof p.confidence === 'number' ? p.confidence : null,
          odds: p.odds ?? null,
          is_home: typeof p.is_home === 'boolean' ? p.is_home : (p.pick === p.home_team),
          early_lines: earlyLines,
          commence_time: p.commence_time || null,
          expected_value: typeof p.expected_value === 'number' ? p.expected_value : null,
          kelly_fraction: typeof p.value_bet_kelly === 'number' ? p.value_bet_kelly : null,
          status: 'pending',
          result: null,                         // verify-results reads .is('result', null)
        }))
        const { error: _pErr } = await _sb
          .from('picks')
          .upsert(pickRows, { onConflict: 'game_date,home_team,away_team,early_lines' })
        if (_pErr) {
          console.warn(`[CRON daily-predictions] Supabase picks write:`, _pErr.message)
        } else {
          console.log(`[CRON daily-predictions] Persisted ${pickRows.length} picks to Supabase`)
        }

        // Group picks by actual game date (CT) and write per-date prediction files
        // This prevents tomorrow's games from being filed under today's date
        const picksByDate = new Map<string, any[]>()
        for (const p of picks) {
          const gd = gameDate(p)
          if (!picksByDate.has(gd)) picksByDate.set(gd, [])
          picksByDate.get(gd)!.push(p)
        }

        const { writeFileSync } = await import('fs').catch(() => ({ writeFileSync: null as any }))
        const { join } = await import('path').catch(() => ({ join: (...args: string[]) => args.join('/') }))

        for (const [gd, datePicks] of picksByDate) {
          const datePayload = {
            date: gd,
            generatedAt: new Date().toISOString(),
            count: datePicks.length,
            message: `${payload.message} — ${gd === runDate ? 'Regular' : 'Next-day'} (${datePicks.length} picks)`,
            earlyLines: earlyLines ?? false,
            picks: datePicks,
          }
          const dateFileName = earlyLines ? `predictions-early-${gd}.json` : `predictions-${gd}.json`
          const dateJsonContent = JSON.stringify(datePayload, null, 2)

          // Upload to Supabase Storage
          const { error: _storErr } = await _sb.storage
            .from('predictions')
            .upload(dateFileName, Buffer.from(dateJsonContent, 'utf8'), {
              contentType: 'application/json',
              upsert: true,
            })
          if (_storErr) {
            console.warn(`[CRON daily-predictions] Storage upload ${dateFileName}:`, _storErr.message)
          } else {
            console.log(`[CRON daily-predictions] Uploaded ${dateFileName} (${datePicks.length} picks)`)
          }

          // Write to local filesystem
          if (writeFileSync) {
            try {
              const localPath = join(process.cwd(), dateFileName)
              writeFileSync(localPath, dateJsonContent, 'utf8')
              console.log(`[CRON daily-predictions] Wrote local: ${localPath}`)
            } catch (_fsErr: any) {
              console.warn(`[CRON daily-predictions] Local write failed:`, _fsErr?.message)
            }
          }
        }
      } catch (_e: any) {
        console.warn(`[CRON daily-predictions] Supabase picks write skipped:`, _e?.message)
      }
    }

    console.log(`[CRON daily-predictions] Generated ${picks.length} picks for ${runDate}`)

    // Syndicate to Prognostication if configured
    // Prefer a full webhook URL when provided; otherwise fall back to base URL + default path.
    const rawBaseUrl =
      process.env.PROGNOSTICATION_URL ||
      process.env.NEXT_PUBLIC_PROGNOSTICATION_URL ||
      'https://prognostication.com'
    const webhookBaseUrl = rawBaseUrl.replace(/\/+$/, '')
    const webhookUrl =
      process.env.PROGNOSTICATION_WEBHOOK_URL ||
      `${webhookBaseUrl}/api/webhooks/progno`
    const apiKey = process.env.PROGNO_INTERNAL_API_KEY || process.env.PROGNO_API_KEY

    if (apiKey && picks.length > 0) {
      console.log('[CRON daily-predictions] Syndicating to Prognostication...')

      const syndicationResults = []
      const tiers = ['free', 'premium', 'elite'] as const

      // Assign tiers to picks using the backtest-validated tier service
      const tieredPicks = TierAssignmentService.assignTiers(picks.map((p: any) => ({
        ...p,
        id: p.id || `${p.home_team}-${p.away_team}-${p.commence_time}`,
        homeTeam: p.home_team,
        awayTeam: p.away_team,
        isHomePick: p.is_home_pick ?? (p.pick === p.home_team),
        pickType: (p.recommended_type || 'moneyline').toLowerCase(),
        gameTime: p.commence_time || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })))
      console.log(`[CRON daily-predictions] Tier breakdown: Elite=${TierAssignmentService.filterByTier(tieredPicks, 'elite').length}, Premium=${TierAssignmentService.filterByTier(tieredPicks, 'premium').length}, Free=${TierAssignmentService.filterByTier(tieredPicks, 'free').length}`)

      for (const tier of tiers) {
        let retries = 3
        let success = false
        let lastError = ''

        // Get picks for this tier (cumulative: free=free, premium=free+prem, elite=all)
        let tierPicks: any[]
        if (tier === 'free') {
          tierPicks = TierAssignmentService.filterByTier(tieredPicks, 'free')
        } else if (tier === 'premium') {
          tierPicks = [
            ...TierAssignmentService.filterByTier(tieredPicks, 'free'),
            ...TierAssignmentService.filterByTier(tieredPicks, 'premium'),
          ]
        } else {
          tierPicks = tieredPicks
        }

        while (retries > 0 && !success) {
          try {
            const batchId = `${runDate}-${tier}-${Date.now()}`

            let picksToSyndicate = tierPicks
            if (tier === 'elite') {
              console.log('[CRON daily-predictions] Enhancing Elite picks...')
              try {
                const enhanced = await eliteEnhancer.enhance(tierPicks.map(p => ({ ...p, tier: 'elite' })))
                picksToSyndicate = enhanced
                console.log(`[CRON daily-predictions] Enhanced ${enhanced.length} Elite picks`)
              } catch (err) {
                console.error('[CRON daily-predictions] Elite enhancement failed, using regular picks:', err)
              }
            }

            const synController = new AbortController()
            const synTimeout = setTimeout(() => synController.abort(), 15000)
            const syndicationRes = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-progno-api-key': apiKey,
                'x-batch-id': batchId,
              },
              body: JSON.stringify({
                tier,
                picks: picksToSyndicate,
                batchId,
                timestamp: new Date().toISOString(),
                source: 'progno-daily-cron',
              }),
              signal: synController.signal,
            }).finally(() => clearTimeout(synTimeout))

            if (syndicationRes.ok) {
              const result = await syndicationRes.json()
              syndicationResults.push({
                tier,
                status: 'success',
                count: result.processed || 0,
                batchId,
                duration: result.duration,
              })
              console.log(`[CRON daily-predictions] ✓ ${tier}: ${result.processed || 0} picks syndicated`)
              success = true
            } else {
              lastError = await syndicationRes.text()
              throw new Error(`HTTP ${syndicationRes.status}: ${lastError.slice(0, 100)}`)
            }
          } catch (err: any) {
            retries--
            lastError = err.message || 'Unknown error'
            console.error(`[CRON daily-predictions] ✗ ${tier} attempt failed (${retries} retries left):`, lastError)

            if (retries > 0) {
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
            }
          }
        }

        if (!success) {
          syndicationResults.push({
            tier,
            status: 'error',
            error: lastError.slice(0, 200),
          })
          console.error(`[CRON daily-predictions] ✗ ${tier} syndication failed after all retries`)
        }
      }

      console.log('[CRON daily-predictions] Syndication complete:', syndicationResults)
    } else {
      console.log(`[CRON daily-predictions] Skipping syndication: ${!apiKey ? 'No API key configured' : 'No picks to syndicate'}`)
    }
    return NextResponse.json({
      success: true,
      date: runDate,
      file: fileName,
      count: picks.length,
      earlyLines: earlyLines ?? false,
      message: `Saved ${picks.length} picks to Supabase (${fileName})`,
    })
  } catch (err: any) {
    console.error('[CRON daily-predictions]', err)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Failed to generate or write predictions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
