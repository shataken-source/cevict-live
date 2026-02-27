/**
 * SPORTS KALSHI BOT
 * Combines live sports odds with Kalshi prediction markets
 * Uses CEVICT FLUX engine predictions to bet on sports outcomes
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
const alphaRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });

import { KalshiTrader } from './intelligence/kalshi-trader';
import { OllamaAsAnthropic as Anthropic } from './lib/local-ai';

// ============================================================================
// CONFIGURATION
// ============================================================================

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
if (!THE_ODDS_API_KEY) {
  console.error('THE_ODDS_API_KEY (or ODDS_API_KEY) environment variable is required');
  process.exit(1);
}
const MAX_BET_SIZE = 5; // $5 max per bet

const SPORT_KEYS: Record<string, string> = {
  'nfl': 'americanfootball_nfl',
  'nba': 'basketball_nba',
  'ncaaf': 'americanfootball_ncaaf',
  'ncaab': 'basketball_ncaab',
};

// ============================================================================
// TYPES
// ============================================================================

interface LiveGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  spread: number;
  overUnder: number;
  homeOdds: number;
  awayOdds: number;
  startTime: string;
}

interface Prediction {
  game: LiveGame;
  pick: string;
  probability: number;
  confidence: number;
  expectedValue: number;
  recommendedStake: number;
  shouldBet: boolean;
}

interface KalshiMatch {
  marketId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  matchedGame: LiveGame;
  prediction: Prediction;
  side: 'yes' | 'no';
  edge: number;
}

// ============================================================================
// LIVE ODDS FETCHER
// ============================================================================

async function fetchLiveGames(sport: string): Promise<LiveGame[]> {
  const sportKey = SPORT_KEYS[sport.toLowerCase()] || sport;

  console.log(`\n📡 Fetching LIVE ${sport.toUpperCase()} odds...`);

  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${THE_ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      return [];
    }

    const data: any = await response.json();
    const remaining = response.headers.get('x-requests-remaining');
    console.log(`📊 API: ${remaining} requests remaining\n`);

    return data.map((game: any) => {
      const bookmaker = game.bookmakers[0];
      const spreadMarket = bookmaker?.markets?.find((m: any) => m.key === 'spreads');
      const homeSpread = spreadMarket?.outcomes?.find((o: any) => o.name === game.home_team);
      const totalsMarket = bookmaker?.markets?.find((m: any) => m.key === 'totals');
      const h2hMarket = bookmaker?.markets?.find((m: any) => m.key === 'h2h');

      return {
        id: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        spread: homeSpread?.point || 0,
        overUnder: totalsMarket?.outcomes?.[0]?.point || 45,
        homeOdds: h2hMarket?.outcomes?.find((o: any) => o.name === game.home_team)?.price || -110,
        awayOdds: h2hMarket?.outcomes?.find((o: any) => o.name === game.away_team)?.price || -110,
        startTime: game.commence_time,
      };
    });
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }
}

// ============================================================================
// PREDICTION ENGINE (Simplified CEVICT FLUX)
// ============================================================================

function predictGame(game: LiveGame): Prediction {
  // Calculate implied probability from moneyline
  const homeImplied = game.homeOdds < 0
    ? Math.abs(game.homeOdds) / (Math.abs(game.homeOdds) + 100)
    : 100 / (game.homeOdds + 100);

  const awayImplied = game.awayOdds < 0
    ? Math.abs(game.awayOdds) / (Math.abs(game.awayOdds) + 100)
    : 100 / (game.awayOdds + 100);

  // Factor in spread
  const spreadFactor = Math.abs(game.spread) / 10;
  const homeAdvantage = game.spread < 0 ? spreadFactor * 0.1 : -spreadFactor * 0.1;

  // Our prediction (combining market + spread analysis)
  let homeProbability = homeImplied + homeAdvantage;
  homeProbability = Math.max(0.2, Math.min(0.8, homeProbability)); // Clamp

  // Determine pick
  const pickHome = homeProbability > 0.5;
  const pick = pickHome
    ? `${game.homeTeam} ${game.spread > 0 ? '+' : ''}${game.spread}`
    : `${game.awayTeam} ${-game.spread > 0 ? '+' : ''}${-game.spread}`;

  const probability = pickHome ? homeProbability : 1 - homeProbability;
  const marketProb = pickHome ? homeImplied : awayImplied;
  const edge = (probability - marketProb) * 100;

  // Confidence based on spread size and odds clarity
  const confidence = 50 + Math.min(30, Math.abs(edge) * 2);

  // Expected value
  const odds = pickHome ? game.homeOdds : game.awayOdds;
  const payout = odds < 0 ? 100 / Math.abs(odds) : odds / 100;
  const ev = (probability * payout - (1 - probability)) * 100;

  // Kelly criterion for stake
  const kelly = (probability * (payout + 1) - 1) / payout;
  const stake = Math.max(0, Math.min(MAX_BET_SIZE, kelly * 100 * 0.25));

  return {
    game,
    pick,
    probability: probability * 100,
    confidence,
    expectedValue: ev,
    recommendedStake: stake,
    shouldBet: ev > 3 && confidence > 55,
  };
}

// ============================================================================
// KALSHI MARKET MATCHER
// ============================================================================

async function findKalshiSportsMarkets(kalshi: KalshiTrader): Promise<any[]> {
  console.log('🔍 Searching Kalshi for sports markets...\n');

  // Try to get sports-related markets
  const markets = await kalshi.getMarkets();

  // Filter for sports-related markets
  const sportsKeywords = ['nfl', 'nba', 'ncaa', 'football', 'basketball', 'super bowl',
    'playoff', 'championship', 'game', 'win', 'score', 'points'];

  const sportsMarkets = markets.filter((m: any) => {
    const title = m.title.toLowerCase();
    return sportsKeywords.some(keyword => title.includes(keyword));
  });

  console.log(`📋 Found ${sportsMarkets.length} sports-related markets on Kalshi\n`);
  return sportsMarkets;
}

function matchGameToKalshiMarket(game: LiveGame, markets: any[]): any | null {
  // Try to find a Kalshi market that matches this game
  const homeWords = game.homeTeam.toLowerCase().split(' ');
  const awayWords = game.awayTeam.toLowerCase().split(' ');

  for (const market of markets) {
    const title = market.title.toLowerCase();
    const homeMatch = homeWords.some((word: string) => word.length > 3 && title.includes(word));
    const awayMatch = awayWords.some((word: string) => word.length > 3 && title.includes(word));

    if (homeMatch || awayMatch) {
      return market;
    }
  }

  return null;
}

// ============================================================================
// MAIN BOT
// ============================================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🏈 SPORTS KALSHI BOT 🏈                              ║
║                                                              ║
║  Live Sports Odds → CEVICT Predictions → Kalshi Bets        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Initialize Kalshi
  const kalshi = new KalshiTrader();

  // Check Kalshi balance
  const balance = await kalshi.getBalance();
  console.log(`💰 Kalshi Balance: $${balance.toFixed(2)}\n`);

  if (balance < 5) {
    console.log('❌ Insufficient Kalshi balance. Need at least $5.');
    return;
  }

  // Get sport from command line or default to NBA
  const sport = process.argv[2] || 'nba';

  // Fetch live games
  const games = await fetchLiveGames(sport);

  if (games.length === 0) {
    console.log(`❌ No live ${sport.toUpperCase()} games found.`);
    return;
  }

  console.log(`\n🏀 Found ${games.length} live ${sport.toUpperCase()} games\n`);
  console.log('═'.repeat(60));

  // Get predictions for each game
  const predictions: Prediction[] = [];

  for (const game of games) {
    const prediction = predictGame(game);
    predictions.push(prediction);

    console.log(`\n${game.awayTeam} @ ${game.homeTeam}`);
    console.log(`  Spread: ${game.spread > 0 ? '+' : ''}${game.spread} | O/U: ${game.overUnder}`);
    console.log(`  ML: Home ${game.homeOdds} / Away ${game.awayOdds}`);
    console.log(`  → Pick: ${prediction.pick}`);
    console.log(`  → Prob: ${prediction.probability.toFixed(1)}% | EV: ${prediction.expectedValue > 0 ? '+' : ''}${prediction.expectedValue.toFixed(1)}%`);
    console.log(`  → ${prediction.shouldBet ? '✅ BET $' + prediction.recommendedStake.toFixed(2) : '❌ PASS'}`);
  }

  // Filter for bettable predictions
  const bets = predictions.filter(p => p.shouldBet);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`\n📊 SUMMARY: ${bets.length} potential bets out of ${predictions.length} games\n`);

  if (bets.length === 0) {
    console.log('No profitable bets found. Waiting for better opportunities.');
    return;
  }

  // Find Kalshi markets
  const kalshiMarkets = await findKalshiSportsMarkets(kalshi);

  // Try to match our predictions to Kalshi markets
  console.log('\n🎯 ATTEMPTING TO PLACE BETS ON KALSHI:\n');

  for (const bet of bets) {
    const matchedMarket = matchGameToKalshiMarket(bet.game, kalshiMarkets);

    if (matchedMarket) {
      console.log(`✅ Found Kalshi market: "${matchedMarket.title}"`);
      console.log(`   Our pick: ${bet.pick}`);
      console.log(`   Market price: YES ${matchedMarket.yesPrice}¢ / NO ${matchedMarket.noPrice}¢`);

      // Determine side (yes/no) based on our prediction
      const side: 'yes' | 'no' = bet.probability > 50 ? 'yes' : 'no';
      const price = side === 'yes' ? matchedMarket.yesPrice : matchedMarket.noPrice;

      // Place the bet
      console.log(`   Placing $${bet.recommendedStake.toFixed(2)} on ${side.toUpperCase()}...`);

      const trade = await kalshi.placeLimitOrderUsd(
        matchedMarket.id,
        side,
        bet.recommendedStake,
        price + 5 // Max price with 5c slippage
      );

      if (trade) {
        console.log(`   ✅ BET PLACED! Trade ID: ${trade.id}`);
      } else {
        console.log(`   ❌ Failed to place bet`);
      }
    } else {
      console.log(`⚠️  No Kalshi market found for: ${bet.game.homeTeam} vs ${bet.game.awayTeam}`);
      console.log(`   Our pick would be: ${bet.pick} (EV: +${bet.expectedValue.toFixed(1)}%)`);
    }

    console.log('');
  }

  // Show available Kalshi sports markets
  if (kalshiMarkets.length > 0) {
    console.log('\n📋 AVAILABLE KALSHI SPORTS MARKETS:\n');
    kalshiMarkets.slice(0, 10).forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. ${m.title}`);
      console.log(`     YES: ${m.yesPrice}¢ | NO: ${m.noPrice}¢`);
    });
  }

  console.log('\n✅ Sports Kalshi Bot complete!\n');
}

main().catch(console.error);

