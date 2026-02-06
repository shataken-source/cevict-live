import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Test a cron job endpoint by making a request to it
 */
export async function POST(request: NextRequest) {
  try {
    const { project, path } = await request.json();

    if (!project || !path) {
      return NextResponse.json(
        { success: false, error: 'Project and path are required' },
        { status: 400 }
      );
    }

    const baseUrls: Record<string, string> = {
      progno: process.env.PROGNO_BASE_URL || 'https://progno.vercel.app',
      popthepopcorn: process.env.POPTHEPOPCORN_BASE_URL || 'https://popthepopcorn.vercel.app',
      petreunion: process.env.PETREUNION_BASE_URL || 'https://petreunion.org',
      smokersrights: process.env.SMOKERSRIGHTS_BASE_URL || 'https://smokersrights.com',
      cevict: process.env.CEVICT_BASE_URL || 'https://cevict.ai',
      prognostication: process.env.PROGNOSTICATION_BASE_URL || 'https://prognostication.com',
    };

    const baseUrl = baseUrls[project] || `https://${project}.vercel.app`;
    const fullUrl = `${baseUrl}${path}`;

    const startTime = Date.now();
    let response: Response;
    let responseData: any;

    try {
      // Try POST first (most cron endpoints use POST)
      response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Launchpad-Cron-Tester/1.0',
          'X-Test-Request': 'true', // Flag to indicate this is a test
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const latency = Date.now() - startTime;

      try {
        responseData = await response.json();
      } catch {
        responseData = { message: await response.text() };
      }

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        latency,
        data: responseData,
        url: fullUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError: any) {
      return NextResponse.json(
        {
          success: false,
          error: fetchError?.message || 'Failed to test endpoint',
          url: fullUrl,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Invalid request',
      },
      { status: 400 }
    );
  }
}

