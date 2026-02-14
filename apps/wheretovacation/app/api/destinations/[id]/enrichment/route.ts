/**
 * Destination enrichment: GET returns stored enrichment; PATCH updates (admin/cron).
 * GET /api/destinations/[id]/enrichment
 * PATCH /api/destinations/[id]/enrichment { best_season?, country_code?, enrichment_data? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('destinations')
    .select('id, best_season, country_code, enrichment_data, enrichment_synced_at')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    destination_id: data.id,
    best_season: data.best_season ?? null,
    country_code: data.country_code ?? null,
    enrichment_data: data.enrichment_data ?? {},
    enrichment_synced_at: data.enrichment_synced_at ?? null,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: { best_season?: string; country_code?: string; enrichment_data?: Record<string, unknown> } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    enrichment_synced_at: new Date().toISOString(),
  }
  if (body.best_season !== undefined) updates.best_season = body.best_season
  if (body.country_code !== undefined) updates.country_code = body.country_code
  if (typeof body.enrichment_data === 'object' && body.enrichment_data !== null) {
    updates.enrichment_data = body.enrichment_data
  }

  const { data, error } = await admin
    .from('destinations')
    .update(updates)
    .eq('id', params.id)
    .select('id, best_season, country_code, enrichment_data, enrichment_synced_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    destination_id: data.id,
    best_season: data.best_season,
    country_code: data.country_code,
    enrichment_data: data.enrichment_data,
    enrichment_synced_at: data.enrichment_synced_at,
  })
}
