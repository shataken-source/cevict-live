import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EspnOddsService } from '@/app/lib/espn-odds-service';
import { TierAssignmentService } from '@/app/lib/tier-assignment-service';
import { MasterIntegrationService } from '@/app/lib/master-integration-service';
import { ElitePicksEnhancer } from '@/app/lib/elite-picks-enhancer';
import { EVCalculator } from '@/app/lib/ev-calculator';
import { AlertSystem } from '@/app/lib/alert-system';

const masterService = new MasterIntegrationService(10000);
const eliteEnhancer = new ElitePicksEnhancer();
const evCalculator = new EVCalculator();
const alertSystem = new AlertSystem();

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

const fetchEspnPicks = async (date: string, sports: string[] = ['nba', 'nfl', 'nhl']) => {
  const picks: any[] = [];
  const dateObj = new Date(date);

  for (const sport of sports) {
    try {
      const oddsMap = await EspnOddsService.fetchOdds(sport, dateObj);

      for (const [gameId, odds] of oddsMap.entries()) {
        if (!odds.moneyline) continue;

        // Calculate implied probabilities
        const probHome = odds.moneyline.home > 0
          ? 100 / (odds.moneyline.home + 100)
          : Math.abs(odds.moneyline.home) / (Math.abs(odds.moneyline.home) + 100);
        const probAway = odds.moneyline.away > 0
          ? 100 / (odds.moneyline.away + 100)
          : Math.abs(odds.moneyline.away) / (Math.abs(odds.moneyline.away) + 100);

        const confidence = Math.max(probHome, probAway) * 100;

        if (confidence < 60) continue;

        picks.push({
          id: `espn-${gameId}`,
          sport: sport.toUpperCase(),
          home_team: 'Home',
          away_team: 'Away',
          pick: probHome > probAway ? 'Home' : 'Away',
          confidence,
          pick_type: 'moneyline',
          game_time: dateObj.toISOString(),
          created_at: new Date().toISOString(),
          source: 'espn',
          odds: odds.moneyline,
        });
      }
    } catch (e) {
      console.warn(`[ESPN] Failed to fetch ${sport}:`, e);
    }
  }

  return picks;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tier = searchParams.get('tier');
    const includeEspn = searchParams.get('espn') !== 'false';

    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    // Try database first
    const supabase = getSupabase();
    let picks: any[] = [];
    let source = 'file';

    if (supabase) {
      try {
        // Filter by created_at (when the pick was generated for that day's card),
        // NOT game_time — because evening games in US timezones have UTC game_times
        // that spill into the next calendar day, causing a mismatch.
        // Use a 36-hour window (date 00:00 UTC through date+1 12:00 UTC) to
        // capture all picks generated on `date` regardless of server timezone.
        const windowEnd = new Date(date)
        windowEnd.setDate(windowEnd.getDate() + 1)
        const windowEndStr = windowEnd.toISOString().split('T')[0] + 'T12:00:00'

        const { data, error } = await supabase
          .from('picks')
          .select('*')
          .gte('created_at', `${date}T00:00:00`)
          .lt('created_at', windowEndStr)
          .order('confidence', { ascending: false });

        if (!error && data && data.length > 0) {
          picks = data;
          source = 'database';
        }
      } catch (e) {
        console.warn('[Picks] Database fetch failed:', e);
      }
    }

    // Try file fallback
    if (picks.length === 0) {
      try {
        const predictionsPath = join(process.cwd(), 'predictions-' + date + '.json');
        const data = JSON.parse(readFileSync(predictionsPath, 'utf-8'));
        picks = data.picks || data;
        source = 'file';
      } catch (error) {
        // Try early predictions
        try {
          const earlyPath = join(process.cwd(), 'predictions-early-' + date + '.json');
          const data = JSON.parse(readFileSync(earlyPath, 'utf-8'));
          picks = data.picks || data;
          source = 'early-file';
        } catch {
          // Try ESPN fallback
          if (includeEspn) {
            try {
              picks = await fetchEspnPicks(date);
              source = 'espn';
            } catch (e) {
              console.warn('[Picks] ESPN fallback failed:', e);
            }
          }
        }
      }
    }

    // Assign tiers
    if (picks.length > 0 && TierAssignmentService) {
      picks = TierAssignmentService.assignTiers(picks.map((p: any) => ({
        ...p,
        confidence: p.confidence || 65,
        homeTeam: p.homeTeam || p.home_team,
        isHomePick: p.isHomePick ?? p.is_home_pick ?? (p.pick === (p.homeTeam || p.home_team)),
        createdAt: p.created_at || new Date().toISOString(),
      })));

      // Filter by tier if requested
      if (tier) {
        picks = TierAssignmentService.filterByTier(picks, tier as any);
      }
    }

    return NextResponse.json({
      success: true,
      date,
      picks,
      count: picks.length,
      source,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Picks API error:', error);
    return NextResponse.json(
      { error: 'Failed to load picks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
