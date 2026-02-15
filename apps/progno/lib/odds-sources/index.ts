/**
 * Plugin-based Odds Source System
 * Prioritizes odds sites over sports APIs
 * Easy to add new sources without modifying core code
 */

export interface OddsData {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  venue?: string;
  odds: {
    moneyline: { home: number | null; away: number | null };
    spread: { home: number | null; away: number | null; line?: number | null };
    total: { line: number | null; over: number | null; under: number | null };
  };
  source: string;
  lastUpdated: string;
}

export interface OddsSourcePlugin {
  name: string;
  priority: number; // Lower = higher priority (1 = first)
  supportedSports: string[]; // ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'nascar', 'college-baseball']
  fetchOdds: (sport: string, date?: string) => Promise<OddsData[]>;
}

// Global plugin registry
const registeredPlugins: OddsSourcePlugin[] = [];

/**
 * Register a new odds source plugin
 * Usage: registerOddsSource(myDraftKingsPlugin)
 */
export function registerOddsSource(plugin: OddsSourcePlugin): void {
  registeredPlugins.push(plugin);
  // Sort by priority
  registeredPlugins.sort((a, b) => a.priority - b.priority);
  console.log(`[OddsSourceRegistry] Registered: ${plugin.name} (priority: ${plugin.priority})`);
}

/**
 * Get all registered plugins for a sport
 */
export function getPluginsForSport(sport: string): OddsSourcePlugin[] {
  return registeredPlugins.filter(p => 
    p.supportedSports.includes(sport.toLowerCase()) || 
    p.supportedSports.includes('all')
  );
}

/**
 * Fetch odds from all registered sources in priority order
 * Returns first successful result
 */
export async function fetchOddsFromPlugins(
  sport: string, 
  date?: string
): Promise<{ odds: OddsData[]; source: string } | null> {
  const plugins = getPluginsForSport(sport);
  
  if (plugins.length === 0) {
    console.log(`[OddsSourceRegistry] No plugins registered for ${sport}`);
    return null;
  }

  console.log(`[OddsSourceRegistry] Trying ${plugins.length} plugins for ${sport}...`);

  for (const plugin of plugins) {
    try {
      console.log(`[OddsSourceRegistry] Trying ${plugin.name}...`);
      const odds = await plugin.fetchOdds(sport, date);
      
      if (odds.length > 0) {
        console.log(`[OddsSourceRegistry] ✓ ${plugin.name} returned ${odds.length} games`);
        return { odds, source: plugin.name };
      }
    } catch (error) {
      console.warn(`[OddsSourceRegistry] ✗ ${plugin.name} failed:`, error);
    }
  }

  console.log(`[OddsSourceRegistry] All plugins failed for ${sport}`);
  return null;
}

/**
 * List all registered plugins (for debugging)
 */
export function listRegisteredPlugins(): void {
  console.log('[OddsSourceRegistry] Registered plugins:');
  registeredPlugins.forEach(p => {
    console.log(`  - ${p.name} (priority: ${p.priority}, sports: ${p.supportedSports.join(', ')})`);
  });
}
