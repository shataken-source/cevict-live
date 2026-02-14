import { getSmsService } from '@/lib/sms';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Send SMS notification when Progno makes a pick
 * This endpoint should be called whenever a new pick is created
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameId,
      game,
      homeTeam,
      awayTeam,
      pick,
      confidence,
      edge,
      odds,
      spread,
      total,
      gameTime,
      gameDate,
      sport,
      league,
      recommendedWager,
      betReasoning,
      predictedScore,
      phoneNumber, // Admin phone number to notify
    } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Format game time
    const formattedTime = gameTime
      ? new Date(gameTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
      : gameDate || 'TBD';

    // Sport emoji mapping
    const sportEmoji: Record<string, string> = {
      'NFL': '🏈',
      'NCAAF': '🏈',
      'NBA': '🏀',
      'NCAAB': '🏀',
      'NHL': '🏒',
      'MLB': '⚾',
      'Soccer': '⚽',
      'MLS': '⚽'
    };
    const displaySport = sport || league || 'NFL';
    const emoji = sportEmoji[displaySport] || '🏈';

    // Build comprehensive SMS message
    let message = `🎯 NEW PROGNO PICK\n\n`;
    message += `📊 ${game || `${awayTeam} @ ${homeTeam}`}\n`;
    message += `${emoji} ${displaySport}\n\n`;

    message += `✅ PICK: ${pick}\n`;
    message += `📈 Confidence: ${confidence}%\n`;
    message += `💰 Edge: ${edge > 0 ? '+' : ''}${edge}%\n\n`;

    // Add odds/line information
    if (odds) {
      message += `📉 Odds:\n`;
      if (odds.home && odds.away) {
        message += `   Home: ${odds.home > 0 ? '+' : ''}${odds.home}\n`;
        message += `   Away: ${odds.away > 0 ? '+' : ''}${odds.away}\n`;
      }
    }

    if (spread !== undefined && spread !== null) {
      message += `📊 Spread: ${spread > 0 ? '+' : ''}${spread}\n`;
    }

    if (total !== undefined && total !== null) {
      message += `📊 Total: ${total}\n`;
    }

    message += `\n⏰ Game Time: ${formattedTime}\n`;

    if (predictedScore) {
      message += `🎯 Predicted Score: ${homeTeam} ${predictedScore.home} - ${predictedScore.away} ${awayTeam}\n`;
    }

    if (recommendedWager) {
      message += `💵 Recommended Wager: $${recommendedWager}\n`;
    }

    if (betReasoning) {
      message += `\n💡 Reasoning: ${betReasoning.substring(0, 100)}${betReasoning.length > 100 ? '...' : ''}\n`;
    }

    message += `\n🔗 View: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://prognostication.com'}`;

    // Send SMS
    const result = await getSmsService().sendSMS(phoneNumber, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMS notification sent successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send SMS',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error sending pick notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send SMS notification',
      },
      { status: 500 }
    );
  }
}



