/**
 * Injury Data Fetcher
 * Priority: Rotowire API > File-based data
 * Hardened with timeouts, retries, caching, validation, and robust fallbacks
 */

import fs from 'fs';
import path from 'path';

export interface InjuryReport {
  player: string;
  team: string;
  status: string;
  injury: string;
  sport: string;
  scraped_at: string;
  position?: string;
}

interface InjuryData {
  [sport: string]: InjuryReport[];
}

let cachedInjuries: InjuryData | null = null;
let lastLoadTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const ROTOWIRE_API_KEY = process.env.ROTOWIRE_API_KEY;
const ROTOWIRE_API_URL = process.env.ROTOWIRE_API_URL || 'https://api.rotowire.com/v1';

export async function getTeamInjuries(sport: string, teamName: string): Promise<InjuryReport[]> {
  if (!sport || !teamName) return [];

  const data = await loadInjuryData(sport);
  const sportData = data[sport] || [];

  const normalizedTeam = normalizeTeamName(teamName);

  return sportData.filter(injury => {
    const normalizedInjuryTeam = normalizeTeamName(injury.team);
    return normalizedInjuryTeam === normalizedTeam ||
           normalizedInjuryTeam.includes(normalizedTeam) ||
           normalizedTeam.includes(normalizedInjuryTeam);
  });
}

async function loadInjuryData(sport?: string): Promise<InjuryData> {
  const now = Date.now();
  if (cachedInjuries && (now - lastLoadTime) < CACHE_DURATION) {
    return cachedInjuries;
  }

  const injuryData: InjuryData = {};

  const sports = sport ? [sport] : ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

  for (const s of sports) {
    let injuries: InjuryReport[] = [];

    if (ROTOWIRE_API_KEY) {
      injuries = await fetchFromRotowireWithRetry(s);
    }

    if (injuries.length === 0) {
      injuries = loadFromFile(s);
    }

    if (injuries.length > 0) {
      injuryData[s] = injuries;
    }
  }

  if (Object.keys(injuryData).length === 0) {
    const fileData = loadInjuryDataFromFile();
    Object.assign(injuryData, fileData);
  }

  cachedInjuries = injuryData;
  lastLoadTime = now;
  return injuryData;
}

async function fetchFromRotowireWithRetry(sport: string): Promise<InjuryReport[]> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const sportKey = mapSportToRotowire(sport);
      if (!sportKey) return [];

      const url = `${ROTOWIRE_API_URL}/injuries/${sportKey}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${ROTOWIRE_API_KEY}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return (data.injuries || data || []).map((inj: any) => ({
        player: inj.player_name || inj.player || 'Unknown',
        team: inj.team_name || inj.team || 'Unknown',
        status: inj.status || inj.injury_status || 'Unknown',
        injury: inj.injury_type || inj.injury || 'Unknown',
        sport,
        scraped_at: new Date().toISOString(),
        position: inj.position || ''
      }));
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (attempt === 2) {
        console.warn(`[Rotowire] Failed after 2 attempts for ${sport}: ${error.message}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  return [];
}

function loadFromFile(sport: string): InjuryReport[] {
  const fileData = loadInjuryDataFromFile();
  return fileData[sport] || [];
}

function loadInjuryDataFromFile(): InjuryData {
  const prognoDir = path.join(process.cwd(), '.progno');
  const filePath = path.join(prognoDir, 'rotowire-injuries.json');

  if (!fs.existsSync(filePath)) {
    console.warn(`[InjuryFetcher] File not found: ${filePath}`);
    return {};
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) || {};
  } catch (error) {
    console.error('[InjuryFetcher] Failed to load file:', error);
    return {};
  }
}

function mapSportToRotowire(sport: string): string {
  const map: Record<string, string> = {
    NFL: 'nfl', NBA: 'nba', MLB: 'mlb', NHL: 'nhl',
    NCAAF: 'ncaaf', NCAAB: 'ncaab'
  };
  return map[sport.toUpperCase()] || sport.toLowerCase();
}

function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)/i, '');
}

export async function calculateInjuryImpact(sport: string, teamName: string): Promise<number> {
  const injuries = await getTeamInjuries(sport, teamName);
  if (injuries.length === 0) return 0;

  let impact = 0;
  const weights: Record<string, number> = {
    'out': 1.0, 'doubtful': 0.75, 'questionable': 0.5, 'probable': 0.25,
    'ir': 0.9, 'pup': 0.8
  };

  for (const inj of injuries) {
    const status = inj.status.toLowerCase();
    let weight = 0.4;
    for (const [key, val] of Object.entries(weights)) {
      if (status.includes(key)) {
        weight = val;
        break;
      }
    }
    impact += weight;
  }

  const maxInj = sport === 'NFL' ? 5 : 3;
  return Math.min(impact / maxInj, 1.0);
}

export async function refreshInjuryCache(): Promise<void> {
  cachedInjuries = null;
  lastLoadTime = 0;
  await loadInjuryData();
}