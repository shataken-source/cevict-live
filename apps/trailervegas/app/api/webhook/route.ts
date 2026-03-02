import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getServiceSupabase } from '@/lib/supabase'
import { gradePicksFromData } from '@/lib/grader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as any
  const sessionId = session.id

  try {
    const { data: pendingRow } = await supabase
      .from('trailervegas_pending')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!pendingRow || !pendingRow.picks) {
      console.error(`[webhook] No pending picks for session ${sessionId}`)
      return NextResponse.json({ received: true, error: 'No pending picks' })
    }

    const picks = JSON.parse(pendingRow.picks)
    const report = await gradePicksFromData(picks, supabase)

    await supabase.from('trailervegas_reports').upsert({
      session_id: sessionId,
      email: session.customer_details?.email || null,
      report: JSON.stringify(report),
      pick_count: pendingRow.pick_count,
      amount_paid: session.amount_total,
      created_at: new Date().toISOString(),
    })

    await supabase.from('trailervegas_pending').update({ status: 'completed' }).eq('session_id', sessionId)

    console.log(`[webhook] Report generated for ${sessionId}: ${report.performance.winRate}% WR, ${report.performance.roi}% ROI`)
  } catch (err: any) {
    console.error(`[webhook] Error processing ${sessionId}:`, err.message)
  }

  return NextResponse.json({ received: true })
}
