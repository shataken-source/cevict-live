import { getSmsService } from '@/lib/sms';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Generate and send daily summary image of free/pro/elite picks
 * Creates a text-based summary that can be sent via SMS or MMS
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get today's picks
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { success: false, error: 'NEXT_PUBLIC_SITE_URL not configured' },
        { status: 500 }
      );
    }

    const picksResponse = await fetch(`${siteUrl.replace(/\/+$/, '')}/api/picks/today`, {
      cache: 'no-store',
    });

    if (!picksResponse.ok) {
      throw new Error('Failed to fetch picks');
    }

    const picksData = await picksResponse.json();
    const { free = [], pro = [], elite = [] } = picksData;

    // Build comprehensive summary message
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let message = `📊 DAILY PICKS SUMMARY\n`;
    message += `${today}\n`;
    message += `${'='.repeat(30)}\n\n`;

    // FREE PICKS
    message += `🆓 FREE PICKS (${free.length})\n`;
    message += `${'-'.repeat(30)}\n`;
    if (free.length > 0) {
      free.forEach((pick: any, idx: number) => {
        message += `${idx + 1}. ${pick.game || 'TBD'}\n`;
        message += `   Pick: ${pick.pick}\n`;
        message += `   Confidence: ${pick.confidencePct}%\n`;
        message += `   Edge: ${pick.edgePct > 0 ? '+' : ''}${pick.edgePct}%\n`;
        if (pick.kickoff) {
          const time = new Date(pick.kickoff).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          message += `   Time: ${time}\n`;
        }
        message += `\n`;
      });
    } else {
      message += `No free picks today\n\n`;
    }

    // PRO PICKS
    message += `⭐ PRO PICKS (${pro.length})\n`;
    message += `${'-'.repeat(30)}\n`;
    if (pro.length > 0) {
      pro.forEach((pick: any, idx: number) => {
        message += `${idx + 1}. ${pick.game || 'TBD'}\n`;
        message += `   Pick: ${pick.pick}\n`;
        message += `   Confidence: ${pick.confidencePct}%\n`;
        message += `   Edge: ${pick.edgePct > 0 ? '+' : ''}${pick.edgePct}%\n`;
        if (pick.kickoff) {
          const time = new Date(pick.kickoff).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          message += `   Time: ${time}\n`;
        }
        message += `\n`;
      });
    } else {
      message += `No pro picks today\n\n`;
    }

    // ELITE PICKS
    message += `👑 ELITE PICKS (${elite.length})\n`;
    message += `${'-'.repeat(30)}\n`;
    if (elite.length > 0) {
      elite.forEach((pick: any, idx: number) => {
        message += `${idx + 1}. ${pick.game || 'TBD'}\n`;
        message += `   Pick: ${pick.pick}\n`;
        message += `   Confidence: ${pick.confidencePct}%\n`;
        message += `   Edge: ${pick.edgePct > 0 ? '+' : ''}${pick.edgePct}%\n`;
        if (pick.kickoff) {
          const time = new Date(pick.kickoff).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          message += `   Time: ${time}\n`;
        }
        message += `\n`;
      });
    } else {
      message += `No elite picks today\n\n`;
    }

    message += `${'='.repeat(30)}\n`;
    message += `🔗 View all: ${siteUrl}/picks\n`;
    message += `📱 Total: ${free.length + pro.length + elite.length} picks`;

    // Send SMS
    const result = await getSmsService().sendSMS(phoneNumber, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Daily summary sent successfully',
        summary: {
          free: free.length,
          pro: pro.length,
          elite: elite.length,
          total: free.length + pro.length + elite.length,
        },
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
    console.error('Error sending daily summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send daily summary',
      },
      { status: 500 }
    );
  }
}


