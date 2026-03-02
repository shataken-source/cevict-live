/**
 * Core grading logic for TrailerVegas — grades uploaded picks against game_outcomes.
 */

import { gameTeamsMatch, teamsMatch } from './team-matcher'

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function americanProfitPerUnit(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 1
  if (odds > 0) return odds / 100
  return 100 / Math.abs(odds)
}

export async function gradePicksFromData(picks: any[], supabase: any) {
  const normalized = picks
    .map((p: any) => ({
      date: (p.date || p.game_date || '').toString().slice(0, 10),
      home_team: (p.home_team || '').toString(),
      away_team: (p.away_team || '').toString(),
      pick: (p.pick || '').toString(),
      league: p.league ? p.league.toString().toUpperCase() : undefined,
      odds: toNumber(p.odds),
      stake: toNumber(p.stake) ?? 1,
    }))
    .filter((p: any) => p.date && p.home_team && p.away_team && p.pick)

  const dates = Array.from(new Set(normalized.map((p: any) => p.date))).sort()

  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('game_date, home_team, away_team, home_score, away_score, league')
    .in('game_date', dates)

  const byDate: Record<string, any[]> = {}
  for (const row of (outcomes || [])) {
    if (!byDate[row.game_date]) byDate[row.game_date] = []
    byDate[row.game_date].push(row)
  }

  let wins = 0, losses = 0, pending = 0, unmatched = 0, unsupported = 0
  let totalStake = 0, totalProfit = 0
  const byLeague: Record<string, any> = {}
  const graded: any[] = []

  for (const p of normalized) {
    const games = byDate[p.date] || []
    let match: any | undefined
    for (const g of games) {
      if (g.home_team && g.away_team && gameTeamsMatch(p.home_team, p.away_team, g.home_team, g.away_team)) {
        match = g
        break
      }
    }

    if (!match) { unmatched++; graded.push({ ...p, status: 'unmatched' }); continue }

    const homeScore = typeof match.home_score === 'number' ? match.home_score : null
    const awayScore = typeof match.away_score === 'number' ? match.away_score : null
    if (homeScore === null || awayScore === null) { pending++; graded.push({ ...p, status: 'pending' }); continue }

    const leagueKey = (p.league || match.league || 'UNKNOWN').toUpperCase()
    if (!byLeague[leagueKey]) byLeague[leagueKey] = { wins: 0, losses: 0, pending: 0, stake: 0, profit: 0, picks: 0 }

    const isHomePick = p.pick.toLowerCase() === 'home' || teamsMatch(p.pick, match.home_team)
    const isAwayPick = p.pick.toLowerCase() === 'away' || teamsMatch(p.pick, match.away_team)
    if (!isHomePick && !isAwayPick) { unsupported++; graded.push({ ...p, status: 'unsupported' }); continue }

    const homeWon = homeScore > awayScore
    const awayWon = awayScore > homeScore
    let status = 'lose'
    let profit = 0

    if ((isHomePick && homeWon) || (isAwayPick && awayWon)) {
      status = 'win'
      profit = p.odds !== undefined ? p.stake * americanProfitPerUnit(p.odds) : p.stake
      wins++
    } else if ((isHomePick && awayWon) || (isAwayPick && homeWon)) {
      status = 'lose'
      profit = -p.stake
      losses++
    } else {
      status = 'pending'
      pending++
    }

    totalStake += p.stake
    totalProfit += profit

    const agg = byLeague[leagueKey]
    agg.picks++; agg.stake += p.stake; agg.profit += profit
    if (status === 'win') agg.wins++
    else if (status === 'lose') agg.losses++

    graded.push({ ...p, status, profit, matched_home: match.home_team, matched_away: match.away_team, home_score: homeScore, away_score: awayScore })
  }

  const gradedCount = wins + losses
  const winRate = gradedCount > 0 ? Math.round((wins / gradedCount) * 1000) / 10 : 0
  const roi = totalStake > 0 ? Math.round((totalProfit / totalStake) * 1000) / 10 : 0

  const leagueSummary: Record<string, any> = {}
  for (const [league, agg] of Object.entries(byLeague) as [string, any][]) {
    const g = agg.wins + agg.losses
    leagueSummary[league] = {
      picks: agg.picks, graded: g, wins: agg.wins, losses: agg.losses,
      winRate: g > 0 ? Math.round((agg.wins / g) * 1000) / 10 : 0,
      roi: agg.stake > 0 ? Math.round((agg.profit / agg.stake) * 1000) / 10 : 0,
    }
  }

  return {
    counts: { total: normalized.length, graded: gradedCount, wins, losses, pending, unmatched, unsupported },
    performance: { winRate, roi, totalStake, totalProfit: Math.round(totalProfit * 100) / 100 },
    byLeague: leagueSummary,
    sample: graded.slice(0, 200),
  }
}
