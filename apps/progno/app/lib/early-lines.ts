import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ET = 'America/New_York'

function formatEtDate(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value])) as any
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function computeTargetSnapshotDate(gameDate: string, offsetDays: number): string {
  const base = new Date(`${gameDate}T16:00:00Z`)
  const target = new Date(base.getTime() - (Number(offsetDays) || 0) * 86400000)
  return formatEtDate(target)
}

async function loadFromLocal(fileName: string): Promise<any | null> {
  try {
    const appRoot = process.cwd()
    const p = path.join(appRoot, fileName)
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function loadFromStorage(fileName: string): Promise<any | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  const sb = createClient(supabaseUrl, supabaseKey)
  const { data: file } = await sb.storage.from('predictions').download(fileName)
  if (!file) return null
  const text = await file.text()
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  try { return JSON.parse(clean) } catch { return null }
}

export async function loadPredictionsSnapshot(date: string, isEarly: boolean): Promise<any | null> {
  const fileName = isEarly ? `predictions-early-${date}.json` : `predictions-${date}.json`
  return (await loadFromLocal(fileName)) ?? (await loadFromStorage(fileName))
}

export async function loadEarlyPredictionsForGameDate(gameDate: string, offsetDays: number, fallbackDays: number = 10): Promise<{ data: any | null; resolvedDate: string | null }> {
  const target = computeTargetSnapshotDate(gameDate, offsetDays)
  const base = new Date(`${target}T16:00:00Z`)
  for (let i = 0; i <= Math.max(0, Number(fallbackDays) || 0); i++) {
    const tryDate = formatEtDate(new Date(base.getTime() - i * 86400000))
    const data = await loadPredictionsSnapshot(tryDate, true)
    if (data) return { data, resolvedDate: tryDate }
  }
  return { data: null, resolvedDate: null }
}

export async function loadRegularPredictionsForGameDate(gameDate: string): Promise<{ data: any | null; resolvedDate: string | null }> {
  const data = await loadPredictionsSnapshot(gameDate, false)
  return { data, resolvedDate: data ? gameDate : null }
}
