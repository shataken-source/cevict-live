import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** GET /api/itineraries/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ itinerary: data })
}

/** PUT /api/itineraries/[id] */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: { name?: string; start_date?: string; end_date?: string; items?: unknown[]; status?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = String(body.name).trim() || 'My Trip'
  if (body.start_date !== undefined) updates.start_date = body.start_date || null
  if (body.end_date !== undefined) updates.end_date = body.end_date || null
  if (body.status !== undefined && ['draft', 'saved', 'booked', 'cancelled'].includes(body.status)) {
    updates.status = body.status
  }
  if (Array.isArray(body.items)) {
    updates.items = body.items
    const total = body.items.reduce(
      (sum: number, i: { price?: number }) => sum + (typeof (i as any)?.price === 'number' ? (i as any).price : 0),
      0
    )
    updates.total_estimated_cost = total
  }

  const { data, error } = await admin
    .from('itineraries')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ itinerary: data })
}

/** DELETE /api/itineraries/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { error } = await admin
    .from('itineraries')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
