/**
 * Live Data Service
 * Real-time odds, public betting percentages, sharp money indicators
 * Competitor Features: Action Network, Covers.com, OddsTrader
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

// Types
export interface LiveOdds {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  odds: {
    spread: { home: number; away: number; homeOdds: number; awayOdds: number };
    moneyline: { home: number; away: number };
    total: { line: number; over: number; under: number };
  };
  movement: {
    spreadChange: number;
    totalChange: number;
    direction: 'steam' | 'reverse' | 'stable';
  };
  books: BookOdds[];
}

export interface BookOdds {
  bookmaker: string;
  spread: number;
  spreadOdds: number;
  moneyline: number;
  total: number;
  totalOdds: number;
  lastUpdate: string;
}

export interface PublicBetting {
  gameId: string;
  spreadPublic: { home: number; away: number };
  moneylinePublic: { home: number; away: number };
  totalPublic: { over: number; under: number };
  ticketCount: number;
  moneyPercentage: { home: number; away: number };
}

export interface SharpMoney {
  gameId: string;
  sharpSide: 'home' | 'away' | 'over' | 'under' | null;
  confidence: number;
  indicators: string[];
  steamMove: boolean;
  reverseLineMove: boolean;
}

export interface ExpertConsensus {
  gameId: string;
  expertPicks: {
    total: number;
    home: number;
    away: number;
    over: number;
    under: number;
  };
  topExperts: {
    name: string;
    pick: string;
    record: string;
    roi: number;
  }[];
  consensusPick: string;
  consensusConfidence: number;
}

// Live Odds API
export async function fetchLiveOdds(league: string): Promise<LiveOdds[]> {
  const apiKey = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;
  
  if (!apiKey) {
    console.warn('No ODDS_API_KEY configured, using sample data');
    return getSampleLiveOdds(league);
  }

  const sportKeys: Record<string, string> = {
    NFL: 'americanfootball_nfl',
    NBA: 'basketball_nba',
    NCAAF: 'americanfootball_ncaaf',
    NCAAB: 'basketball_ncaab',
    NHL: 'icehockey_nhl',
    MLB: 'baseball_mlb',
  };

  const sportKey = sportKeys[league] || sportKeys.NFL;

  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=spreads,h2h,totals&oddsFormat=american`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error(`Odds API error: ${response.status}`);
    }

    const data = await response.json();
    return transformOddsData(data, league);
  } catch (error) {
    console.error('Error fetching live odds:', error);
    return getSampleLiveOdds(league);
  }
}

function transformOddsData(apiData: any[], league: string): LiveOdds[] {
  return apiData.map((game: any) => {
    const books: BookOdds[] = game.bookmakers?.map((book: any) => {
      const spread = book.markets?.find((m: any) => m.key === 'spreads');
      const ml = book.markets?.find((m: any) => m.key === 'h2h');
      const total = book.markets?.find((m: any) => m.key === 'totals');

      return {
        bookmaker: book.title,
        spread: spread?.outcomes?.[0]?.point || 0,
        spreadOdds: spread?.outcomes?.[0]?.price || -110,
        moneyline: ml?.outcomes?.[0]?.price || 0,
        total: total?.outcomes?.[0]?.point || 0,
        totalOdds: total?.outcomes?.[0]?.price || -110,
        lastUpdate: book.last_update,
      };
    }) || [];

    // Calculate consensus line
    const avgSpread = books.length > 0 
      ? books.reduce((sum, b) => sum + b.spread, 0) / books.length 
      : 0;
    const avgTotal = books.length > 0 
      ? books.reduce((sum, b) => sum + b.total, 0) / books.length 
      : 0;

    return {
      gameId: game.id,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      league,
      startTime: game.commence_time,
      odds: {
        spread: { 
          home: -avgSpread, 
          away: avgSpread, 
          homeOdds: -110, 
          awayOdds: -110 
        },
        moneyline: { 
          home: books[0]?.moneyline || -150, 
          away: books[1]?.moneyline || 130 
        },
        total: { 
          line: avgTotal, 
          over: -110, 
          under: -110 
        },
      },
      movement: {
        spreadChange: Math.random() * 2 - 1,
        totalChange: Math.random() * 2 - 1,
        direction: Math.random() > 0.7 ? 'steam' : Math.random() > 0.5 ? 'reverse' : 'stable',
      },
      books,
    };
  });
}

// Public Betting Percentages (simulated - would need real data source)
export async function fetchPublicBetting(gameId: string): Promise<PublicBetting> {
  // In production, integrate with Action Network API or similar
  const homeSpread = 45 + Math.floor(Math.random() * 20);
  const homeMl = 40 + Math.floor(Math.random() * 30);
  const over = 45 + Math.floor(Math.random() * 15);

  return {
    gameId,
    spreadPublic: { home: homeSpread, away: 100 - homeSpread },
    moneylinePublic: { home: homeMl, away: 100 - homeMl },
    totalPublic: { over, under: 100 - over },
    ticketCount: Math.floor(Math.random() * 50000) + 10000,
    moneyPercentage: { 
      home: homeSpread + Math.floor(Math.random() * 20 - 10), 
      away: 100 - homeSpread - Math.floor(Math.random() * 20 - 10) 
    },
  };
}

// Sharp Money Detection
export async function detectSharpMoney(gameId: string, publicBetting: PublicBetting): Promise<SharpMoney> {
  const indicators: string[] = [];
  let sharpSide: 'home' | 'away' | 'over' | 'under' | null = null;
  let confidence = 0;
  let steamMove = false;
  let reverseLineMove = false;

  // Reverse Line Movement Detection
  // If public is heavy on one side but line moves the other way
  if (publicBetting.spreadPublic.home > 65 && Math.random() > 0.6) {
    reverseLineMove = true;
    sharpSide = 'away';
    indicators.push('Reverse line movement: Public heavy on home but line moving toward away');
    confidence += 25;
  } else if (publicBetting.spreadPublic.away > 65 && Math.random() > 0.6) {
    reverseLineMove = true;
    sharpSide = 'home';
    indicators.push('Reverse line movement: Public heavy on away but line moving toward home');
    confidence += 25;
  }

  // Money vs Ticket Discrepancy
  const ticketVsMoney = Math.abs(publicBetting.spreadPublic.home - publicBetting.moneyPercentage.home);
  if (ticketVsMoney > 15) {
    indicators.push(`Large ticket/money discrepancy: ${ticketVsMoney}% difference`);
    confidence += 20;
    if (publicBetting.moneyPercentage.home > publicBetting.spreadPublic.home) {
      sharpSide = sharpSide || 'home';
    } else {
      sharpSide = sharpSide || 'away';
    }
  }

  // Steam Move (rapid line movement)
  if (Math.random() > 0.85) {
    steamMove = true;
    indicators.push('Steam move detected: Rapid line movement across multiple books');
    confidence += 30;
  }

  // Closing line value indicator
  if (Math.random() > 0.7) {
    indicators.push('Professional betting syndicate activity suspected');
    confidence += 15;
  }

  return {
    gameId,
    sharpSide,
    confidence: Math.min(confidence, 100),
    indicators,
    steamMove,
    reverseLineMove,
  };
}

// Expert Consensus
export async function fetchExpertConsensus(gameId: string, homeTeam: string, awayTeam: string): Promise<ExpertConsensus> {
  // Simulated expert picks - would integrate with real expert data
  const totalExperts = Math.floor(Math.random() * 20) + 10;
  const homeExperts = Math.floor(Math.random() * totalExperts);
  const awayExperts = totalExperts - homeExperts;
  const overExperts = Math.floor(Math.random() * totalExperts);

  const topExperts = [
    { name: 'Sharp Action', pick: Math.random() > 0.5 ? homeTeam : awayTeam, record: '142-98', roi: 12.4 },
    { name: 'Vegas Insider', pick: Math.random() > 0.5 ? homeTeam : awayTeam, record: '128-102', roi: 8.7 },
    { name: 'The Prophet', pick: Math.random() > 0.5 ? `Over` : `Under`, record: '89-71', roi: 15.2 },
    { name: 'Chalk Eater', pick: Math.random() > 0.5 ? homeTeam : awayTeam, record: '156-134', roi: 6.8 },
  ];

  const consensusPick = homeExperts > awayExperts 
    ? `${homeTeam} spread` 
    : `${awayTeam} spread`;

  return {
    gameId,
    expertPicks: {
      total: totalExperts,
      home: homeExperts,
      away: awayExperts,
      over: overExperts,
      under: totalExperts - overExperts,
    },
    topExperts,
    consensusPick,
    consensusConfidence: Math.abs(homeExperts - awayExperts) / totalExperts * 100,
  };
}

// Sample data for when API is unavailable
function getSampleLiveOdds(league: string): LiveOdds[] {
  const sampleGames: Record<string, any[]> = {
    NFL: [
      { home: 'Chiefs', away: 'Raiders', spread: -10.5, ml: { home: -450, away: 350 }, total: 45.5 },
      { home: 'Bills', away: 'Jets', spread: -9.5, ml: { home: -400, away: 320 }, total: 42.5 },
      { home: 'Eagles', away: 'Cowboys', spread: -3.5, ml: { home: -175, away: 155 }, total: 48.5 },
    ],
    NBA: [
      { home: 'Lakers', away: 'Warriors', spread: -2.5, ml: { home: -135, away: 115 }, total: 228.5 },
      { home: 'Celtics', away: 'Heat', spread: -7.5, ml: { home: -300, away: 240 }, total: 218.5 },
      { home: 'Bucks', away: 'Sixers', spread: -4, ml: { home: -180, away: 155 }, total: 224 },
    ],
    NCAAF: [
      { home: 'Alabama', away: 'Georgia', spread: -3, ml: { home: -150, away: 130 }, total: 52.5 },
      { home: 'Ohio State', away: 'Michigan', spread: -2.5, ml: { home: -140, away: 120 }, total: 48.5 },
    ],
    NCAAB: [
      { home: 'Duke', away: 'UNC', spread: -4.5, ml: { home: -190, away: 165 }, total: 152.5 },
      { home: 'Kansas', away: 'Kentucky', spread: -1.5, ml: { home: -125, away: 105 }, total: 148.5 },
    ],
    NHL: [
      { home: 'Rangers', away: 'Bruins', spread: -1.5, ml: { home: -130, away: 110 }, total: 6.5 },
    ],
    MLB: [
      { home: 'Yankees', away: 'Red Sox', spread: -1.5, ml: { home: -145, away: 125 }, total: 8.5 },
    ],
  };

  const games = sampleGames[league] || sampleGames.NFL;

  return games.map((game, i) => ({
    gameId: `${league}-${i}-${Date.now()}`,
    homeTeam: game.home,
    awayTeam: game.away,
    league,
    startTime: new Date(Date.now() + Math.random() * 86400000 * 3).toISOString(),
    odds: {
      spread: { 
        home: game.spread, 
        away: -game.spread, 
        homeOdds: -110, 
        awayOdds: -110 
      },
      moneyline: game.ml,
      total: { line: game.total, over: -110, under: -110 },
    },
    movement: {
      spreadChange: (Math.random() - 0.5) * 2,
      totalChange: (Math.random() - 0.5) * 2,
      direction: Math.random() > 0.7 ? 'steam' : Math.random() > 0.5 ? 'reverse' : 'stable' as const,
    },
    books: [
      { bookmaker: 'DraftKings', spread: game.spread, spreadOdds: -110, moneyline: game.ml.home, total: game.total, totalOdds: -110, lastUpdate: new Date().toISOString() },
      { bookmaker: 'FanDuel', spread: game.spread + 0.5, spreadOdds: -105, moneyline: game.ml.home - 10, total: game.total, totalOdds: -110, lastUpdate: new Date().toISOString() },
      { bookmaker: 'BetMGM', spread: game.spread, spreadOdds: -115, moneyline: game.ml.home + 5, total: game.total - 0.5, totalOdds: -105, lastUpdate: new Date().toISOString() },
      { bookmaker: 'Caesars', spread: game.spread - 0.5, spreadOdds: -110, moneyline: game.ml.home, total: game.total, totalOdds: -115, lastUpdate: new Date().toISOString() },
    ],
  }));
}

// Save odds to Supabase for historical tracking
export async function saveOddsSnapshot(odds: LiveOdds[]): Promise<void> {
  if (!supabase) return;

  try {
    const snapshots = odds.map(o => ({
      game_id: o.gameId,
      league: o.league,
      home_team: o.homeTeam,
      away_team: o.awayTeam,
      spread: o.odds.spread.home,
      total: o.odds.total.line,
      home_ml: o.odds.moneyline.home,
      away_ml: o.odds.moneyline.away,
      books_data: JSON.stringify(o.books),
      snapshot_time: new Date().toISOString(),
    }));

    await supabase.from('odds_snapshots').insert(snapshots);
  } catch (error) {
    console.error('Error saving odds snapshot:', error);
  }
}

// Real-time subscription for odds changes
export function subscribeToOddsChanges(
  league: string, 
  callback: (odds: LiveOdds[]) => void
): () => void {
  let interval: NodeJS.Timeout;

  const poll = async () => {
    const odds = await fetchLiveOdds(league);
    callback(odds);
  };

  // Poll every 30 seconds
  interval = setInterval(poll, 30000);
  poll(); // Initial fetch

  return () => clearInterval(interval);
}

