/**
 * Early Lines Analysis API
 *
 * Comprehensive endpoint that:
 * 1. Fetches early odds from multiple sources
 * 2. Tracks injuries and breaking news
 * 3. Compares early picks to regular picks
 * 4. Identifies line-move arb opportunities
 *
 * GET /api/early-lines/analysis?sports=NFL,NBA&daysAhead=3
 */

import { NextResponse } from 'next/server'
import { EarlyOddsAggregator } from '@/app/lib/early-odds-aggregator'
import { InjuryNewsTracker } from '@/app/lib/injury-news-tracker'
import { LineMoveArbDetector, Pick } from '@/app/lib/line-move-arb-detector'
import {
  fetchCollegeBaseballOdds,
  fetchCollegeBaseballRankings,
  fetchCollegeBaseballRPI,
  fetchScrapedOddsScreens,
  fetchNASCAREntries,
  fetchDetailedMLBWeather,
  fetchXBreakingNews,
  alertCriticalInjuries,
  alertLineMovement,
} from '@/app/lib/supplemental-data-sources'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sportsParam = url.searchParams.get('sports') || 'NFL,NBA,NCAAB'
    const daysAhead = parseInt(url.searchParams.get('daysAhead') || '3')
    const includeInjuries = url.searchParams.get('includeInjuries') !== 'false'
    const includeNews = url.searchParams.get('includeNews') !== 'false'

    const sports = sportsParam.split(',').map(s => s.trim())

    // Initialize services
    const oddsAggregator = new EarlyOddsAggregator()
    const injuryTracker = new InjuryNewsTracker()
    const arbDetector = new LineMoveArbDetector()

    // 1. Fetch early odds from multiple sources
    console.log(`[Early Lines] Fetching early odds for: ${sports.join(', ')}`)
    const earlyOdds = await oddsAggregator.aggregateEarlyOdds(sports, daysAhead)
    console.log(`[Early Lines] Found ${earlyOdds.length} games with early odds`)

    // 2. Fetch injuries and breaking news (if requested)
    let injuries: any[] = []
    let news: any[] = []

    if (includeInjuries || includeNews) {
      console.log(`[Early Lines] Fetching injuries and news...`)
      const updates = await injuryTracker.getAllUpdates(sports)
      injuries = includeInjuries ? updates.injuries : []
      news = includeNews ? updates.news : []
      console.log(`[Early Lines] Found ${injuries.length} injuries, ${news.length} news items`)
    }

    // 3. Load early and regular picks from files
    const today = new Date().toISOString().split('T')[0]
    const earlyPicks = loadPicksFromFile(`predictions-early-${today}.json`)
    const regularPicks = loadPicksFromFile(`predictions-${today}.json`)

    console.log(`[Early Lines] Loaded ${earlyPicks.length} early picks, ${regularPicks.length} regular picks`)

    // 4. Detect line movements
    const lineMovements = []
    for (const early of earlyOdds) {
      // Find current odds for the same game
      const current = earlyOdds.find(o =>
        o.gameId === early.gameId &&
        new Date(o.capturedAt) > new Date(early.capturedAt)
      )

      if (current) {
        const movement = oddsAggregator.detectLineMovement(early, current)
        if (movement.significantMove) {
          lineMovements.push(movement)
        }
      }
    }

    console.log(`[Early Lines] Detected ${lineMovements.length} significant line movements`)

    // 4b. Supplemental data sources (from early-lines-gold.txt)
    let collegeBaseballData: any = null
    let nascarEntries: any[] = []
    let xNews: any[] = []
    let mlbWeather: any[] = []
    let scrapedOdds: any[] = []

    // College baseball odds & rankings (if CBB or NCAAB requested, or always)
    if (sports.some(s => ['NCAAB', 'CBB', 'MLB'].includes(s)) || sports.includes('ALL')) {
      const [cbbOdds, cbbRankings, cbbRPI] = await Promise.all([
        fetchCollegeBaseballOdds(),
        fetchCollegeBaseballRankings(),
        fetchCollegeBaseballRPI(),
      ])
      if (cbbOdds.length > 0 || cbbRankings.length > 0) {
        collegeBaseballData = {
          odds: cbbOdds,
          rankings: cbbRankings.slice(0, 25),
          rpiTop25: cbbRPI.slice(0, 25),
        }
        console.log(`[Early Lines] College baseball: ${cbbOdds.length} games, ${cbbRankings.length} ranked teams`)
      }
    }

    // NASCAR entry lists
    if (sports.includes('NASCAR') || sports.includes('ALL')) {
      nascarEntries = await fetchNASCAREntries()
      console.log(`[Early Lines] NASCAR: ${nascarEntries.length} entries`)
    }

    // X/Twitter breaking news (requires X_BEARER_TOKEN env var)
    xNews = await fetchXBreakingNews(sports)
    if (xNews.length > 0) {
      console.log(`[Early Lines] X/Twitter: ${xNews.length} breaking news items`)
    }

    // Detailed MLB weather for outdoor parks
    if (sports.includes('MLB') || sports.includes('ALL')) {
      for (const odds of earlyOdds.filter(o => o.sport === 'MLB')) {
        const weather = await fetchDetailedMLBWeather(odds.homeTeam)
        if (weather) mlbWeather.push({ gameId: odds.gameId, ...weather })
      }
      if (mlbWeather.length > 0) {
        console.log(`[Early Lines] MLB weather: ${mlbWeather.length} outdoor games analyzed`)
      }
    }

    // Scraped odds screens (requires cevict-scraper running)
    for (const sport of sports) {
      const scraped = await fetchScrapedOddsScreens(sport)
      scrapedOdds.push(...scraped)
    }
    if (scrapedOdds.length > 0) {
      console.log(`[Early Lines] Scraped odds: ${scrapedOdds.length} games from ScoresAndOdds`)
    }

    // 5. Detect line-move arb opportunities
    const arbOpportunities = arbDetector.detectLineMoveArbs(
      earlyPicks,
      regularPicks,
      lineMovements
    )

    console.log(`[Early Lines] Found ${arbOpportunities.length} line-move arb opportunities`)

    // 6. Enrich arb opportunities with injury/news context
    for (const arb of arbOpportunities) {
      // Find relevant injuries for this game
      const gameInjuries = injuries.filter(inj =>
        inj.team === arb.homeTeam || inj.team === arb.awayTeam
      )

      if (gameInjuries.length > 0) {
        arb.injuryReports = gameInjuries.map(inj =>
          `${inj.playerName} (${inj.team}) - ${inj.status}: ${inj.injury}`
        )
      }

      // Find relevant news for this game
      const gameNews = news.filter(n =>
        n.teams.includes(arb.homeTeam) || n.teams.includes(arb.awayTeam)
      )

      if (gameNews.length > 0) {
        arb.triggerNews = gameNews.map(n => n.headline)
      }
    }

    // 7. Generate summaries for top opportunities
    const topArbs = arbOpportunities.slice(0, 10)
    const summaries = topArbs.map(arb => arbDetector.generateArbSummary(arb))

    // 8. Send webhook notifications for critical findings
    let webhooksSent = 0
    if (injuries.length > 0) {
      webhooksSent += await alertCriticalInjuries(injuries)
    }
    for (const movement of lineMovements) {
      const ok = await alertLineMovement({
        homeTeam: movement.earlyOdds.homeTeam,
        awayTeam: movement.earlyOdds.awayTeam,
        sport: movement.earlyOdds.sport,
        mlShift: movement.movement.mlShift,
        spreadShift: movement.movement.spreadShift,
        totalShift: movement.movement.totalShift,
      })
      if (ok) webhooksSent++
    }
    if (webhooksSent > 0) {
      console.log(`[Early Lines] Sent ${webhooksSent} webhook notifications`)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        sports: sports.join(', '),
        daysAhead,
        earlyGames: earlyOdds.length,
        earlyPicks: earlyPicks.length,
        regularPicks: regularPicks.length,
        significantMoves: lineMovements.length,
        arbOpportunities: arbOpportunities.length,
        injuries: injuries.length,
        news: news.length,
        xBreakingNews: xNews.length,
        collegeBaseballGames: collegeBaseballData?.odds?.length || 0,
        nascarEntries: nascarEntries.length,
        mlbWeatherReports: mlbWeather.length,
        scrapedOdds: scrapedOdds.length,
        webhooksSent,
      },
      data: {
        earlyOdds,
        injuries: injuries.slice(0, 50),
        news: news.slice(0, 20),
        xBreakingNews: xNews.slice(0, 20),
        lineMovements,
        arbOpportunities,
        topArbSummaries: summaries,
        collegeBaseball: collegeBaseballData,
        nascarEntries: nascarEntries.slice(0, 50),
        mlbWeather,
        scrapedOdds: scrapedOdds.slice(0, 50),
      }
    })

  } catch (error: any) {
    console.error('[Early Lines] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Load picks from JSON file
 */
function loadPicksFromFile(filename: string): Pick[] {
  try {
    const filePath = join(process.cwd(), filename)
    if (!existsSync(filePath)) {
      console.log(`[Early Lines] File not found: ${filename}`)
      return []
    }

    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Convert to Pick format
    const picks: Pick[] = []
    for (const pick of data.picks || []) {
      picks.push({
        gameId: pick.gameId || `${pick.homeTeam}-${pick.awayTeam}`,
        sport: pick.sport || pick.league,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        gameDate: pick.gameDate || pick.gameTime,
        pick: pick.pick,
        confidence: pick.confidence || pick.winProbability || 0,
        expectedValue: pick.expectedValue || pick.edge || 0,
        odds: pick.odds || pick.bestOdds || 0,
        reasoning: pick.reasoning
      })
    }

    return picks
  } catch (error) {
    console.error(`[Early Lines] Error loading ${filename}:`, error)
    return []
  }
}
