/**
 * Injury Sync Service
 * Fetches and caches injury data from OddsJam API
 * Provides team injury impact scoring for the Claude Effect engine
 */

import { fetchOddsJamInjuries, OddsJamInjury } from '../../oddsjam-fetcher';

// Cache for injury data (refresh every hour)
let injuryCache: Map<string, { injuries: OddsJamInjury[]; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get injury impact score for a team (0-1 scale)
 * 0 = no significant injuries
 * 1 = critical injuries (multiple key players out)
 */
export async function getTeamInjuryImpact(sport: string, teamName: string): Promise<number> {
  const cacheKey = `${sport.toLowerCase()}_${teamName.toLowerCase().replace(/\s+/g, '_')}`;

  // Check cache first
  const cached = injuryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return calculateImpactScore(cached.injuries);
  }

  try {
    // Map internal sport names to OddsJam format
    const oddsjamSport = mapSportToOddsJam(sport);

    // Fetch fresh injury data
    const injuries = await fetchOddsJamInjuries(oddsjamSport);

    // Filter injuries for this specific team
    const teamInjuries = injuries.filter(injury =>
      injury.team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(injury.team.toLowerCase())
    );

    // Update cache
    injuryCache.set(cacheKey, {
      injuries: teamInjuries,
      timestamp: Date.now()
    });

    return calculateImpactScore(teamInjuries);
  } catch (error) {
    console.warn(`[InjurySync] Failed to fetch injury data for ${teamName}:`, error);
    return 0.35; // Return default chaos sensitivity on error
  }
}

/**
 * Calculate impact score from list of injuries
 */
function calculateImpactScore(injuries: OddsJamInjury[]): number {
  if (!injuries || injuries.length === 0) {
    return 0; // No injuries = no chaos
  }

  let totalImpact = 0;

  for (const injury of injuries) {
    // Weight by impact level and status
    const impactWeight = getImpactWeight(injury.impact);
    const statusMultiplier = getStatusMultiplier(injury.status);

    totalImpact += impactWeight * statusMultiplier;
  }

  // Normalize to 0-1 scale (cap at 1.0)
  return Math.min(1, totalImpact);
}

/**
 * Get weight for impact level
 */
function getImpactWeight(impact: string): number {
  switch (impact?.toLowerCase()) {
    case 'high': return 0.4;
    case 'medium': return 0.25;
    case 'low': return 0.1;
    default: return 0.15;
  }
}

/**
 * Get multiplier for injury status
 */
function getStatusMultiplier(status: string): number {
  switch (status?.toLowerCase()) {
    case 'out': return 1.0;
    case 'doubtful': return 0.8;
    case 'questionable': return 0.4;
    case 'inactive': return 0.9;
    default: return 0.5;
  }
}

/**
 * Map internal sport names to OddsJam format
 */
function mapSportToOddsJam(sport: string): string {
  const upper = sport.toUpperCase();
  if (upper.includes('NFL') || upper.includes('NCAAF')) return 'football';
  if (upper.includes('NBA') || upper.includes('NCAAB')) return 'basketball';
  if (upper.includes('NHL')) return 'hockey';
  if (upper.includes('MLB')) return 'baseball';
  return sport.toLowerCase();
}

/**
 * Clear injury cache (useful for testing or manual refresh)
 */
export function clearInjuryCache(): void {
  injuryCache.clear();
}

/**
 * Get all cached injuries for a sport
 */
export function getCachedInjuriesBySport(sport: string): OddsJamInjury[] {
  const allInjuries: OddsJamInjury[] = [];
  const prefix = `${sport.toLowerCase()}_`;

  for (const [key, value] of injuryCache.entries()) {
    if (key.startsWith(prefix)) {
      allInjuries.push(...value.injuries);
    }
  }

  return allInjuries;
}
