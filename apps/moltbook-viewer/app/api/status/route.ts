/**
 * Optional: last run time from trigger file (for scheduled check).
 * Set MOLTBOOK_TRIGGER_PATH in .env.local to the trigger file path.
 * If unset, returns null. Used for "Last updated" in the viewer.
 */

import { stat } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const raw = process.env.MOLTBOOK_TRIGGER_PATH
  if (!raw?.trim()) {
    return NextResponse.json({ lastRun: null })
  }
  try {
    const fullPath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
    const st = await stat(fullPath)
    return NextResponse.json({ lastRun: st.mtime?.toISOString() ?? null })
  } catch {
    return NextResponse.json({ lastRun: null })
  }
}
