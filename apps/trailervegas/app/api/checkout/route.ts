import { NextRequest, NextResponse } from 'next/server'
import { getStripe, TRAILERVEGAS_PRICE_CENTS, TRAILERVEGAS_PRODUCT_NAME } from '@/lib/stripe'
import { getServiceSupabase } from '@/lib/supabase'
import { extractPicksFromText, validatePicks } from '@/lib/parse-picks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const contentType = request.headers.get('content-type') || ''
  let picks: any[] = []

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No picks file uploaded' }, { status: 400 })
    const text = await (file as File).text()
    picks = extractPicksFromText(text)
  } else if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    picks = Array.isArray(body) ? body : (body.picks || [])
  }

  picks = validatePicks(picks)
  if (!picks.length) return NextResponse.json({ error: 'No valid picks found. Required: date, home_team, away_team, pick' }, { status: 400 })
  if (picks.length > 500) return NextResponse.json({ error: 'Maximum 500 picks per report' }, { status: 400 })

  const origin = request.headers.get('origin') || request.nextUrl.origin

  try {
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
      success_url: `${origin}/report?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?cancelled=1`,
      metadata: { pick_count: String(picks.length) },
    })

    await supabase.from('trailervegas_pending').upsert({
      session_id: session.id,
      picks: JSON.stringify(picks),
      pick_count: picks.length,
      created_at: new Date().toISOString(),
      status: 'pending',
    })

    return NextResponse.json({ checkout_url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('[checkout] Stripe error:', err.message)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
