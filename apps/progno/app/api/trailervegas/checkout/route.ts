/**
 * POST /api/trailervegas/checkout
 * 
 * Public endpoint — no auth required (Stripe handles payment).
 * Accepts multipart form with a picks file (CSV/JSON).
 * Creates a Stripe Checkout session and stores the picks temporarily
 * in Supabase (trailervegas_pending) keyed by the session ID.
 * Returns the Stripe checkout URL for redirect.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, TRAILERVEGAS_PRICE_CENTS, TRAILERVEGAS_PRODUCT_NAME } from '@/app/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function parseCsv(text: string): any[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(',').map(h => h.trim())
  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (!cols.length) continue
    const row: any = {}
    header.forEach((h, idx) => { row[h] = cols[idx] })
    rows.push(row)
  }
  return rows
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Extract picks from form
  const contentType = request.headers.get('content-type') || ''
  let picks: any[] = []

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No picks file uploaded' }, { status: 400 })
    }
    const text = await (file as File).text()
    const trimmed = text.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        picks = Array.isArray(parsed) ? parsed : (parsed.picks || [])
      } catch { /* fall through to CSV */ }
    }
    if (!picks.length) picks = parseCsv(text)
  } else if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    picks = Array.isArray(body) ? body : (body.picks || [])
  }

  // Validate minimum fields
  picks = picks.filter((p: any) =>
    (p.date || p.game_date) && p.home_team && p.away_team && p.pick
  )

  if (!picks.length) {
    return NextResponse.json({
      error: 'No valid picks found. Required fields: date, home_team, away_team, pick'
    }, { status: 400 })
  }

  if (picks.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 picks per report' }, { status: 400 })
  }

  // Determine base URL for redirects
  const origin = request.headers.get('origin') || request.nextUrl.origin

  try {
    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: TRAILERVEGAS_PRICE_CENTS,
          product_data: {
            name: TRAILERVEGAS_PRODUCT_NAME,
            description: `Grade ${picks.length} picks against historical outcomes`,
          },
        },
        quantity: 1,
      }],
      success_url: `${origin}/trailervegas/report?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/trailervegas?cancelled=1`,
      metadata: {
        pick_count: String(picks.length),
      },
    })

    // Store picks temporarily in Supabase keyed by session ID
    const { error: storeErr } = await supabase
      .from('trailervegas_pending')
      .upsert({
        session_id: session.id,
        picks: JSON.stringify(picks),
        pick_count: picks.length,
        created_at: new Date().toISOString(),
        status: 'pending',
      })

    if (storeErr) {
      console.error('[trailervegas/checkout] Failed to store picks:', storeErr.message)
      // Don't fail — worst case the webhook will need to handle missing picks
    }

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    })

  } catch (err: any) {
    console.error('[trailervegas/checkout] Stripe error:', err.message)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
