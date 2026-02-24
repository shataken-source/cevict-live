import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { getSharedUser } from '@/lib/shared-users'
import { formatUsdInCurrency } from '@/lib/currency'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bookings/by-session?session_id=xxx
 * Returns the booking row for this Stripe session (for success page).
 * Includes preferred_currency and formatted total for display.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, check_in, check_out, nights, total_amount, amount_usd, fx_currency, fx_snapshot_at, user_id')
    .eq('stripe_session_id', sessionId)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const sharedUser = booking.user_id ? await getSharedUser(booking.user_id) : null
  const currency = (sharedUser?.preferred_currency || 'USD').toUpperCase()
  const amountUsd = Number(booking.amount_usd ?? booking.total_amount ?? 0)
  const formattedTotal = await formatUsdInCurrency(amountUsd, currency)

  return NextResponse.json({
    booking: {
      id: booking.id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      nights: booking.nights,
      total_amount: booking.total_amount,
      amount_usd: amountUsd,
      fx_currency: booking.fx_currency,
    },
    preferred_currency: currency,
    formatted_total: formattedTotal,
  })
}
