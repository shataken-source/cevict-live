/**
 * Smart date ranges for a destination + month: weekends, peak/off-peak, holidays.
 * GET ?destination=slug-or-id&month=2025-06
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function getMonthStartEnd(monthStr: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr)
  if (!match) return null
  const y = parseInt(match[1], 10)
  const m = parseInt(match[2], 10) - 1
  if (m < 0 || m > 11) return null
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  return { start, end }
}

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/** US federal holidays in a given year (simplified) */
function getUsHolidays(year: number): Set<string> {
  const set = new Set<string>()
  const add = (month: number, day: number) => set.add(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  add(1, 1)   // New Year
  add(7, 4)   // July 4
  add(12, 25) // Christmas
  // Memorial Day = last Mon May
  const memMay = new Date(year, 4, 31)
  while (memMay.getDay() !== 1) memMay.setDate(memMay.getDate() - 1)
  add(5, memMay.getDate())
  // Labor Day = first Mon Sep
  const laborSep = new Date(year, 8, 1)
  while (laborSep.getDay() !== 1) laborSep.setDate(laborSep.getDate() + 1)
  add(9, laborSep.getDate())
  // Thanksgiving = 4th Thu Nov
  const nov1 = new Date(year, 10, 1)
  let thurs = 0
  for (let d = 1; d <= 30; d++) {
    nov1.setDate(d)
    if (nov1.getDay() === 4) { thurs++; if (thurs === 4) { add(11, d); break } }
  }
  return set
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const destinationParam = searchParams.get('destination')
  const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const range = getMonthStartEnd(monthParam)
  if (!range) {
    return NextResponse.json({ error: 'Invalid month (use YYYY-MM)' }, { status: 400 })
  }

  let destinationId: string | null = null
  if (destinationParam) {
    const admin = getSupabaseAdminClient()
    if (admin) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(destinationParam)
      const q = admin.from('destinations').select('id').limit(1)
      if (isUuid) {
        const { data } = await q.eq('id', destinationParam).single()
        if (data) destinationId = data.id
      } else {
        const { data } = await q.eq('slug', destinationParam).single()
        if (data) destinationId = data.id
      }
    }
  }

  const { start, end } = range
  const year = start.getFullYear()
  const holidays = getUsHolidays(year)
  const ranges: { start: string; end: string; label: string; peak: boolean }[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const weekend = isWeekend(d)
    const holiday = holidays.has(dateStr)
    if (weekend || holiday) {
      const label = holiday ? 'Holiday' : (d.getDay() === 0 ? 'Sunday' : 'Saturday')
      const endDate = new Date(d)
      endDate.setDate(endDate.getDate() + 1)
      const endStr = endDate <= end ? endDate.toISOString().slice(0, 10) : end.toISOString().slice(0, 10)
      ranges.push({ start: dateStr, end: endStr, label, peak: true })
    }
  }

  // Dedupe overlapping and merge adjacent
  const merged: typeof ranges = []
  let i = 0
  while (i < ranges.length) {
    let r = ranges[i]
    while (i + 1 < ranges.length && ranges[i + 1].start <= r.end) {
      i++
      r = { ...r, end: ranges[i].end }
    }
    merged.push(r)
    i++
  }

  return NextResponse.json({
    destination_id: destinationId,
    month: monthParam,
    ranges: merged.slice(0, 20),
  })
}
