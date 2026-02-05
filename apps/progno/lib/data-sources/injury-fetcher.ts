/**
 * Injury Data Fetcher
 * Integrates Rotowire API and file-based injury data into Progno predictions
 * Priority: Rotowire API > File-based scraping
 */

import fs from 'fs';
import path from 'path';

export interface InjuryReport {
  player: string;
  team: string;
  status: string; // e.g., "Out", "Questionable", "Probable", "Doubtful"
  injury: string;
  sport: string;
  scraped_at: string;
  position?: string; // Added for API data
}

interface InjuryData {
  [sport: string]: InjuryReport[];
}

let cachedInjuries: InjuryData | null = null;
let lastLoadTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const ROTOWIRE_API_KEY = process.env.ROTOWIRE_API_KEY;
const ROTOWIRE_API_URL = process.env.ROTOWIRE_API_URL || 'https://api.rotowire.com/v1';

/**
 * Fetch injuries from Rotowire API (if available)
 */
async function fetchFromRotowireAPI(sport: string): Promise<InjuryReport[]> {
  if (!ROTOWIRE_API_KEY) {
    return [];
  }

  try {
    const sportMap: Record<string, string> = {
      'NFL': 'nfl',
      'NBA': 'nba',
      'MLB': 'mlb',
      'NHL': 'nhl',
      'NCAAF': 'cfb',
      'NCAAB': 'cbb'
    };

    const sportKey = sportMap[sport] || sport.toLowerCase();
    const url = `${ROTOWIRE_API_URL}/injuries/${sportKey}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ROTOWIRE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`[InjuryFetcher] Rotowire API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Parse Rotowire API response format
    const injuries: InjuryReport[] = (data.injuries || data || []).map((inj: any) => ({
      player: inj.player_name || inj.player || 'Unknown',
      team: inj.team_name || inj.team || 'Unknown',
      status: inj.status || inj.injury_status || 'Unknown',
      injury: inj.injury_type || inj.injury || 'Unknown',
      sport: sport,
      scraped_at: new Date().toISOString(),
      position: inj.position || ''
    }));

    return injuries;
  } catch (error) {
    console.error('[InjuryFetcher] Rotowire API fetch error:', error);
    return [];
  }
}

/**
 * Load injury data from file (fallback)
 */
function loadInjuryDataFromFile(): InjuryData {
  const prognoDir = path.join(process.cwd(), '.progno');
  const file = path.join(prognoDir, 'rotowire-injuries.json');

  if (!fs.existsSync(file)) {
    console.warn(`[InjuryFetcher] Injury data file not found: ${file}. Run scrape-rotowire-injuries.py first.`);
    return {};
  }

  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data) || {};
  } catch (error) {
    console.error('[InjuryFetcher] Failed to load injury data from file:', error);
    return {};
  }
}

/**
 * Load injury data (API first, then file fallback)
 */
async function loadInjuryData(sport?: string): Promise<InjuryData> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedInjuries && (now - lastLoadTime) < CACHE_DURATION) {
    return cachedInjuries;
  }

  const injuryData: InjuryData = {};

  // Try Rotowire API for each sport
  const sports = sport ? [sport] : ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

  for (const s of sports) {
    const apiInjuries = await fetchFromRotowireAPI(s);
    if (apiInjuries.length > 0) {
      injuryData[s] = apiInjuries;
    } else {
      // Fallback to file-based data
      const fileData = loadInjuryDataFromFile();
      if (fileData[s]) {
        injuryData[s] = fileData[s];
      }
    }
  }

  // If no API data and no file data, try file for all sports
  if (Object.keys(injuryData).length === 0) {
    const fileData = loadInjuryDataFromFile();
    Object.assign(injuryData, fileData);
  }

  cachedInjuries = injuryData;
  lastLoadTime = now;
  return injuryData;
}

/**
 * Get injuries for a specific team
 */
export async function getTeamInjuries(sport: string, teamName: string): Promise<InjuryReport[]> {
  const data = await loadInjuryData(sport);
  const sportData = data[sport] || [];

  // Normalize team name for matching (remove common suffixes, handle abbreviations)
  const normalizedTeam = normalizeTeamName(teamName);

  return sportData.filter(injury => {
    const normalizedInjuryTeam = normalizeTeamName(injury.team);
    return normalizedInjuryTeam === normalizedTeam ||
           normalizedInjuryTeam.includes(normalizedTeam) ||
           normalizedTeam.includes(normalizedInjuryTeam);
  });
}

/**
 * Synchronous version (for backwards compatibility)
 * Uses cached data or file-based data
 */
export function getTeamInjuriesSync(sport: string, teamName: string): InjuryReport[] {
  const data = loadInjuryDataFromFile();
  const sportData = data[sport] || [];

  const normalizedTeam = normalizeTeamName(teamName);

  return sportData.filter(injury => {
    const normalizedInjuryTeam = normalizeTeamName(injury.team);
    return normalizedInjuryTeam === normalizedTeam ||
           normalizedInjuryTeam.includes(normalizedTeam) ||
           normalizedTeam.includes(normalizedInjuryTeam);
  });
}

/**
 * Calculate injury impact score for a team
 * Returns a number between 0 and 1, where 0 = no impact, 1 = severe impact
 */
export async function calculateInjuryImpact(sport: string, teamName: string): Promise<number> {
  const injuries = await getTeamInjuries(sport, teamName);

  if (injuries.length === 0) return 0;

  let impactScore = 0;
  const statusWeights: Record<string, number> = {
    'Out': 1.0,
    'Doubtful': 0.75,
    'Questionable': 0.5,
    'Probable': 0.25,
    'Day-to-Day': 0.3,
    'IR': 0.9, // Injured Reserve
    'PUP': 0.8, // Physically Unable to Perform
  };

  for (const injury of injuries) {
    const status = injury.status.toLowerCase();
    let weight = 0.5; // Default weight

    // Find matching status weight
    for (const [key, value] of Object.entries(statusWeights)) {
      if (status.includes(key.toLowerCase())) {
        weight = value;
        break;
      }
    }

    impactScore += weight;
  }

  // Normalize to 0-1 scale (cap at 1.0)
  // For NFL: 5+ key injuries = max impact
  // For NBA: 3+ key injuries = max impact
  const maxInjuries = sport === 'NFL' ? 5 : 3;
  return Math.min(impactScore / maxInjuries, 1.0);
}

/**
 * Get key player injuries (star players, QBs, etc.)
 */
export async function getKeyPlayerInjuries(sport: string, teamName: string): Promise<InjuryReport[]> {
  const injuries = await getTeamInjuries(sport, teamName);

  // Filter for critical positions/players
  const criticalStatuses = ['Out', 'Doubtful', 'IR', 'PUP'];
  return injuries.filter(injury => {
    const status = injury.status.toLowerCase();
    return criticalStatuses.some(critical => status.includes(critical.toLowerCase()));
  });
}

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)\s+/i, '');
}

/**
 * Refresh injury data cache
 */
export async function refreshInjuryCache(): Promise<void> {
  cachedInjuries = null;
  lastLoadTime = 0;
  await loadInjuryData();
}
