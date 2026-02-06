/**
 * Cron: Generate daily predictions (Cevict Flex) and write to predictions-YYYY-MM-DD.json
 * Schedule: 8 AM daily. Call with Authorization: Bearer CRON_SECRET.
 *
 * Uses /api/picks/today (same engine as your manual run). Writes to app root so
 * you get predictions-YYYY-MM-DD.json for grading later.
 */

import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

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
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const baseUrl = getBaseUrl()
  const urlObj = request.url ? new URL(request.url) : null
  const earlyLines = urlObj?.searchParams?.get('earlyLines') === '1' || urlObj?.searchParams?.get('earlyLines') === 'true'

  try {
    const url = earlyLines ? `${baseUrl}/api/picks/today?earlyLines=1` : `${baseUrl}/api/picks/today`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      console.error('[CRON daily-predictions] picks/today failed:', res.status, text)
      return NextResponse.json(
        { success: false, error: `picks/today failed: ${res.status}`, detail: text.slice(0, 200) },
        { status: 502 }
      )
    }

    const data = await res.json()
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
      date: today,
      generatedAt: new Date().toISOString(),
      count: picks.length,
      message: data.message ?? (earlyLines ? 'Cevict Flex early lines (2-5 days ahead)' : 'Cevict Flex daily picks'),
      earlyLines: earlyLines ?? false,
      picks,
    }

    const appRoot = process.cwd()
    const fileName = earlyLines ? `predictions-early-${today}.json` : `predictions-${today}.json`
    const filePath = path.join(appRoot, fileName)
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')

    console.log(`[CRON daily-predictions] Wrote ${picks.length} picks to ${filePath}`)
    return NextResponse.json({
      success: true,
      date: today,
      file: filePath,
      count: picks.length,
      earlyLines: earlyLines ?? false,
      message: `Saved ${picks.length} picks to ${fileName}`,
    })
  } catch (err: any) {
    console.error('[CRON daily-predictions]', err)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Failed to generate or write predictions' },
      { status: 500 }
    )
  }
}
