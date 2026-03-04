/**
 * GAME CONTEXT MODULE
 * Provides weather + injury adjustments for Kalshi sports betting.
 * Called once per trade cycle to enrich Progno picks with real-world context
 * that the prediction model doesn't capture.
 *
 * Weather: WeatherAPI.com forecast for outdoor stadiums → total/spread adjustment.
 * Injuries: ESPN public injury API → confidence penalty when stars are OUT.
 */

import { weatherAnalyzer } from './weather-impact';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GameContextResult {
  /** Adjustment to model probability (positive = boost, negative = penalty) */
  probAdjustment: number;
  /** Reasons for the adjustment (appended to opportunity reasoning) */
  reasons: string[];
  /** If true, skip this game entirely (severe weather / critical injury) */
  shouldSkip: boolean;
}

interface EspnInjury {
  player: string;
  team: string;
  status: 'Out' | 'Doubtful' | 'Questionable' | 'Day-To-Day' | 'Probable';
  position: string;
}

// ── ESPN Injury Feed ─────────────────────────────────────────────────────────

const ESPN_INJURY_URLS: Record<string, string> = {
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/injuries',
  NCAAF: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/injuries',
};

// Star player keywords — if any of these positions are OUT, it's material
const STAR_POSITIONS = new Set(['QB', 'RB', 'WR', 'C', 'PG', 'SG', 'SF', 'PF', 'G', 'F', 'P', 'SP', 'RP']);

// Cache injuries per cycle (avoid hammering ESPN)
let injuryCache: Map<string, EspnInjury[]> | null = null;
let injuryCacheTime = 0;
const INJURY_CACHE_TTL = 15 * 60 * 1000; // 15 min

async function fetchEspnInjuries(league: string): Promise<EspnInjury[]> {
  const url = ESPN_INJURY_URLS[league];
  if (!url) return [];

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data: any = await res.json();

    const injuries: EspnInjury[] = [];
    // ESPN structure: { items: [ { team: { displayName }, injuries: [ { athlete: { displayName }, status, type: { abbreviation } } ] } ] }
    // OR newer: { resultSets or similar }
    const teams = data.items || data.teams || [];
    for (const t of teams) {
      const teamName = t.team?.displayName || t.displayName || '';
      const playerInjuries = t.injuries || [];
      for (const inj of playerInjuries) {
        const player = inj.athlete?.displayName || inj.fullName || '';
        const status = inj.status || inj.type?.description || '';
        const position = inj.athlete?.position?.abbreviation || inj.position?.abbreviation || '';
        if (player && status) {
          injuries.push({
            player,
            team: teamName,
            status: normalizeInjuryStatus(status),
            position,
          });
        }
      }
    }
    return injuries;
  } catch {
    return [];
  }
}

function normalizeInjuryStatus(raw: string): EspnInjury['status'] {
  const s = raw.toLowerCase();
  if (s.includes('out')) return 'Out';
  if (s.includes('doubtful')) return 'Doubtful';
  if (s.includes('questionable')) return 'Questionable';
  if (s.includes('day-to-day') || s.includes('day to day')) return 'Day-To-Day';
  return 'Probable';
}

async function getInjuriesForLeague(league: string): Promise<EspnInjury[]> {
  const now = Date.now();
  if (injuryCache && (now - injuryCacheTime) < INJURY_CACHE_TTL) {
    return injuryCache.get(league) || [];
  }
  // Refresh cache for all leagues in parallel
  injuryCache = new Map();
  injuryCacheTime = now;
  const leagues = Object.keys(ESPN_INJURY_URLS);
  const results = await Promise.all(leagues.map(l => fetchEspnInjuries(l)));
  leagues.forEach((l, i) => injuryCache!.set(l, results[i]));
  return injuryCache.get(league) || [];
}

