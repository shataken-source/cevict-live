/**
 * Polymarket Integration for Sportsbook-Terminal
 * Fetches Polymarket picks from prognostication API
 */

const PROGNO_URL =
  (typeof process !== 'undefined' && process.env?.PROGNO_URL) ||
  process.env?.PROGNOSTICATION_URL ||
  'http://localhost:3005';

export interface PolymarketPick {
  id: string;
  marketId: string;
  market: string;
  marketSlug: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  tier: 'elite' | 'pro' | 'free';
  historicalPattern?: string;
}

export interface PolymarketPicksResponse {
  success: boolean;
  elite: PolymarketPick[];
  pro: PolymarketPick[];
  free: PolymarketPick[];
  total: number;
  source: string;
  timestamp: string;
}

/**
 * Fetch Polymarket picks from prognostication API
 */
export async function fetchPolymarketPicks(): Promise<PolymarketPicksResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${PROGNO_URL}/api/polymarket/picks?tier=all&limit=20`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json() as {
        success?: boolean;
        elite?: unknown[];
        pro?: unknown[];
        free?: unknown[];
        total?: number;
        timestamp?: string;
        [key: string]: unknown;
      };
      if (data.success) {
        return {
          ...data,
          source: 'api'
        } as PolymarketPicksResponse;
      }
    }
    throw new Error(`API returned ${response.status}`);
  } catch (apiErr) {
    console.warn('[Polymarket] API fetch failed:', (apiErr as Error).message);

    return {
      success: true,
      elite: [],
      pro: [],
      free: [],
      total: 0,
      source: 'error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Import Polymarket picks to Supabase polymarket_bets table
 */
export async function importPolymarketPicksToDB(
  supabase: any
): Promise<{ imported: number; errors: string[] }> {
  const picks = await fetchPolymarketPicks();

  if (!picks.success || picks.total === 0) {
    return { imported: 0, errors: ['No picks to import'] };
  }

  const allPicks = [
    ...picks.elite.map(p => ({ ...p, tier: 'elite' as const })),
    ...picks.pro.map(p => ({ ...p, tier: 'pro' as const })),
    ...picks.free.map(p => ({ ...p, tier: 'free' as const }))
  ];

  const errors: string[] = [];
  let imported = 0;

  for (const pick of allPicks) {
    try {
      const { data: existing } = await supabase
        .from('polymarket_bets')
        .select('id')
        .eq('market_id', pick.marketId)
        .single();

      if (existing) {
        console.log(`[Polymarket Import] Skipping duplicate: ${pick.market}`);
        continue;
      }

      const { error } = await supabase.from('polymarket_bets').insert({
        market_id: pick.marketId,
        market_slug: pick.marketSlug,
        market_title: pick.market,
        category: pick.category,
        pick: pick.pick,
        probability: pick.probability,
        edge: pick.edge,
        market_price: pick.marketPrice / 100,
        expires_at: pick.expires,
        reasoning: pick.reasoning,
        confidence: pick.confidence,
        tier: pick.tier,
        status: 'open',
        source: picks.source === 'api' ? 'prognostication_api' : 'cached_file'
      });

      if (error) {
        errors.push(`${pick.market}: ${error.message}`);
        continue;
      }

      imported++;
    } catch (err: any) {
      errors.push(`${pick.market}: ${err.message}`);
    }
  }

  return { imported, errors };
}
