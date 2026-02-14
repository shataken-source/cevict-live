import { NextRequest, NextResponse } from 'next/server';
import {
  saveScenario,
  getScenarios,
} from '@/app/lib/solar-core/supabaseService';

/**
 * GET /api/scenarios?siteId=...
 * Fetch all scenarios for a site
 */
export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    const userId = request.nextUrl.searchParams.get('userId');

    if (!siteId || !userId) {
      return NextResponse.json(
        { error: 'Missing siteId or userId' },
        { status: 400 }
      );
    }

    const scenarios = await getScenarios(userId, siteId);
    return NextResponse.json(scenarios);
  } catch (err: any) {
    console.error('Failed to fetch scenarios:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scenarios
 * Create a new scenario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      siteId,
      name,
      description,
      baseConfig,
      proposedConfig,
      results,
    } = body;

    if (!userId || !siteId || !name || !baseConfig || !proposedConfig || !results) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const scenarioId = await saveScenario({
      userId,
      siteId,
      name,
      description,
      baseConfig,
      proposedConfig,
      results,
    });

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Failed to save scenario' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: scenarioId,
        message: 'Scenario saved successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Failed to create scenario:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
