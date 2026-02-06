/**
 * Hot feed snapshot. Uses first available Moltbook API key (same as activity).
 * For "What's hot" panel in the viewer.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1'

function getFirstKey(): string | null {
  const multi = process.env.MOLTBOOK_AGENTS_JSON
  if (multi) {
    try {
      const arr = JSON.parse(multi) as { label: string; key: string }[]
      if (Array.isArray(arr) && arr[0]?.key) return arr[0].key
    } catch {
      // ignore
    }
  }
  return process.env.MOLTBOOK_API_KEY ?? null
}

export async function GET() {
  const key = getFirstKey()
  if (!key) {
    return NextResponse.json({ posts: [], error: 'No API key' }, { status: 200 })
  }
  try {
    const res = await fetch(`${MOLTBOOK_BASE}/feed?sort=hot&limit=15`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return NextResponse.json({ posts: [] }, { status: 200 })
    const data = await res.json()
    const raw = data?.posts ?? data?.data?.posts ?? (Array.isArray(data) ? data : [])
    const posts = Array.isArray(raw) ? raw : []
    return NextResponse.json({ posts })
  } catch {
    return NextResponse.json({ posts: [] }, { status: 200 })
  }
}