function teamNameMatchesInjuryTeam(pickTeam: string, injuryTeam: string): boolean {
  if (!pickTeam || !injuryTeam) return false;
  const a = pickTeam.toLowerCase().trim();
  const b = injuryTeam.toLowerCase().trim();
  if (a === b) return true;
  // Check if last word (mascot) matches
  const aMascot = a.split(/\s+/).pop() || '';
  const bMascot = b.split(/\s+/).pop() || '';
  if (aMascot.length >= 4 && aMascot === bMascot) return true;
  // Check if pick team is contained in injury team or vice versa
  if (a.length >= 5 && b.includes(a)) return true;
  if (b.length >= 5 && a.includes(b)) return true;
  return false;
}

// ── Team → City for Weather ──────────────────────────────────────────────────

// Outdoor sports: NFL, MLB, CBB (college baseball). NBA and NHL are indoor.
const OUTDOOR_LEAGUES = new Set(['NFL', 'NCAAF', 'MLB', 'CBB']);

// Home team city lookup (used for weather forecast)
// Only need outdoor teams. Maps team name fragments → city for WeatherAPI.
const TEAM_CITY: Record<string, string> = {
  // NFL
  'bills': 'Buffalo, NY', 'dolphins': 'Miami, FL', 'patriots': 'Foxborough, MA', 'jets': 'East Rutherford, NJ',
  'ravens': 'Baltimore, MD', 'bengals': 'Cincinnati, OH', 'browns': 'Cleveland, OH', 'steelers': 'Pittsburgh, PA',
  'texans': 'Houston, TX', 'colts': 'Indianapolis, IN', 'jaguars': 'Jacksonville, FL', 'titans': 'Nashville, TN',
  'broncos': 'Denver, CO', 'chiefs': 'Kansas City, MO', 'raiders': 'Las Vegas, NV', 'chargers': 'Inglewood, CA',
  'bears': 'Chicago, IL', 'lions': 'Detroit, MI', 'packers': 'Green Bay, WI', 'vikings': 'Minneapolis, MN',
  'commanders': 'Landover, MD', 'giants': 'East Rutherford, NJ', 'eagles': 'Philadelphia, PA', 'cowboys': 'Arlington, TX',
  'falcons': 'Atlanta, GA', 'panthers': 'Charlotte, NC', 'saints': 'New Orleans, LA', 'buccaneers': 'Tampa, FL',
  'cardinals': 'Glendale, AZ', '49ers': 'Santa Clara, CA', 'seahawks': 'Seattle, WA', 'rams': 'Inglewood, CA',
  // MLB
  'yankees': 'Bronx, NY', 'red sox': 'Boston, MA', 'rays': 'St. Petersburg, FL', 'orioles': 'Baltimore, MD',
  'blue jays': 'Toronto, ON', 'white sox': 'Chicago, IL', 'guardians': 'Cleveland, OH', 'tigers': 'Detroit, MI',
  'royals': 'Kansas City, MO', 'twins': 'Minneapolis, MN', 'astros': 'Houston, TX', 'athletics': 'Oakland, CA',
  'mariners': 'Seattle, WA', 'rangers': 'Arlington, TX', 'angels': 'Anaheim, CA', 'braves': 'Atlanta, GA',
  'marlins': 'Miami, FL', 'mets': 'Queens, NY', 'phillies': 'Philadelphia, PA', 'nationals': 'Washington, DC',
  'cubs': 'Chicago, IL', 'reds': 'Cincinnati, OH', 'brewers': 'Milwaukee, WI', 'pirates': 'Pittsburgh, PA',
  'dodgers': 'Los Angeles, CA', 'padres': 'San Diego, CA', 'rockies': 'Denver, CO', 'diamondbacks': 'Phoenix, AZ',
};

// Indoor stadiums that override outdoor league default
const INDOOR_TEAMS = new Set([
  'cowboys', 'falcons', 'colts', 'raiders', 'rams', 'chargers', 'saints', 'texans', 'cardinals', 'vikings', 'lions',
  'rays', 'brewers', 'blue jays', 'diamondbacks', 'rangers',
]);

function lookupCity(homeTeam: string): string | null {
  const lower = homeTeam.toLowerCase();
  for (const [fragment, city] of Object.entries(TEAM_CITY)) {
    if (lower.includes(fragment)) return city;
  }
  return null;
}

