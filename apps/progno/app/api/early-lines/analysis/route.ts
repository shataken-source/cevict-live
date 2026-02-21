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
        news: news.length
      },
      data: {
        earlyOdds,
        injuries: injuries.slice(0, 50), // Top 50 by impact
        news: news.slice(0, 20), // Top 20 most recent
        lineMovements,
        arbOpportunities,
        topArbSummaries: summaries
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
