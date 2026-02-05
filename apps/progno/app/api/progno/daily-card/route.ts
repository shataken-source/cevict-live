import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
// import { getTrendingKalshiMarkets, getMarketProbability, KalshiMarket } from '@/kalshi-fetcher';
const getTrendingKalshiMarkets = async (_category?: string, _limit?: number): Promise<any[]> => [];
const getMarketProbability = (_market: any) => 0.5;
type KalshiMarket = any;

export const runtime = 'nodejs';

// Get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface StoredPick {
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
    date: string | Date;
  };
  pick: string;
  confidence: number;
  edge: number;
  sport?: string;
  keyFactors?: string[];
  rationale?: string;
  simulationResults?: {
    winRate: number;
    stdDev?: number;
    iterations?: number;
  };
  predictedScore?: {
    home: number;
    away: number;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  stake?: number;
}

export async function GET() {
  try {
    // Try database first (preferred method)
    const supabase = getSupabaseClient();
    let stored: StoredPick[] = [];

    if (supabase) {
      try {
        // Get today's predictions from database
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: predictions, error } = await supabase
          .from('progno_predictions')
          .select('*')
          .eq('prediction_type', 'sports')
          .eq('status', 'pending')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('confidence', { ascending: false })
          .limit(50);

        if (!error && predictions) {
          // Convert database predictions to StoredPick format
          stored = predictions.map((pred: any) => {
            const predData = pred.prediction_data || {};
            const gameData = predData.gameData || {};
            const prediction = predData.prediction || {};

            return {
              game: {
                id: pred.id,
                homeTeam: gameData.homeTeam || 'Unknown',
                awayTeam: gameData.awayTeam || 'Unknown',
                sport: pred.category || 'NFL',
                date: pred.created_at
              },
              pick: prediction.predictedWinner || gameData.homeTeam,
              confidence: pred.confidence / 100,
              edge: pred.edge_pct ? pred.edge_pct / 100 : 0,
              sport: pred.category,
              keyFactors: prediction.reasoning || [],
              rationale: pred.notes || '',
              predictedScore: prediction.predictedScore,
              riskLevel: pred.risk_level || 'medium'
            };
          });
        }
      } catch (dbError) {
        console.warn('[PROGNO] Database fetch failed, falling back to file:', dbError);
      }
    }

    // Fallback to file system if database is empty or unavailable
    if (stored.length === 0) {
      const prognoDir = path.join(process.cwd(), '.progno');
      const file = path.join(prognoDir, 'picks-all-leagues-latest.json');

      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf8');
          const parsed = JSON.parse(raw);
          stored = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          console.warn('[PROGNO] File read failed:', err);
        }
      }
    }

    const enriched = stored
      .map((p) => {
        if (!p?.game) return null;
        const sport = p.sport || (p.game as any).sport || 'NFL';
        const dateVal = (p.game as any).date;
        const kickoff = dateVal ? new Date(dateVal) : null;

        const edge = typeof p.edge === 'number' ? p.edge : 0;
        const confidence = typeof p.confidence === 'number' ? p.confidence : 0.5;

        const qualityScore = edge * 100 + confidence * 10;

        return {
          gameId: p.game.id,
          game: `${p.game.homeTeam} vs ${p.game.awayTeam}`,
          sport,
          pick: p.pick,
          confidencePct: Math.round(confidence * 100),
          edgePct: Math.round(edge * 1000) / 10,
          kickoff: kickoff ? kickoff.toISOString() : null,
          qualityScore,
          // Game analysis for paid tiers
          keyFactors: p.keyFactors || [],
          rationale: p.rationale || '',
          simulationResults: p.simulationResults || undefined,
          predictedScore: p.predictedScore || undefined,
          riskLevel: p.riskLevel || 'medium',
          stake: p.stake || undefined,
        };
      })
      .filter(Boolean) as {
      gameId: string;
      game: string;
      sport: string;
      pick: string;
      confidencePct: number;
      edgePct: number;
      kickoff: string | null;
      qualityScore: number;
      keyFactors: string[];
      rationale: string;
      simulationResults?: {
        winRate: number;
        stdDev?: number;
        iterations?: number;
      };
      predictedScore?: {
        home: number;
        away: number;
      };
      riskLevel: 'low' | 'medium' | 'high';
      stake?: number;
    }[];

    // Fetch Kalshi bets for Pro and Elite tiers
    let kalshiPicks: any[] = [];
    try {
      // Get trending sports markets from Kalshi
      const kalshiMarkets = await getTrendingKalshiMarkets('Sports', 20);

      kalshiPicks = kalshiMarkets
        .filter(market => market.status === 'open' && market.volume > 1000) // Only active markets with decent volume
        .map((market: KalshiMarket) => {
          const probability = getMarketProbability(market);
          const confidence = Math.round(probability * 100);
          // Calculate edge based on market probability vs our confidence
          // For Kalshi, edge is based on how far from 50% the market is
          const edge = Math.abs(probability - 0.5) * 100; // Convert to percentage

          // Extract teams/options from market title
          // Kalshi markets are usually "Will Team X win?" or "Will Team X beat Team Y?"
          const title = market.title || '';
          const teams = title.match(/(?:Will\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+win|\s+beat|\s+defeat)/i) ||
                       title.match(/([A-Z][a-zA-Z\s]+?)\s+vs\s+([A-Z][a-zA-Z\s]+?)/i);

          let pick = 'Yes'; // Default to Yes side
          let gameName = market.title || market.ticker;

          if (teams && teams.length > 1) {
            // If we can extract teams, use them
            const team1 = teams[1]?.trim();
            const team2 = teams[2]?.trim();
            if (team1 && team2) {
              gameName = `${team1} vs ${team2}`;
              // Pick the side with higher probability
              pick = probability > 0.5 ? team1 : team2;
            } else if (team1) {
              gameName = `${team1} - ${market.title}`;
              pick = probability > 0.5 ? team1 : 'No';
            }
          }

          return {
            gameId: `kalshi-${market.ticker}`,
            game: gameName,
            sport: market.category || 'Kalshi',
            pick: pick,
            confidencePct: confidence,
            edgePct: Math.round(edge * 10) / 10,
            kickoff: market.closeTime || null,
            qualityScore: edge * 100 + confidence * 10,
            isKalshi: true, // Mark as Kalshi bet
            kalshiMarket: {
              ticker: market.ticker,
              title: market.title,
              probability: probability,
              volume: market.volume,
              lastPrice: market.lastPrice,
            },
            keyFactors: [`Kalshi market probability: ${(probability * 100).toFixed(1)}%`, `Market volume: ${market.volume.toLocaleString()}`],
            rationale: `Kalshi prediction market: ${market.title}. Market probability indicates ${(probability * 100).toFixed(1)}% chance.`,
            riskLevel: market.volume > 50000 ? 'low' : market.volume > 10000 ? 'medium' : 'high',
          };
        })
        .filter(pick => pick.confidencePct >= 55) // Only include markets with decent confidence
        .sort((a, b) => b.qualityScore - a.qualityScore);
    } catch (kalshiError) {
      console.warn('[PROGNO] Failed to fetch Kalshi bets:', kalshiError);
      // Continue without Kalshi bets if fetch fails
    }

    // Combine regular picks with Kalshi picks
    // Kalshi picks are marked and will be shown separately in Pro/Elite tiers
    const allPicks = [...enriched, ...kalshiPicks];
    allPicks.sort((a, b) => b.qualityScore - a.qualityScore);

    return NextResponse.json({
      success: true,
      picks: allPicks,
      count: allPicks.length,
      kalshiCount: kalshiPicks.length,
      timestamp: new Date().toISOString(),
      source: 'picks-all-leagues-latest',
    });
  } catch (error: any) {
    console.error('[PROGNO] /api/progno/daily-card error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}



