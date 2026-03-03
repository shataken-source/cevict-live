/**
 * Keys management for Progno admin. Uses .progno/keys.json (Odds API, etc.).
 * Requires Authorization: Bearer <CRON_SECRET or ADMIN_PASSWORD>.
 */

import { NextRequest, NextResponse } from 'next/server'
import { addKeyAsync, deleteKeyAsync, loadKeysAsync } from '../../../../keys-store'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const keys = (await loadKeysAsync()).map(({ id, label, createdAt }) => ({ id, label, createdAt }))
    return NextResponse.json({ success: true, keys })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { label, value } = body || {}
    if (!value) {
      return NextResponse.json({ success: false, error: 'value required' }, { status: 400 })
    }
    const key = await addKeyAsync(label, value)
    return NextResponse.json({ success: true, key: { id: key.id, label: key.label, createdAt: key.createdAt } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const ok = await deleteKeyAsync(id)
    if (!ok) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 })
  }
}
