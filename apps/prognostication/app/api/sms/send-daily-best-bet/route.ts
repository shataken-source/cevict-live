import { getSmsService } from '@/lib/sms';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const prognoBaseUrl = process.env.PROGNO_BASE_URL;

interface EnginePick {
  gameId: string;
  game: string;
  sport: string;
  pick: string;
  confidencePct: number;
  edgePct: number;
  kickoff: string | null;
}

/**
 * Find the best bet that's NOT already allocated to free/pro/elite tiers
 * This is the exclusive daily best bet for SMS subscribers
 */
async function findBestExclusiveBet(): Promise<EnginePick | null> {
  if (!prognoBaseUrl) {
    console.error('PROGNO_BASE_URL not configured');
    return null;
  }

  try {
    // Get all picks from Progno using new API v2.0
    const resp = await fetch(
      `${prognoBaseUrl.replace(/\/+$/, '')}/api/progno/v2?action=predictions&limit=100`,
      { cache: 'no-store' }
    );

    if (!resp.ok) {
      console.error('Failed to fetch picks from Progno v2 API');
      return null;
    }

    const json = await resp.json();
    if (!json?.success || !Array.isArray(json.data) || json.data.length === 0) {
      console.error('No picks available from Progno v2 API');
      return null;
    }

    // Transform v2 API response to EnginePick format
    const allPicks: EnginePick[] = json.data.map((pred: any): EnginePick => ({
      gameId: pred.gameId || pred.id,
      game: `${pred.awayTeam} @ ${pred.homeTeam}`,
      sport: pred.sport || 'NFL',
      pick: pred.predictedWinner === 'home' ? pred.homeTeam : pred.awayTeam,
      confidencePct: pred.confidenceScore || Math.round(pred.winProbability * 100),
      edgePct: pred.spread?.edge ? Math.round(pred.spread.edge * 100) : 0,
      kickoff: pred.createdAt || null,
    }));

    // Get picks that are already allocated to tiers (from today's picks API)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      console.error('NEXT_PUBLIC_SITE_URL not configured');
      return null;
    }

    const todayPicksResp = await fetch(
      `${siteUrl.replace(/\/+$/, '')}/api/picks/today`,
      { cache: 'no-store' }
    );

    let allocatedGameIds = new Set<string>();
    if (todayPicksResp.ok) {
      const todayPicks = await todayPicksResp.json();
      // Collect all game IDs from free, pro, and elite tiers
      if (todayPicks.free) {
        todayPicks.free.forEach((p: EnginePick) => allocatedGameIds.add(p.gameId));
      }
      if (todayPicks.pro) {
        todayPicks.pro.forEach((p: EnginePick) => allocatedGameIds.add(p.gameId));
      }
      if (todayPicks.elite) {
        todayPicks.elite.forEach((p: EnginePick) => allocatedGameIds.add(p.gameId));
      }
    }

    // Filter out picks that are already allocated
    const exclusivePicks = allPicks.filter(p => !allocatedGameIds.has(p.gameId));

    if (exclusivePicks.length === 0) {
      console.warn('No exclusive picks available (all picks already allocated)');
      return null;
    }

    // Sort by quality score (edge * 2.5 + confidence) and pick the best one
    const sorted = [...exclusivePicks].sort((a, b) => {
      const scoreA = (a.edgePct * 2.5) + a.confidencePct;
      const scoreB = (b.edgePct * 2.5) + b.confidencePct;
      return scoreB - scoreA;
    });

    return sorted[0];
  } catch (error: any) {
    console.error('Error finding best exclusive bet:', error);
    return null;
  }
}

/**
 * Send daily best bet to all free SMS subscribers
 * This endpoint should be called daily via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add admin password check for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_PASSWORD || process.env.PROGNOSTICATION_ADMIN_PASSWORD;

    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active free SMS subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from('sms_subscriptions')
      .select('phone_number')
      .eq('tier', 'free')
      .eq('active', true);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No free SMS subscribers found',
        sent: 0,
      });
    }

    // Find the best exclusive bet
    const bestBet = await findBestExclusiveBet();

    if (!bestBet) {
      return NextResponse.json({
        success: false,
        error: 'No exclusive best bet available',
        sent: 0,
      });
    }

    // Format the SMS message
    const gameDate = bestBet.kickoff
      ? new Date(bestBet.kickoff).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'Today';

    const message = `🏆 FREE DAILY BEST BET\n\n${bestBet.game}\n\nPick: ${bestBet.pick}\nConfidence: ${bestBet.confidencePct}%\nEdge: ${bestBet.edgePct > 0 ? '+' : ''}${bestBet.edgePct}%\n\n${gameDate}\n\nThis exclusive pick is not available on the website!\n\nView more: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://prognostication.com'}`;

    // Send SMS to all subscribers
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        const result = await getSmsService().sendSMS(subscriber.phone_number, message);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${subscriber.phone_number}: ${result.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`${subscriber.phone_number}: ${err.message || 'Unknown error'}`);
      }
    }

    // Log the daily best bet sent
    const { error: logError } = await supabase
      .from('sms_sent_logs')
      .insert({
        tier: 'free',
        message_type: 'daily_best_bet',
        pick_game_id: bestBet.gameId,
        pick_game: bestBet.game,
        pick: bestBet.pick,
        sent_count: successCount,
        error_count: errorCount,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging SMS send:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Daily best bet sent to ${successCount} subscribers`,
      sent: successCount,
      errors: errorCount,
      bestBet: {
        game: bestBet.game,
        pick: bestBet.pick,
        confidence: bestBet.confidencePct,
        edge: bestBet.edgePct,
      },
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error sending daily best bet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send daily best bet',
      },
      { status: 500 }
    );
  }
}

