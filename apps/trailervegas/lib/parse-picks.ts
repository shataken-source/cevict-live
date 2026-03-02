/**
 * Parse picks from CSV text or JSON.
 */

export function parseCsv(text: string): any[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(',').map(h => h.trim())
  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (!cols.length) continue
    const row: any = {}
    header.forEach((h, idx) => { row[h] = cols[idx] })
    rows.push(row)
  }
  return rows
}

export function extractPicksFromText(text: string): any[] {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
      if (parsed.picks && Array.isArray(parsed.picks)) return parsed.picks
    } catch { /* fall through to CSV */ }
  }
  return parseCsv(text)
}

export function validatePicks(picks: any[]): any[] {
  return picks.filter((p: any) =>
    (p.date || p.game_date) && p.home_team && p.away_team && p.pick
  )
}
