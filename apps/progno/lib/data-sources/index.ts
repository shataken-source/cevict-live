/**
 * Historical Results Data Loader
 * Loads and provides access to 2024 game results for fine-tuning
 * Hardened with safe fs handling, caching, validation, and client-side guard
 */

import fs from 'fs';
import path from 'path';

export interface GameResult {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number;
  awayScore: number;
  spread?: number;
  total?: number;
  homeCovered?: boolean;
  overHit?: boolean;
  winner: string;
}

interface ResultsData {
  [sport: string]: GameResult[];
}

let cachedResults: ResultsData | null = null;
let lastLoadTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Safe way to access Node.js modules (prevents client-side bundling issues)
 */
function getNodeModules() {
  if (typeof window !== 'undefined') {
    return { fs: null, path: null };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeFs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodePath = require('path');
    return { fs: nodeFs, path: nodePath };
  } catch (e) {
    return { fs: null, path: null };
  }
}

/**
 * Load all historical results (server-side only)
 */
export function loadHistoricalResults(): ResultsData {
  if (cachedResults && (Date.now() - lastLoadTime < CACHE_DURATION)) {
    return cachedResults;
  }

  if (typeof window !== 'undefined') {
    // Client-side guard
    return {};
  }

  const modules = getNodeModules();
  if (!modules.fs || !modules.path) {
    console.warn('[HistoricalResults] fs/path not available (client-side)');
    return {};
  }

  const { fs, path } = modules;

  try {
    const prognoDir = path.join(process.cwd(), '.progno');
    const filePath = path.join(prognoDir, '2024-results-all-sports.json');

    if (!fs.existsSync(filePath)) {
      console.warn(`[HistoricalResults] File not found: ${filePath}`);
      cachedResults = {};
      lastLoadTime = Date.now();
      return {};
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawData);

    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('[HistoricalResults] Invalid JSON structure');
      cachedResults = {};
      return {};
    }

    cachedResults = parsed;
    lastLoadTime = Date.now();
    return cachedResults;
  } catch (error: any) {
    console.error('[HistoricalResults] Failed to load file:', error.message);
    cachedResults = {};
    return {};
  }
}

/**
 * Get results for a specific sport
 */
export function getSportResults(sport: string): GameResult[] {
  if (!sport) return [];
  const data = loadHistoricalResults();
  return data[sport.toUpperCase()] || data[sport] || [];
}

/**
 * Get results for a specific team (home or away)
 */
export function getTeamResults(sport: string, teamName: string): GameResult[] {
  if (!sport || !teamName) return [];

  const results = getSportResults(sport);
  const normalizedTeam = normalizeTeamName(teamName);

  return results.filter(result => {
    const normalizedHome = normalizeTeamName(result.homeTeam);
    const normalizedAway = normalizeTeamName(result.awayTeam);
    return normalizedHome === normalizedTeam || normalizedAway === normalizedTeam;
  });
}

/**
 * Get head-to-head results between two teams
 */
export function getH2HResults(sport: string, team1: string, team2: string): GameResult[] {
  if (!sport || !team1 || !team2) return [];

  const results = getSportResults(sport);
  const norm1 = normalizeTeamName(team1);
  const norm2 = normalizeTeamName(team2);

  return results.filter(result => {
    const normHome = normalizeTeamName(result.homeTeam);
    const normAway = normalizeTeamName(result.awayTeam);
    return (normHome === norm1 && normAway === norm2) ||
           (normHome === norm2 && normAway === norm1);
  });
}

/**
 * Get recent performance for a team (last N games)
 */
export function getRecentTeamPerformance(
  sport: string,
  teamName: string,
  lastNGames = 5
): {
  wins: number;
  losses: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  avgMargin: number;
} {
  const teamResults = getTeamResults(sport, teamName);
  const recent = teamResults
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, lastNGames);

  if (recent.length === 0) {
    return { wins: 0, losses: 0, avgPointsFor: 0, avgPointsAgainst: 0, avgMargin: 0 };
  }

  let wins = 0;
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;

  for (const r of recent) {
    const isHome = normalizeTeamName(r.homeTeam) === normalizeTeamName(teamName);
    const pointsFor = isHome ? r.homeScore : r.awayScore;
    const pointsAgainst = isHome ? r.awayScore : r.homeScore;

    if (r.winner === teamName) wins++;
    totalPointsFor += pointsFor;
    totalPointsAgainst += pointsAgainst;
  }

  const avgPointsFor = totalPointsFor / recent.length;
  const avgPointsAgainst = totalPointsAgainst / recent.length;
  const avgMargin = avgPointsFor - avgPointsAgainst;

  return {
    wins,
    losses: recent.length - wins,
    avgPointsFor: Math.round(avgPointsFor * 10) / 10,
    avgPointsAgainst: Math.round(avgPointsAgainst * 10) / 10,
    avgMargin: Math.round(avgMargin * 10) / 10
  };
}

function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)/i, '');
}

export function refreshResultsCache(): void {
  cachedResults = null;
  lastLoadTime = 0;
  loadHistoricalResults();
}