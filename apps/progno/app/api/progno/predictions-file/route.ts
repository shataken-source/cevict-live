/**
 * Serve prediction JSON files from disk so the Cevict Picks Viewer can load both
 * regular and early files by date. GET ?date=YYYY-MM-DD&type=regular|early
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const type = request.nextUrl.searchParams.get('type')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 })
  }
  if (!type || (type !== 'regular' && type !== 'early')) {
    return NextResponse.json({ error: 'type required: regular or early' }, { status: 400 })
  }
  const fileName = type === 'early' ? `predictions-early-${date}.json` : `predictions-${date}.json`
  const appRoot = process.cwd()
  const filePath = path.join(appRoot, fileName)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `File not found: ${fileName}` }, { status: 404 })
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read file' }, { status: 500 })
  }
}
