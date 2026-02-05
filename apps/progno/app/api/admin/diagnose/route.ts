import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const prognoDir = path.join(process.cwd(), '.progno');
    const picksFile = path.join(prognoDir, 'picks-all-leagues-latest.json');

    const day = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[day];

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      day: {
        number: day,
        name: dayName,
        hasCronJob: [1, 2, 4, 5].includes(day), // Mon, Tue, Thu, Fri
      },
      picksFile: {
        exists: fs.existsSync(picksFile),
        path: picksFile,
      },
      apiKey: {
        hasOddsApiKey: !!process.env.ODDS_API_KEY,
        hasPublicOddsApiKey: !!process.env.NEXT_PUBLIC_ODDS_API_KEY,
        hasAnyKey: !!(process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY),
      },
    };

    if (fs.existsSync(picksFile)) {
      try {
        const stats = fs.statSync(picksFile);
        const content = fs.readFileSync(picksFile, 'utf8');
        const parsed = JSON.parse(content);
        const pickCount = Array.isArray(parsed) ? parsed.length : 0;

        diagnostics.picksFile.size = stats.size;
        diagnostics.picksFile.lastModified = stats.mtime.toISOString();
        diagnostics.picksFile.pickCount = pickCount;
        diagnostics.picksFile.isValid = pickCount > 0;

        // Check if picks are recent (within last 24 hours)
        const hoursSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        diagnostics.picksFile.hoursSinceModified = Math.round(hoursSinceModified * 10) / 10;
        diagnostics.picksFile.isRecent = hoursSinceModified < 24;
      } catch (err: any) {
        diagnostics.picksFile.error = err.message;
        diagnostics.picksFile.isValid = false;
      }
    }

    // Check for other pick files
    const otherFiles: string[] = [];
    if (fs.existsSync(prognoDir)) {
      const files = fs.readdirSync(prognoDir);
      otherFiles.push(...files.filter(f => f.includes('picks') && f.includes('latest')));
    }
    diagnostics.otherPickFiles = otherFiles;

    // Recommendations
    const recommendations: string[] = [];

    if (!diagnostics.day.hasCronJob) {
      recommendations.push(`No cron job scheduled for ${dayName}. Use /api/admin/all-leagues to generate picks manually.`);
    }

    if (!diagnostics.picksFile.exists) {
      recommendations.push('Picks file does not exist. Generate picks using /api/admin/all-leagues endpoint.');
    } else if (!diagnostics.picksFile.isValid) {
      recommendations.push('Picks file exists but is empty or invalid. Regenerate using /api/admin/all-leagues.');
    } else if (!diagnostics.picksFile.isRecent) {
      recommendations.push(`Picks file is ${diagnostics.picksFile.hoursSinceModified} hours old. Consider regenerating.`);
    }

    if (!diagnostics.apiKey.hasAnyKey) {
      recommendations.push('No API key configured. Set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY in environment variables.');
    }

    diagnostics.recommendations = recommendations;
    diagnostics.status = recommendations.length === 0 ? 'healthy' : 'needs_attention';

    return NextResponse.json({
      success: true,
      ...diagnostics,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Diagnostic failed',
      },
      { status: 500 }
    );
  }
}

