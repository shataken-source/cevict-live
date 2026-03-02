/**
 * Cron: Daily Morning SMS Report
 * Schedule: 30 12 * * * UTC (6:30 AM CT) — right after daily-results grades yesterday's picks
 *
 * Sends a text message with:
 * - Yesterday's Kalshi P&L (from actual_bets)
 * - Prediction accuracy (from prediction_daily_summary)
 * - Kalshi account balance (via Kalshi API)
 * - Running weekly stats
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const KALSHI_BASE = 'https://api.elections.kalshi.com'

// ── Kalshi Auth Helpers ──

function normalizePem(raw: string): string {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/)
  const endMatch = normalized.match(/-----END ([^-]+)-----/)
  if (!beginMatch || !endMatch) return normalized
  const type = beginMatch[1]
  const b64 = normalized.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n')
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`
}

function kalshiSign(privateKey: string, method: string, urlPath: string) {
  const ts = Date.now().toString()
  const pathOnly = urlPath.split('?')[0]
  const msg = ts + method.toUpperCase() + pathOnly
  try {
    const s = crypto.createSign('RSA-SHA256')
    s.update(msg)
    s.end()
    const sig = s
      .sign({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      })
      .toString('base64')
    return { sig, ts }
  } catch {
    return { sig: '', ts: '' }
  }
}

function kalshiHdrs(apiKeyId: string, privateKey: string, method: string, urlPath: string) {
  const { sig, ts } = kalshiSign(privateKey, method, urlPath)
  return {
    Accept: 'application/json',
    'KALSHI-ACCESS-KEY': apiKeyId,
    'KALSHI-ACCESS-SIGNATURE': sig,
    'KALSHI-ACCESS-TIMESTAMP': ts,
  }
}

// ── Sinch SMS ──

async function sendSMS(to: string, message: string): Promise<boolean> {
  const token = process.env.SINCH_API_TOKEN
  const from = process.env.SINCH_FROM
  const planId = process.env.SINCH_SERVICE_PLAN_ID
  if (!token || !from || !planId) {
    console.warn('[daily-sms] Sinch not configured (SINCH_API_TOKEN, SINCH_FROM, SINCH_SERVICE_PLAN_ID)')
    return false
  }

  const res = await fetch(`https://sms.api.sinch.com/xms/v1/${planId}/batches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], body: message }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[daily-sms] Sinch error:', res.status, err)
    return false
  }
  console.log('[daily-sms] SMS sent to', to)
  return true
}

// ── Kalshi Balance ──

async function getKalshiBalance(): Promise<number | null> {
  const apiKeyId = process.env.KALSHI_API_KEY_ID
  const rawKey = process.env.KALSHI_PRIVATE_KEY
  if (!apiKeyId || !rawKey) return null
  const privateKey = normalizePem(rawKey)

  const path = '/trade-api/v2/portfolio/balance'
  try {
    const res = await fetch(`${KALSHI_BASE}${path}`, {
      method: 'GET',
      headers: kalshiHdrs(apiKeyId, privateKey, 'GET', path),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    // balance is in cents
    return data?.balance ?? null
  } catch {
    return null
  }
}

// ── Main Handler ──

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = process.env.ADMIN_PHONE_NUMBER
  if (!phone) {
    return NextResponse.json({ success: false, error: 'ADMIN_PHONE_NUMBER not set' }, { status: 200 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Yesterday's date (Central Time)
  const yesterday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() - 86400000))

  // ── 1. Kalshi Bets for Yesterday ──
  const { data: yesterdayBets } = await supabase
    .from('actual_bets')
    .select('*')
    .eq('game_date', yesterday)
    .not('dry_run', 'is', true)

  const bets = (yesterdayBets || []).filter(b => !b.dry_run)
  const settled = bets.filter(b => b.result === 'win' || b.result === 'loss')
  const wins = settled.filter(b => b.result === 'win')
  const losses = settled.filter(b => b.result === 'loss')
  const pending = bets.filter(b => !b.result && b.status !== 'cancelled')
  const totalStaked = settled.reduce((s, b) => s + (b.stake_cents || 0), 0)
  const totalProfit = settled.reduce((s, b) => s + (b.profit_cents || 0), 0)
  const totalPayout = wins.reduce((s, b) => s + (b.payout_cents || 0), 0)

  // ── 2. Prediction Summary for Yesterday ──
  const { data: summary } = await supabase
    .from('prediction_daily_summary')
    .select('*')
    .eq('date', yesterday)
    .single()

  // ── 3. Last 7 Days Running Stats ──
  const weekAgo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() - 7 * 86400000))

  const { data: weekBets } = await supabase
    .from('actual_bets')
    .select('result, stake_cents, profit_cents, payout_cents, dry_run')
    .gte('game_date', weekAgo)
    .not('dry_run', 'is', true)

  const wk = (weekBets || []).filter(b => !b.dry_run)
  const wkSettled = wk.filter(b => b.result === 'win' || b.result === 'loss')
  const wkWins = wkSettled.filter(b => b.result === 'win').length
  const wkLosses = wkSettled.filter(b => b.result === 'loss').length
  const wkStaked = wkSettled.reduce((s, b) => s + (b.stake_cents || 0), 0)
  const wkProfit = wkSettled.reduce((s, b) => s + (b.profit_cents || 0), 0)
  const wkWR = wkSettled.length > 0 ? Math.round((wkWins / wkSettled.length) * 100) : 0

  // ── 4. Kalshi Account Balance ──
  const balanceCents = await getKalshiBalance()

  // ── 5. Build SMS Message ──
  const profitSign = totalProfit >= 0 ? '+' : ''
  const wkProfitSign = wkProfit >= 0 ? '+' : ''
  const dollarFmt = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`

  let msg = `PROGNO Daily Report - ${yesterday}\n\n`

  // Yesterday's Kalshi bets
  if (settled.length > 0) {
    msg += `KALSHI: ${wins.length}W/${losses.length}L`
    if (pending.length > 0) msg += ` (${pending.length} pending)`
    msg += `\n`
    msg += `Staked: ${dollarFmt(totalStaked)} | P&L: ${profitSign}${dollarFmt(totalProfit)}\n`
    if (totalStaked > 0) {
      const roi = Math.round((totalProfit / totalStaked) * 100)
      msg += `ROI: ${roi >= 0 ? '+' : ''}${roi}%\n`
    }
  } else if (pending.length > 0) {
    msg += `KALSHI: ${pending.length} bets pending settlement\n`
  } else {
    msg += `KALSHI: No bets yesterday\n`
  }

  // Prediction accuracy
  if (summary) {
    msg += `\nPICKS: ${summary.wins || 0}W/${summary.losses || 0}L`
    if (summary.pending > 0) msg += ` (${summary.pending} pending)`
    msg += ` | ${summary.win_rate || 0}% WR\n`
  }

  // 7-day running
  msg += `\n7-DAY: ${wkWins}W/${wkLosses}L | ${wkWR}% WR`
  if (wkStaked > 0) {
    msg += `\nKalshi 7d P&L: ${wkProfitSign}${dollarFmt(wkProfit)}`
    const wkROI = Math.round((wkProfit / wkStaked) * 100)
    msg += ` (${wkROI >= 0 ? '+' : ''}${wkROI}% ROI)`
  }

  // Kalshi balance
  if (balanceCents !== null) {
    msg += `\n\nKalshi Balance: $${(balanceCents / 100).toFixed(2)}`
  }

  // Top picks for today (quick look at what's coming)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

  const todayFileName = `predictions-${today}.json`
  let todayPickCount = 0
  try {
    const { data: predData } = await supabase.storage
      .from('predictions')
      .download(todayFileName)
    if (predData) {
      const raw = await predData.text()
      const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
      const parsed = JSON.parse(clean)
      const picks = Array.isArray(parsed) ? parsed : (parsed.picks ?? [])
      todayPickCount = picks.length
    }
  } catch { /* no predictions yet */ }

  if (todayPickCount > 0) {
    msg += `\n\nToday: ${todayPickCount} picks queued`
  }

  // Send it
  const sent = await sendSMS(phone, msg)

  console.log('[daily-sms] Report:', msg)

  return NextResponse.json({
    success: sent,
    message: sent ? 'SMS report sent' : 'SMS failed to send',
    report: {
      date: yesterday,
      kalshi: { wins: wins.length, losses: losses.length, pending: pending.length, profitCents: totalProfit, stakedCents: totalStaked },
      predictions: summary ? { wins: summary.wins, losses: summary.losses, winRate: summary.win_rate } : null,
      week: { wins: wkWins, losses: wkLosses, winRate: wkWR, profitCents: wkProfit },
      balanceCents,
      todayPickCount,
    },
  })
}
