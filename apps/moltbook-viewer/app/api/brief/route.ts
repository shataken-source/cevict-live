/**
 * Optional: serve daily brief (e.g. from petreunion/daily_brief.md).
 * Set MOLTBOOK_BRIEF_PATH in .env.local to a path (absolute or relative to app root).
 * If unset, returns empty. Used for "Brief" tab in the viewer.
 */

import { readFile, stat } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const raw = process.env.MOLTBOOK_BRIEF_PATH
  if (!raw?.trim()) {
    return NextResponse.json({ content: '', updated: null })
  }
  try {
    const fullPath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
    const content = await readFile(fullPath, 'utf-8')
    const st = await stat(fullPath)
    return NextResponse.json({
      content,
      updated: st.mtime?.toISOString() ?? null,
    })
  } catch {
    return NextResponse.json({ content: '', updated: null })
  }
}
