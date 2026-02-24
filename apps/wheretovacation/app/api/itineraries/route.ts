import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** GET /api/itineraries - List current user's itineraries */
export async function GET() {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('itineraries')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itineraries: data ?? [] })
}

/** POST /api/itineraries - Create itinerary */
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: { name?: string; start_date?: string; end_date?: string; items?: unknown[] } = {}
  try {
    body = await request.json()
  } catch {
    // empty body ok
  }

  const name = String(body.name || 'My Trip').trim() || 'My Trip'
  const items = Array.isArray(body.items) ? body.items : []
  const total = (items as any[]).reduce(
    (sum: number, i: any) => sum + (typeof i?.price === 'number' ? i.price : 0),
    0
  )

  const { data, error } = await admin
    .from('itineraries')
    .insert({
      user_id: user.id,
      name,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      items,
      total_estimated_cost: total,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itinerary: data })
}
