/**
 * Admin preview for Claude Effect data collection (Phase 1–4).
 *
 * POST /api/progno/admin/data-collection/preview
 * Auth: Bearer <admin/cron secret> or x-admin-secret header.
 *
 * Body (all optional):
 * {
 *   "teamName": "Kansas City Chiefs",
 *   "stadium": { "name": "Arrowhead Stadium", "city": "Kansas City", "state": "MO" },
 *   "gameDate": "2026-03-02T18:30:00Z",
 *   "include": { "phase1": true, "phase3": true, "phase4": true }
 * }
 *
 * This is a **dry-run** endpoint: collectors run, but their store() methods currently just log.
 * No database writes are performed by this route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadDataFeedConfig } from '@/lib/data-collection/config'
import {
  DataCollectionConfig,
  SentimentDataCollector,
  NarrativeDataCollector,
  IAIDataCollector,
  CSIDataCollector,
} from '@/lib/data-collection/collectors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (request.headers.get('x-admin-secret') || '')
  if (!token) return false
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  const cronSecret = process.env.CRON_SECRET
  return (adminPassword && token === adminPassword) || (cronSecret && token === cronSecret)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const body = await request.json().catch(() => ({}))
  const teamName = typeof body.teamName === 'string' ? body.teamName.trim() : undefined
  const gameDateStr = typeof body.gameDate === 'string' ? body.gameDate : undefined
  const include = body.include || {}
  const stadium = body.stadium && typeof body.stadium === 'object'
    ? {
        name: String(body.stadium.name || ''),
        city: String(body.stadium.city || ''),
        state: String(body.stadium.state || ''),
      }
    : undefined

  const feedConfig = loadDataFeedConfig()

  const baseConfig: DataCollectionConfig = {
    phase1: {
      enabled: !!(feedConfig.twitter.enabled || feedConfig.news.enabled || feedConfig.facebook.enabled),
      sources: {
        twitter: feedConfig.twitter.enabled,
        instagram: feedConfig.instagram.enabled,
        news: feedConfig.news.enabled,
        pressConferences: feedConfig.pressConferences.enabled,
      },
      refreshInterval: 15,
    },
    phase2: {
      enabled: feedConfig.schedule.enabled || feedConfig.roster.enabled,
      sources: {
        schedule: feedConfig.schedule.enabled,
        roster: feedConfig.roster.enabled,
        news: feedConfig.news.enabled,
        social: feedConfig.twitter.enabled,
      },
      refreshInterval: 60,
    },
    phase3: {
      enabled: feedConfig.oddsAPI.enabled || feedConfig.betSplits.enabled,
      sources: {
        oddsApi: feedConfig.oddsAPI.enabled,
        lineMovement: feedConfig.oddsAPI.trackLineMovement,
        betSplits: feedConfig.betSplits.enabled,
      },
      refreshInterval: 5,
    },
    phase4: {
      enabled: feedConfig.weather.enabled || feedConfig.injuries.enabled || feedConfig.referee.enabled,
      sources: {
        weather: feedConfig.weather.enabled,
        injuries: feedConfig.injuries.enabled,
        referee: feedConfig.referee.enabled,
        schedule: feedConfig.schedule.enabled,
      },
      refreshInterval: 30,
    },
  }

  const sentiment = include.phase1 !== false && baseConfig.phase1.enabled && teamName
    ? new SentimentDataCollector(baseConfig)
    : null
  const narrative = include.phase2 && baseConfig.phase2.enabled
    ? new NarrativeDataCollector(baseConfig)
    : null
  const iai = include.phase3 && baseConfig.phase3.enabled
    ? new IAIDataCollector(baseConfig)
    : null
  const csi = include.phase4 !== false && baseConfig.phase4.enabled
    ? new CSIDataCollector(baseConfig)
    : null

  const summary: Record<string, any> = {
    teamName,
    hasStadium: !!stadium,
    phasesRequested: {
      phase1: include.phase1 !== false,
      phase2: !!include.phase2,
      phase3: !!include.phase3,
      phase4: include.phase4 !== false,
    },
    feedsEnabled: {
      twitter: feedConfig.twitter.enabled,
      news: feedConfig.news.enabled,
      weather: feedConfig.weather.enabled,
      injuries: feedConfig.injuries.enabled,
      oddsApi: feedConfig.oddsAPI.enabled,
    },
  }

  if (sentiment) {
    try {
      const data = await sentiment.collect(teamName)
      summary.phase1 = {
        socialCount: Array.isArray(data.social) ? data.social.length : 0,
        newsCount: Array.isArray(data.news) ? data.news.length : 0,
      }
    } catch (e) {
      summary.phase1 = { error: (e as Error).message || 'Sentiment collection failed' }
    }
  }

  if (narrative) {
    try {
      const data = await narrative.collect()
      summary.phase2 = {
        schedulePresent: !!data.schedule,
        rosterPresent: !!data.roster,
      }
    } catch (e) {
      summary.phase2 = { error: (e as Error).message || 'Narrative collection failed' }
    }
  }

  if (iai) {
    try {
      const data = await iai.collect()
      summary.phase3 = {
        hasOdds: !!data.odds,
        lineMovementSamples: Array.isArray(data.lineMovement) ? data.lineMovement.length : 0,
        sharpIndicator: data.sharpIndicator ?? null,
      }
    } catch (e) {
      summary.phase3 = { error: (e as Error).message || 'IAI collection failed' }
    }
  }

  if (csi) {
    try {
      const gameDate = gameDateStr ? new Date(gameDateStr) : undefined
      const data = await csi.collect(stadium, gameDate, undefined, teamName)
      summary.phase4 = {
        hasWeather: !!data.weather,
        injuriesCount: Array.isArray(data.injuries) ? data.injuries.length : 0,
        hasReferee: !!data.referee,
      }
    } catch (e) {
      summary.phase4 = { error: (e as Error).message || 'CSI collection failed' }
    }
  }

  const durationMs = Date.now() - startedAt
  summary.durationMs = durationMs

  return NextResponse.json({ success: true, summary })
}

