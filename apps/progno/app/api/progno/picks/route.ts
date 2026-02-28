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

const ESPN_SPORT_PATH: Record<string, string> = {
  nba: 'basketball/nba', nfl: 'football/nfl', nhl: 'hockey/nhl',
  mlb: 'baseball/mlb', ncaab: 'basketball/mens-college-basketball',
};

const fetchEspnPicks = async (date: string, sports: string[] = ['nba', 'nfl', 'nhl']) => {
  const picks: any[] = [];
  const dateObj = new Date(date);
  const dateStr = date.replace(/-/g, '');

  for (const sport of sports) {
    try {
      const espnPath = ESPN_SPORT_PATH[sport];
      if (!espnPath) continue;

      // Fetch scoreboard with odds directly from ESPN
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard?dates=${dateStr}`);
      if (!res.ok) continue;
      const data = await res.json();

      for (const event of (data.events || [])) {
        const comp = event.competitions?.[0];
        if (!comp) continue;
        const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
        if (!homeComp || !awayComp) continue;

        const homeName = homeComp.team?.displayName || homeComp.team?.name || 'Home';
        const awayName = awayComp.team?.displayName || awayComp.team?.name || 'Away';

        // Get odds from competition
        const odds = comp.odds?.[0];
        if (!odds?.homeTeamOdds?.moneyLine || !odds?.awayTeamOdds?.moneyLine) continue;

        const homeML = odds.homeTeamOdds.moneyLine;
        const awayML = odds.awayTeamOdds.moneyLine;

        const rawHome = homeML > 0 ? 100 / (homeML + 100) : Math.abs(homeML) / (Math.abs(homeML) + 100);
        const rawAway = awayML > 0 ? 100 / (awayML + 100) : Math.abs(awayML) / (Math.abs(awayML) + 100);
        // Remove vig: normalize so fair probabilities sum to 100%
        const vigTotal = rawHome + rawAway;
        const probHome = vigTotal > 0 ? rawHome / vigTotal : 0.5;
        const probAway = vigTotal > 0 ? rawAway / vigTotal : 0.5;
        const confidence = Math.max(probHome, probAway) * 100;

        if (confidence < 60) continue;

        const pickTeam = probHome > probAway ? homeName : awayName;

        picks.push({
          id: `espn-${event.id}`,
          sport: sport.toUpperCase(),
          home_team: homeName,
          away_team: awayName,
          pick: pickTeam,
          confidence,
          pick_type: 'moneyline',
          game_time: event.date || dateObj.toISOString(),
          created_at: new Date().toISOString(),
          source: 'espn',
          odds: { home: homeML, away: awayML },
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
        // Use game_date (the date the pick is FOR) rather than created_at
        // (when the row was written). This ensures re-runs and retries
        // always return the full set of picks for the requested date.
        const { data, error } = await supabase
          .from('picks')
          .select('*')
          .eq('game_date', date)
          .order('confidence', { ascending: false });

        if (!error && data && data.length > 0) {
          picks = data;
          source = 'database';
        }
      } catch (e) {
        console.warn('[Picks] Database fetch failed:', e);
      }
    }

    // Try Supabase Storage fallback
    if (picks.length === 0 && supabase) {
      try {
        const fileName = `predictions-${date}.json`;
        const { data: fileData, error: storageError } = await supabase.storage
          .from('predictions')
          .download(fileName);

        if (!storageError && fileData) {
          const text = await fileData.text();
          const parsed = JSON.parse(text);
          picks = parsed.picks || parsed;
          source = 'storage';
        }
      } catch (error) {
        // Try early predictions from storage
        try {
          const earlyFileName = `predictions-early-${date}.json`;
          const { data: earlyData, error: earlyError } = await supabase.storage
            .from('predictions')
            .download(earlyFileName);

          if (!earlyError && earlyData) {
            const text = await earlyData.text();
            const parsed = JSON.parse(text);
            picks = parsed.picks || parsed;
            source = 'storage-early';
          }
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