function isOutdoor(homeTeam: string, league: string): boolean {
  if (!OUTDOOR_LEAGUES.has(league)) return false;
  const lower = homeTeam.toLowerCase();
  for (const indoor of INDOOR_TEAMS) {
    if (lower.includes(indoor)) return false;
  }
  return true;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get weather + injury context for a single Progno pick.
 * Returns probability adjustment and reasoning.
 * Designed to be called inside the Kalshi opportunity loop.
 */
export async function getGameContext(
  homeTeam: string,
  awayTeam: string,
  pickTeam: string,
  league: string,
): Promise<GameContextResult> {
  const reasons: string[] = [];
  let probAdj = 0;
  let shouldSkip = false;

  // ── Weather ────────────────────────────────────────────────────────────
  if (isOutdoor(homeTeam, league)) {
    const city = lookupCity(homeTeam);
    if (city) {
      try {
        const weather = await weatherAnalyzer.getWeatherForLocation(city, 3);
        if (weather) {
          const impact = weatherAnalyzer.calculateImpact(weather, league);

          if (impact.category === 'severe') {
            shouldSkip = true;
            reasons.push(`🌧️ SEVERE WEATHER at ${city}: ${impact.factors.slice(0, 2).join(', ')} — skipping`);
          } else if (impact.category === 'unfavorable') {
            // Unfavorable weather → reduce confidence in totals, slight edge for underdog
            probAdj -= 3;
            reasons.push(`🌧️ Weather at ${city}: ${impact.factors[0] || 'poor conditions'} (total adj ${impact.totalAdjustment})`);
          } else if (impact.totalAdjustment !== 0) {
            reasons.push(`🌤️ Weather at ${city}: ${weather.conditions} ${weather.temperature}°F`);
          }
        }
      } catch {
        // Weather API unavailable — no adjustment
      }
    }
  }

  // ── Injuries ───────────────────────────────────────────────────────────
  try {
    const injuries = await getInjuriesForLeague(league);
    if (injuries.length > 0) {
      // Find OUT/Doubtful players on the picked team and opponent
      const pickOut = injuries.filter(
        i => teamNameMatchesInjuryTeam(pickTeam, i.team) && (i.status === 'Out' || i.status === 'Doubtful')
      );
      const oppTeam = pickTeam === homeTeam ? awayTeam : homeTeam;
      const oppOut = injuries.filter(
        i => teamNameMatchesInjuryTeam(oppTeam, i.team) && (i.status === 'Out' || i.status === 'Doubtful')
      );

      // Stars OUT on our picked team → reduce confidence
      const pickStarsOut = pickOut.filter(i => STAR_POSITIONS.has(i.position));
      const oppStarsOut = oppOut.filter(i => STAR_POSITIONS.has(i.position));

      if (pickStarsOut.length >= 2) {
        probAdj -= 5;
        const names = pickStarsOut.slice(0, 3).map(i => `${i.player} (${i.position})`).join(', ');
        reasons.push(`🚑 ${pickTeam} missing: ${names}`);
      } else if (pickStarsOut.length === 1) {
        probAdj -= 2;
        reasons.push(`🚑 ${pickTeam} without ${pickStarsOut[0].player} (${pickStarsOut[0].position})`);
      }

      // Stars OUT on opponent → boost confidence
      if (oppStarsOut.length >= 2) {
        probAdj += 4;
        const names = oppStarsOut.slice(0, 3).map(i => `${i.player} (${i.position})`).join(', ');
        reasons.push(`🚑 ${oppTeam} missing: ${names} — edge for ${pickTeam}`);
      } else if (oppStarsOut.length === 1) {
        probAdj += 2;
        reasons.push(`🚑 ${oppTeam} without ${oppStarsOut[0].player} — slight edge for ${pickTeam}`);
      }
    }
  } catch {
    // ESPN unavailable — no adjustment
  }

  return { probAdjustment: probAdj, reasons, shouldSkip };
}

/**
 * Clear the injury cache (called at start of each trade cycle if needed).
 */
export function clearGameContextCache(): void {
  injuryCache = null;
  injuryCacheTime = 0;
}
