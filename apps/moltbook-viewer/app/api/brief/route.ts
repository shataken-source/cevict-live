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
  const raw = (process.env.MOLTBOOK_BRIEF_PATH ?? '').trim()
  // Default: PetReunion daily_brief when running in monorepo (moltbook-viewer next to petreunion)
  const pathToTry = raw || '../petreunion/daily_brief.md'
  try {
    const fullPath = path.isAbsolute(pathToTry) ? pathToTry : path.resolve(process.cwd(), pathToTry)
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
