/**
 * Network Influence Graph (NIG) API Endpoints
 * POST /api/nig/calculate - Calculate NIG for a team
 */

import { NextRequest, NextResponse } from 'next/server';
import { NetworkGraphBuilder } from '../../lib/nig/graph';
import { CohesionCalculator } from '../../lib/nig/cohesion-calculator';

/**
 * POST /api/nig/calculate
 * Calculate Network Influence Graph
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, gameId, players, relationships } = body;

    if (!teamId || !gameId || !players || !relationships) {
      return NextResponse.json(
        { success: false, error: 'teamId, gameId, players, and relationships required' },
        { status: 400 }
      );
    }

    // Build graph
    const graphBuilder = new NetworkGraphBuilder();
    const graph = graphBuilder.buildGraph(teamId, players, relationships);

    // Calculate NIG
    const calculator = new CohesionCalculator();
    const result = await calculator.calculate(teamId, gameId, graph);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[NIG API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}

