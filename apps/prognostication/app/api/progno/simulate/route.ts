import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SimulationRequest {
  weights: {
    weather: number;
    injuries: number;
    turnoverPercentage: number;
    homeFieldAdvantage: number;
    recentForm: number;
    h2hHistory: number;
    restDays: number;
    lineMovement: number;
  };
  iterations: number;
  gameId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    const { weights, iterations, gameId } = body;

    // Forward to Progno API
    const prognoUrl = process.env.PROGNO_BASE_URL || process.env.PROGNO_API_URL;
    if (!prognoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Progno API not configured',
          details: 'PROGNO_BASE_URL or PROGNO_API_URL environment variable is missing',
          solution: 'Add PROGNO_BASE_URL or PROGNO_API_URL to your environment variables'
        },
        { status: 500 }
      );
    }

    let response;
    try {
      // Use new API v2.0 endpoint
      response = await fetch(`${prognoUrl.replace(/\/+$/, '')}/api/progno/v2?action=simulate&gameId=${gameId}&iterations=${iterations}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights, iterations, gameId }),
        cache: 'no-store',
      });
    } catch (fetchError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Progno API',
          details: fetchError.message || 'Network error',
          prognoUrl: prognoUrl.replace(/\/+$/, ''),
          solution: 'Check that PROGNO_BASE_URL is correct and the Progno service is running'
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          {
            success: false,
            error: errorData.error || 'Progno simulation failed',
            details: errorData.details || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status
          },
          { status: response.status || 500 }
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Progno simulation failed',
            details: `HTTP ${response.status}: ${response.statusText}`,
            responseText: errorText?.substring(0, 200)
          },
          { status: response.status || 500 }
        );
      }
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse response from Progno',
          details: parseError.message || 'Invalid JSON response'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Simulation failed',
        details: error?.stack || 'Unknown error occurred',
        solution: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}

